from dotenv import load_dotenv

load_dotenv()

import io
import os
import uuid
from datetime import datetime

import jwt
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from jwt import PyJWKClient
import re

app = FastAPI(title="InsightForge Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://insight-forge-dashboard.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
SUPABASE_JWKS_URL = f"{os.environ['SUPABASE_URL']}/auth/v1/.well-known/jwks.json"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
jwks_client = PyJWKClient(SUPABASE_JWKS_URL)


def get_company_id(authorization: str = Header(None)) -> str:
    """Verify the user's Supabase JWT and resolve their company_id via memberships table."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or invalid Authorization header"
        )

    token = authorization.split(" ", 1)[1]
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user id")

    result = (
        supabase.table("memberships")
        .select("company_id")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=403, detail="User has no company membership")

    return result.data["company_id"], user_id


@app.get("/health")
def health():
    return {"status": "ok"}


COLUMN_PATTERNS = {
    "date": r"date|dt$|_dt$|timestamp|created_at|order_date",
    "revenue": r"revenue|sales|amount|amt|price|total|income",
    "customer_id": r"customer.?id|cust.?id|client.?id|user.?id",
    "email": r"email|e.?mail",
    "product": r"product|item|sku",
    "quantity": r"quantity|qty|units|count",
    "region": r"region|state|country|location|geo",
    "category": r"category|type|segment|class",
    "status": r"status|state$",
}


def detect_column_role(col_name: str, dtype: str) -> dict:
    """Heuristic column role detection — regex on name, cross-checked with dtype where relevant."""
    name_lower = col_name.lower().strip()

    for role, pattern in COLUMN_PATTERNS.items():
        if re.search(pattern, name_lower):
            confidence = "high"
            # sanity-check against dtype for numeric-expected roles
            if role in ("revenue", "quantity") and dtype not in (
                "int64",
                "float64",
            ):
                confidence = "low"  # name matches but type doesn't — flag uncertainty
            return {"role": role, "confidence": confidence}

    return {"role": "unknown", "confidence": "none"}


def analyze_dataframe(df: pd.DataFrame) -> dict:
    """Shared analysis pipeline — column detection, duplicates, outliers, preview.
    Used by both /upload and /clean so results stay identical after cleaning."""
    columns = [
        {
            "name": col,
            "dtype": str(df[col].dtype),
            "null_count": int(df[col].isnull().sum()),
            **detect_column_role(col, str(df[col].dtype)),
        }
        for col in df.columns
    ]

    duplicate_mask = df.duplicated(keep=False)
    duplicate_count = int(df.duplicated(keep="first").sum())
    duplicate_rows_preview = [
        {k: (None if pd.isna(v) else v) for k, v in row.items()}
        for row in df[duplicate_mask].head(10).to_dict(orient="records")
    ]

    outliers_by_column = {}
    for col in df.select_dtypes(include=["float64", "int64"]).columns:
        series = df[col].dropna()
        if len(series) < 4:
            continue
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            continue
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        outlier_mask = (df[col] < lower_bound) | (df[col] > upper_bound)
        outlier_count = int(outlier_mask.sum())
        if outlier_count > 0:
            outlier_rows = [
                {k: (None if pd.isna(v) else v) for k, v in row.items()}
                for row in df[outlier_mask].head(10).to_dict(orient="records")
            ]
            outliers_by_column[col] = {
                "count": outlier_count,
                "lower_bound": round(float(lower_bound), 2),
                "upper_bound": round(float(upper_bound), 2),
                "rows": outlier_rows,
            }

    preview_df = df.head(10)
    preview = [
        {k: (None if pd.isna(v) else v) for k, v in row.items()}
        for row in preview_df.to_dict(orient="records")
    ]

    return {
        "columns": columns,
        "preview": preview,
        "duplicate_count": duplicate_count,
        "duplicate_rows_preview": duplicate_rows_preview,
        "outliers_by_column": outliers_by_column,
    }


def engineer_features(df: pd.DataFrame, columns: list[dict]) -> dict:
    """Derive common business features based on detected column roles.
    Returns summary only (not full df) — keeps payload small."""
    features_added = []

    date_col = next((c["name"] for c in columns if c["role"] == "date"), None)
    revenue_col = next((c["name"] for c in columns if c["role"] == "revenue"), None)
    customer_col = next(
        (c["name"] for c in columns if c["role"] == "customer_id"), None
    )

    if date_col:
        try:
            parsed = pd.to_datetime(df[date_col], errors="coerce")
            if parsed.notna().sum() > 0:
                df["_day"] = parsed.dt.day
                df["_month"] = parsed.dt.month
                df["_weekday"] = parsed.dt.day_name()
                features_added.append(
                    {
                        "name": "day / month / weekday",
                        "source_column": date_col,
                        "type": "date_parts",
                    }
                )
        except Exception:
            pass

    if revenue_col and pd.api.types.is_numeric_dtype(df[revenue_col]):
        df["_rolling_avg_7"] = (
            df[revenue_col].rolling(window=7, min_periods=1).mean().round(2)
        )
        features_added.append(
            {
                "name": "rolling_avg_7",
                "source_column": revenue_col,
                "type": "rolling_average",
            }
        )

    if customer_col:
        order_counts = df[customer_col].value_counts()
        top_customers = [
            {"customer_id": str(k), "order_count": int(v)}
            for k, v in order_counts.head(5).items()
        ]
        features_added.append(
            {
                "name": "order_count",
                "source_column": customer_col,
                "type": "aggregate",
                "top_5": top_customers,
            }
        )

    return {"features_added": features_added}


@app.post("/upload")
async def upload(
    file: UploadFile = File(...),
    authorization: str = Header(None),
):
    company_id, user_id = get_company_id(authorization)

    filename = file.filename or ""
    if not filename.lower().endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only CSV or Excel files supported")

    contents = await file.read()
    max_size = 20 * 1024 * 1024
    if len(contents) > max_size:
        raise HTTPException(status_code=400, detail="File exceeds 20MB limit")

    try:
        if filename.lower().endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    row_count = len(df)  # fixed — was reporting truncated preview count before

    analysis_result = analyze_dataframe(df)
    analysis_result["engineered_features"] = engineer_features(
        df, analysis_result["columns"]
    )["features_added"]
    columns = analysis_result["columns"]
    duplicate_count = analysis_result["duplicate_count"]
    duplicate_rows_preview = analysis_result["duplicate_rows_preview"]
    outliers_by_column = analysis_result["outliers_by_column"]
    preview = analysis_result["preview"]

    # Upload raw file to Supabase Storage, scoped under company_id
    dataset_id = str(uuid.uuid4())
    storage_path = f"{company_id}/{dataset_id}_{filename}"

    supabase.storage.from_("datasets").upload(
        storage_path,
        contents,
        {"content-type": file.content_type or "application/octet-stream"},
    )

    del contents, df  # free memory immediately

    # Insert metadata row
    analysis = {
        "columns": columns,
        "preview": preview,
        "duplicate_count": duplicate_count,
        "duplicate_rows_preview": duplicate_rows_preview,
        "outliers_by_column": outliers_by_column,
        "engineered_features": analysis_result["engineered_features"],
    }

    insert_result = (
        supabase.table("datasets")
        .insert(
            {
                "id": dataset_id,
                "company_id": company_id,
                "uploaded_by": user_id,
                "filename": filename,
                "row_count": row_count,
                "column_schema": columns,
                "storage_path": storage_path,
                "analysis": analysis,
                "created_at": datetime.utcnow().isoformat(),
            }
        )
        .execute()
    )

    if not insert_result.data:
        raise HTTPException(status_code=500, detail="Failed to save dataset metadata")

    return {
        "id": dataset_id,
        "filename": filename,
        "row_count": row_count,
        "columns": columns,
        "preview": preview,
        "duplicate_count": duplicate_count,
        "duplicate_rows_preview": duplicate_rows_preview,
        "outliers_by_column": outliers_by_column,
        "engineered_features": analysis_result["engineered_features"],
    }


@app.post("/datasets/{dataset_id}/clean")
async def clean_dataset(
    dataset_id: str,
    actions: list[str],
    authorization: str = Header(None),
):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("storage_path, filename")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]
    filename = result.data["filename"]

    file_bytes = supabase.storage.from_("datasets").download(storage_path)

    if filename.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    if "remove_duplicates" in actions:
        df = df.drop_duplicates(keep="first")

    if "fill_nulls" in actions:
        for col in df.columns:
            if df[col].dtype in ("float64", "int64"):
                df[col] = df[col].fillna(df[col].median())
            else:
                df[col] = df[col].fillna("Unknown")

    row_count = len(df)
    analysis = analyze_dataframe(df)
    analysis["engineered_features"] = engineer_features(df, analysis["columns"])[
        "features_added"
    ]

    # overwrite storage with cleaned file — CSV only for v1 simplicity
    cleaned_bytes = df.to_csv(index=False).encode("utf-8")
    supabase.storage.from_("datasets").remove([storage_path])
    supabase.storage.from_("datasets").upload(
        storage_path, cleaned_bytes, {"content-type": "text/csv"}
    )

    supabase.table("datasets").update(
        {
            "row_count": row_count,
            "column_schema": analysis["columns"],
            "analysis": analysis,
        }
    ).eq("id", dataset_id).eq("company_id", company_id).execute()

    del df, file_bytes, cleaned_bytes

    return {
        "id": dataset_id,
        "filename": filename,
        "row_count": row_count,
        **analysis,
    }


@app.get("/datasets")
async def list_datasets(authorization: str = Header(None)):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("id, filename, row_count, column_schema, created_at")
        .eq("company_id", company_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@app.get("/datasets/{dataset_id}")
async def get_dataset(dataset_id: str, authorization: str = Header(None)):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("id, filename, row_count, created_at, analysis")
        .eq("id", dataset_id)
        .eq(
            "company_id", company_id
        )  # ensures you can't fetch another company's dataset by guessing an id
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return result.data


@app.delete("/datasets/{dataset_id}")
async def delete_dataset(dataset_id: str, authorization: str = Header(None)):
    company_id, _ = get_company_id(authorization)

    # fetch first to get storage_path and confirm ownership
    result = (
        supabase.table("datasets")
        .select("storage_path")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]

    supabase.storage.from_("datasets").remove([storage_path])

    supabase.table("datasets").delete().eq("id", dataset_id).eq(
        "company_id", company_id
    ).execute()

    return {"status": "deleted", "id": dataset_id}

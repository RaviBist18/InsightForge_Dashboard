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

    columns = [
        {
            "name": col,
            "dtype": str(df[col].dtype),
            "null_count": int(df[col].isnull().sum()),
            **detect_column_role(col, str(df[col].dtype)),
        }
        for col in df.columns
    ]

    # Duplicate detection — exact full-row duplicates only for v1
    duplicate_mask = df.duplicated(
        keep=False
    )  # marks ALL occurrences of a dupe, not just the 2nd+
    duplicate_count = int(
        df.duplicated(keep="first").sum()
    )  # count of extra rows beyond the first occurrence
    duplicate_rows_preview = [
        {k: (None if pd.isna(v) else v) for k, v in row.items()}
        for row in df[duplicate_mask].head(10).to_dict(orient="records")
    ]

    # Outlier detection — IQR method, numeric columns only
    outliers_by_column = {}
    for col in df.select_dtypes(include=["float64", "int64"]).columns:
        series = df[col].dropna()
        if len(series) < 4:  # not enough data to compute quartiles meaningfully
            continue
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:  # no spread — every value identical, skip
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

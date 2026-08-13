from dotenv import load_dotenv

load_dotenv()

import io
import os
import uuid
from datetime import datetime

import jwt
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
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
    "revenue": r"revenue|amount|amt|price|total|income",
    "sales": r"sales|units.?sold|revenue.?sales",
    "customer_id": r"customer.?id|cust.?id|client.?id|user.?id",
    "email": r"email|e.?mail",
    "product": r"product|item|sku|product.?name",
    "quantity": r"quantity|qty|units|stock.?count",
    "region": r"region|state|country|location|geo",
    "category": r"category|type|segment|class",
    "status": r"status|state$",
    "marketing_spend": r"marketing.?spend|ad.?spend|campaign.?cost|advertising.?spend",
    "inventory": r"inventory|stock.?level|warehouse.?stock|on.?hand",
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


def apply_dynamic_filters(
    df, columns, region=None, product=None, date_from=None, date_to=None
):
    region_col = next((c["name"] for c in columns if c["role"] == "region"), None)
    product_col = next((c["name"] for c in columns if c["role"] == "product"), None)
    date_col = next((c["name"] for c in columns if c["role"] == "date"), None)

    if region and region_col and region_col in df.columns:
        df = df[df[region_col] == region]
    if product and product_col and product_col in df.columns:
        df = df[df[product_col] == product]
    if date_col and (date_from or date_to) and date_col in df.columns:
        parsed = pd.to_datetime(df[date_col], errors="coerce")
        mask = pd.Series(True, index=df.index)
        if date_from:
            mask &= parsed >= pd.to_datetime(date_from)
        if date_to:
            mask &= parsed <= pd.to_datetime(date_to)
        df = df[mask]
    return df


def explain_regression_prediction(r_squared, slope, metric_name, unit=""):
    """Generates a plain-language 'why' explanation from regression stats already computed."""
    if r_squared > 0.7:
        fit_desc = "a clear, consistent pattern"
    elif r_squared > 0.4:
        fit_desc = "a moderate pattern with some fluctuation"
    else:
        fit_desc = "a weak or noisy pattern"

    direction = (
        "increasing" if slope > 0 else "decreasing" if slope < 0 else "staying flat"
    )

    why = (
        f"This prediction is based on {fit_desc} in your historical {metric_name.lower()} data "
        f"(R² = {r_squared}). The trend line shows {metric_name.lower()} {direction} by about "
        f"{abs(round(slope, 2))}{unit} per day. "
    )
    if r_squared < 0.4:
        why += "Because the historical data is noisy, treat this forecast as a rough estimate rather than a precise prediction."
    else:
        why += "This gives a reasonably reliable basis for the forecast."

    return why


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


@app.get("/datasets/{dataset_id}/kpis")
async def get_dataset_kpis(
    dataset_id: str,
    authorization: str = Header(None),
    region: str = None,
    product: str = None,
):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("storage_path, filename, analysis")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]
    filename = result.data["filename"]
    columns = result.data["analysis"]["columns"]

    file_bytes = supabase.storage.from_("datasets").download(storage_path)
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    date_col = next((c["name"] for c in columns if c["role"] == "date"), None)
    revenue_col = next((c["name"] for c in columns if c["role"] == "revenue"), None)
    customer_col = next(
        (c["name"] for c in columns if c["role"] == "customer_id"), None
    )

    df = apply_dynamic_filters(df, columns, region, product, None, None)
    kpis = {"row_count": len(df)}

    if revenue_col and pd.api.types.is_numeric_dtype(df[revenue_col]):
        kpis["total_revenue"] = round(float(df[revenue_col].sum()), 2)
        kpis["avg_order_value"] = round(float(df[revenue_col].mean()), 2)
        kpis["max_order_value"] = round(float(df[revenue_col].max()), 2)

    if date_col:
        parsed = pd.to_datetime(df[date_col], errors="coerce").dropna()
        if len(parsed) > 0:
            kpis["date_range_start"] = parsed.min().strftime("%Y-%m-%d")
            kpis["date_range_end"] = parsed.max().strftime("%Y-%m-%d")

    if customer_col:
        kpis["unique_customers"] = int(df[customer_col].nunique())
        top = df[customer_col].value_counts().head(1)
        if len(top) > 0:
            kpis["top_customer"] = {
                "customer_id": str(top.index[0]),
                "order_count": int(top.iloc[0]),
            }

    revenue_series = []
    if date_col and revenue_col and pd.api.types.is_numeric_dtype(df[revenue_col]):
        temp = df[[date_col, revenue_col]].copy()
        temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
        temp = temp.dropna(subset=[date_col])
        grouped = temp.groupby(temp[date_col].dt.strftime("%Y-%m-%d"))[
            revenue_col
        ].sum()
        revenue_series = [
            {"date": d, "revenue": round(float(v), 2)} for d, v in grouped.items()
        ]

    del df, file_bytes

    return {"kpis": kpis, "revenue_series": revenue_series}


@app.get("/datasets/{dataset_id}/revenue-forecast")
async def get_revenue_forecast(
    dataset_id: str,
    authorization: str = Header(None),
    days_ahead: int = 7,
    region: str = None,
    product: str = None,
):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("storage_path, filename, analysis")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]
    filename = result.data["filename"]
    columns = result.data["analysis"]["columns"]

    date_col = next((c["name"] for c in columns if c["role"] == "date"), None)
    revenue_col = next((c["name"] for c in columns if c["role"] == "revenue"), None)

    if not date_col or not revenue_col:
        return {
            "available": False,
            "reason": "Needs both a date column and a revenue column",
        }

    file_bytes = supabase.storage.from_("datasets").download(storage_path)
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    df = apply_dynamic_filters(df, columns, region, product, None, None)

    if not pd.api.types.is_numeric_dtype(df[revenue_col]):
        return {"available": False, "reason": "Revenue column is not numeric"}

    temp = df[[date_col, revenue_col]].copy()
    temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
    temp = temp.dropna(subset=[date_col])
    daily = temp.groupby(temp[date_col].dt.date)[revenue_col].sum().reset_index()
    daily.columns = ["date", "revenue"]
    daily = daily.sort_values("date")

    if len(daily) < 3:
        return {
            "available": False,
            "reason": "Not enough historical data points to forecast (need at least 3 days)",
        }

    daily["day_index"] = range(len(daily))
    X = daily[["day_index"]].values
    y = daily["revenue"].values

    model = LinearRegression()
    model.fit(X, y)

    r_squared = round(float(model.score(X, y)), 3)
    confidence = "high" if r_squared > 0.7 else "medium" if r_squared > 0.4 else "low"

    last_index = daily["day_index"].max()
    last_date = daily["date"].max()

    future_indices = np.array([[last_index + i] for i in range(1, days_ahead + 1)])
    predictions = model.predict(future_indices)
    predictions = np.maximum(predictions, 0)  # revenue can't go negative

    forecast = []
    for i, pred in enumerate(predictions, start=1):
        future_date = pd.Timestamp(last_date) + pd.Timedelta(days=i)
        forecast.append(
            {
                "date": future_date.strftime("%Y-%m-%d"),
                "predicted_revenue": round(float(pred), 2),
            }
        )

    historical = [
        {"date": str(d), "revenue": round(float(r), 2)}
        for d, r in zip(daily["date"], daily["revenue"])
    ]

    trend = (
        "growing"
        if model.coef_[0] > 0
        else "declining" if model.coef_[0] < 0 else "flat"
    )

    del df, file_bytes

    return {
        "available": True,
        "historical": historical,
        "forecast": forecast,
        "confidence": confidence,
        "r_squared": r_squared,
        "trend": trend,
        "daily_change_rate": round(float(model.coef_[0]), 2),
        "why_explanation": explain_regression_prediction(
            r_squared, float(model.coef_[0]), "Revenue"
        ),
    }


@app.get("/datasets/{dataset_id}/sales-forecast")
async def get_sales_forecast(
    dataset_id: str,
    authorization: str = Header(None),
    days_ahead: int = 7,
    region: str = None,
    product: str = None,
):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("storage_path, filename, analysis")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]
    filename = result.data["filename"]
    columns = result.data["analysis"]["columns"]

    date_col = next((c["name"] for c in columns if c["role"] == "date"), None)
    sales_col = next((c["name"] for c in columns if c["role"] == "sales"), None)
    quantity_col = next((c["name"] for c in columns if c["role"] == "quantity"), None)
    metric_col_name = sales_col or quantity_col

    if not date_col or not metric_col_name:
        return {
            "available": False,
            "reason": "Needs both a date column and a sales/quantity column",
        }

    file_bytes = supabase.storage.from_("datasets").download(storage_path)
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    df = apply_dynamic_filters(df, columns, region, product, None, None)

    if not pd.api.types.is_numeric_dtype(df[metric_col_name]):
        return {"available": False, "reason": "Sales/quantity column is not numeric"}

    temp = df[[date_col, metric_col_name]].copy()
    temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
    temp = temp.dropna(subset=[date_col])
    daily = temp.groupby(temp[date_col].dt.date)[metric_col_name].sum().reset_index()
    daily.columns = ["date", "sales"]
    daily = daily.sort_values("date")

    if len(daily) < 3:
        return {
            "available": False,
            "reason": "Not enough historical data points to forecast (need at least 3 days)",
        }

    daily["day_index"] = range(len(daily))
    X = daily[["day_index"]].values
    y = daily["sales"].values

    model = LinearRegression()
    model.fit(X, y)

    r_squared = round(float(model.score(X, y)), 3)
    confidence = "high" if r_squared > 0.7 else "medium" if r_squared > 0.4 else "low"

    last_index = daily["day_index"].max()
    last_date = daily["date"].max()

    future_indices = np.array([[last_index + i] for i in range(1, days_ahead + 1)])
    predictions = model.predict(future_indices)
    predictions = np.maximum(predictions, 0)

    forecast = []
    for i, pred in enumerate(predictions, start=1):
        future_date = pd.Timestamp(last_date) + pd.Timedelta(days=i)
        forecast.append(
            {
                "date": future_date.strftime("%Y-%m-%d"),
                "predicted_sales": round(float(pred), 2),
            }
        )

    historical = [
        {"date": str(d), "sales": round(float(s), 2)}
        for d, s in zip(daily["date"], daily["sales"])
    ]

    trend = (
        "growing"
        if model.coef_[0] > 0
        else "declining" if model.coef_[0] < 0 else "flat"
    )

    del df, file_bytes

    return {
        "available": True,
        "metric_used": metric_col_name,
        "historical": historical,
        "forecast": forecast,
        "confidence": confidence,
        "r_squared": r_squared,
        "trend": trend,
        "daily_change_rate": round(float(model.coef_[0]), 2),
        "why_explanation": explain_regression_prediction(
            r_squared, float(model.coef_[0]), "Sales"
        ),
    }


@app.get("/datasets/{dataset_id}/churn-prediction")
async def get_churn_prediction(dataset_id: str, authorization: str = Header(None)):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("storage_path, filename, analysis")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]
    filename = result.data["filename"]
    columns = result.data["analysis"]["columns"]

    customer_col = next(
        (c["name"] for c in columns if c["role"] == "customer_id"), None
    )
    date_col = next((c["name"] for c in columns if c["role"] == "date"), None)
    revenue_col = next((c["name"] for c in columns if c["role"] == "revenue"), None)

    if not customer_col or not date_col:
        return {
            "available": False,
            "reason": "Needs both a customer_id column and a date column",
        }

    file_bytes = supabase.storage.from_("datasets").download(storage_path)
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df = df.dropna(subset=[date_col])

    if len(df) == 0:
        return {"available": False, "reason": "No valid dates found"}

    dataset_end = df[date_col].max()

    grouped = df.groupby(customer_col).agg(
        last_order=(date_col, "max"),
        order_count=(date_col, "count"),
    )
    grouped["recency_days"] = (dataset_end - grouped["last_order"]).dt.days

    if revenue_col and pd.api.types.is_numeric_dtype(df[revenue_col]):
        rev = df.groupby(customer_col)[revenue_col].sum()
        grouped["total_revenue"] = rev

    max_recency = max(grouped["recency_days"].max(), 1)

    def risk_bucket(days):
        pct = days / max_recency
        if pct > 0.66:
            return "high"
        elif pct > 0.33:
            return "medium"
        return "low"

    grouped["churn_risk"] = grouped["recency_days"].apply(risk_bucket)

    customers = []
    for cust, row in grouped.sort_values("recency_days", ascending=False).iterrows():
        entry = {
            "customer_id": str(cust),
            "days_since_last_order": int(row["recency_days"]),
            "order_count": int(row["order_count"]),
            "churn_risk": row["churn_risk"],
        }
        if "total_revenue" in grouped.columns:
            entry["total_revenue"] = round(float(row["total_revenue"]), 2)
        customers.append(entry)

    risk_counts = grouped["churn_risk"].value_counts().to_dict()

    del df, file_bytes

    return {
        "available": True,
        "total_customers": len(customers),
        "risk_summary": {
            "high": int(risk_counts.get("high", 0)),
            "medium": int(risk_counts.get("medium", 0)),
            "low": int(risk_counts.get("low", 0)),
        },
        "customers": customers[:20],
    }


@app.get("/datasets/{dataset_id}/customer-lifetime-value")
async def get_customer_lifetime_value(
    dataset_id: str, authorization: str = Header(None)
):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("storage_path, filename, analysis")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]
    filename = result.data["filename"]
    columns = result.data["analysis"]["columns"]

    customer_col = next(
        (c["name"] for c in columns if c["role"] == "customer_id"), None
    )
    date_col = next((c["name"] for c in columns if c["role"] == "date"), None)
    revenue_col = next((c["name"] for c in columns if c["role"] == "revenue"), None)

    if not customer_col or not revenue_col:
        return {
            "available": False,
            "reason": "Needs both a customer_id column and a revenue column",
        }

    file_bytes = supabase.storage.from_("datasets").download(storage_path)
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    if not pd.api.types.is_numeric_dtype(df[revenue_col]):
        return {"available": False, "reason": "Revenue column is not numeric"}

    ESTIMATED_LIFESPAN_YEARS = 2  # assumption, disclosed to user in response

    observation_days = 365  # default fallback
    if date_col:
        df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
        valid_dates = df[date_col].dropna()
        if len(valid_dates) > 1:
            span = (valid_dates.max() - valid_dates.min()).days
            observation_days = max(span, 1)

    grouped = df.groupby(customer_col).agg(
        total_revenue=(revenue_col, "sum"),
        order_count=(revenue_col, "count"),
    )
    grouped["avg_order_value"] = grouped["total_revenue"] / grouped["order_count"]
    grouped["purchase_frequency_annual"] = (
        grouped["order_count"] / observation_days
    ) * 365
    grouped["clv"] = (
        grouped["avg_order_value"]
        * grouped["purchase_frequency_annual"]
        * ESTIMATED_LIFESPAN_YEARS
    )

    clv_values = grouped["clv"]
    high_cutoff = clv_values.quantile(0.66)
    low_cutoff = clv_values.quantile(0.33)

    def segment(clv):
        if clv >= high_cutoff:
            return "Gold"
        elif clv >= low_cutoff:
            return "Silver"
        return "Bronze"

    grouped["segment"] = grouped["clv"].apply(segment)

    customers = []
    for cust, row in grouped.sort_values("clv", ascending=False).iterrows():
        customers.append(
            {
                "customer_id": str(cust),
                "clv": round(float(row["clv"]), 2),
                "avg_order_value": round(float(row["avg_order_value"]), 2),
                "order_count": int(row["order_count"]),
                "segment": row["segment"],
            }
        )

    segment_counts = grouped["segment"].value_counts().to_dict()

    del df, file_bytes

    return {
        "available": True,
        "assumptions": {
            "estimated_lifespan_years": ESTIMATED_LIFESPAN_YEARS,
            "observation_period_days": observation_days,
        },
        "segment_summary": {
            "gold": int(segment_counts.get("Gold", 0)),
            "silver": int(segment_counts.get("Silver", 0)),
            "bronze": int(segment_counts.get("Bronze", 0)),
        },
        "customers": customers[:20],
    }


@app.get("/datasets/{dataset_id}/inventory-forecast")
async def get_inventory_forecast(
    dataset_id: str,
    authorization: str = Header(None),
    days_ahead: int = 7,
):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("storage_path, filename, analysis")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]
    filename = result.data["filename"]
    columns = result.data["analysis"]["columns"]

    date_col = next((c["name"] for c in columns if c["role"] == "date"), None)
    inventory_col = next((c["name"] for c in columns if c["role"] == "inventory"), None)
    product_col = next((c["name"] for c in columns if c["role"] == "product"), None)

    if not date_col or not inventory_col or not product_col:
        return {
            "available": False,
            "reason": "Needs date, inventory, and product columns",
        }

    file_bytes = supabase.storage.from_("datasets").download(storage_path)
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    if not pd.api.types.is_numeric_dtype(df[inventory_col]):
        return {"available": False, "reason": "Inventory column is not numeric"}

    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df = df.dropna(subset=[date_col])

    LOW_STOCK_THRESHOLD = 10
    products_forecast = []

    for product, group in df.groupby(product_col):
        group = group.sort_values(date_col)
        if len(group) < 3:
            continue

        group = group.reset_index(drop=True)
        group["day_index"] = range(len(group))
        X = group[["day_index"]].values
        y = group[inventory_col].values

        model = LinearRegression()
        model.fit(X, y)

        last_index = group["day_index"].max()
        last_date = group[date_col].max()
        last_level = float(group[inventory_col].iloc[-1])

        future_indices = np.array([[last_index + i] for i in range(1, days_ahead + 1)])
        predictions = model.predict(future_indices)
        predictions = np.maximum(predictions, 0)

        forecast_points = []
        stockout_date = None
        for i, pred in enumerate(predictions, start=1):
            future_date = pd.Timestamp(last_date) + pd.Timedelta(days=i)
            level = round(float(pred), 2)
            forecast_points.append(
                {"date": future_date.strftime("%Y-%m-%d"), "predicted_inventory": level}
            )
            if level < LOW_STOCK_THRESHOLD and stockout_date is None:
                stockout_date = future_date.strftime("%Y-%m-%d")

        products_forecast.append(
            {
                "product": str(product),
                "current_inventory": round(last_level, 2),
                "daily_change_rate": round(float(model.coef_[0]), 2),
                "forecast": forecast_points,
                "will_run_low": stockout_date is not None,
                "predicted_low_stock_date": stockout_date,
            }
        )

    products_forecast.sort(
        key=lambda p: (not p["will_run_low"], p["current_inventory"])
    )

    del df, file_bytes

    if not products_forecast:
        return {
            "available": False,
            "reason": "Not enough data points per product to forecast (need at least 3)",
        }

    return {
        "available": True,
        "low_stock_threshold": LOW_STOCK_THRESHOLD,
        "products": products_forecast,
    }


@app.get("/datasets/{dataset_id}/marketing-roi-prediction")
async def get_marketing_roi_prediction(
    dataset_id: str,
    authorization: str = Header(None),
    hypothetical_spend: float = None,
    region: str = None,
    product: str = None,
):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("storage_path, filename, analysis")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]
    filename = result.data["filename"]
    columns = result.data["analysis"]["columns"]

    spend_col = next(
        (c["name"] for c in columns if c["role"] == "marketing_spend"), None
    )
    revenue_col = next((c["name"] for c in columns if c["role"] == "revenue"), None)

    if not spend_col or not revenue_col:
        return {
            "available": False,
            "reason": "Needs both a marketing_spend column and a revenue column",
        }

    file_bytes = supabase.storage.from_("datasets").download(storage_path)
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    df = apply_dynamic_filters(df, columns, region, product, None, None)

    if not pd.api.types.is_numeric_dtype(
        df[spend_col]
    ) or not pd.api.types.is_numeric_dtype(df[revenue_col]):
        return {"available": False, "reason": "Spend or revenue column is not numeric"}

    clean = df[[spend_col, revenue_col]].dropna()
    if len(clean) < 3:
        return {
            "available": False,
            "reason": "Not enough data points to model spend-to-revenue relationship (need at least 3)",
        }

    X = clean[[spend_col]].values
    y = clean[revenue_col].values

    model = LinearRegression()
    model.fit(X, y)

    r_squared = round(float(model.score(X, y)), 3)
    confidence = "high" if r_squared > 0.7 else "medium" if r_squared > 0.4 else "low"

    current_avg_spend = float(clean[spend_col].mean())
    current_avg_revenue = float(clean[revenue_col].mean())

    if hypothetical_spend is None:
        hypothetical_spend = (
            current_avg_spend * 1.2
        )  # default: model a 20% spend increase

    predicted_revenue = float(model.predict([[hypothetical_spend]])[0])
    predicted_revenue = max(predicted_revenue, 0)
    predicted_roi = (
        round(predicted_revenue / hypothetical_spend, 2) if hypothetical_spend else None
    )

    spend_range = np.linspace(
        max(clean[spend_col].min() * 0.5, 0), clean[spend_col].max() * 1.5, 12
    )
    curve = []
    for s in spend_range:
        pred = max(float(model.predict([[s]])[0]), 0)
        curve.append({"spend": round(float(s), 2), "predicted_revenue": round(pred, 2)})

    del df, file_bytes

    why = (
        f"This ROI prediction assumes the same spend-to-revenue relationship seen in your historical data continues. "
        f"On average, each additional dollar of marketing spend has been associated with "
        f"{round(float(model.coef_[0]), 2)} dollars of revenue (R² = {r_squared}). "
    )
    if r_squared < 0.4:
        why += "This relationship is weak in your data, so treat the prediction as directional rather than exact."
    else:
        why += "This is a fairly reliable relationship based on your historical spend and revenue patterns."

    return {
        "available": True,
        "confidence": confidence,
        "r_squared": r_squared,
        "revenue_per_spend_dollar": round(float(model.coef_[0]), 2),
        "current_avg_spend": round(current_avg_spend, 2),
        "current_avg_revenue": round(current_avg_revenue, 2),
        "hypothetical_spend": round(float(hypothetical_spend), 2),
        "predicted_revenue": round(predicted_revenue, 2),
        "predicted_roi": predicted_roi,
        "curve": curve,
        "why_explanation": why,
    }


@app.get("/datasets/{dataset_id}/risk-prediction")
async def get_risk_prediction(dataset_id: str, authorization: str = Header(None)):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("storage_path, filename, analysis")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]
    filename = result.data["filename"]
    columns = result.data["analysis"]["columns"]

    date_col = next((c["name"] for c in columns if c["role"] == "date"), None)
    revenue_col = next((c["name"] for c in columns if c["role"] == "revenue"), None)
    sales_col = next((c["name"] for c in columns if c["role"] == "sales"), None)
    quantity_col = next((c["name"] for c in columns if c["role"] == "quantity"), None)
    inventory_col = next((c["name"] for c in columns if c["role"] == "inventory"), None)
    product_col = next((c["name"] for c in columns if c["role"] == "product"), None)
    customer_col = next(
        (c["name"] for c in columns if c["role"] == "customer_id"), None
    )

    file_bytes = supabase.storage.from_("datasets").download(storage_path)
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    risks = []

    # Revenue trend risk
    if date_col and revenue_col and pd.api.types.is_numeric_dtype(df[revenue_col]):
        temp = df[[date_col, revenue_col]].copy()
        temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
        temp = temp.dropna(subset=[date_col])
        daily = temp.groupby(temp[date_col].dt.date)[revenue_col].sum().reset_index()
        if len(daily) >= 3:
            daily["idx"] = range(len(daily))
            model = LinearRegression().fit(
                daily[["idx"]].values,
                daily[revenue_col.__class__ and daily.columns[1]].values,
            )
            slope = float(model.coef_[0])
            if slope < 0:
                risks.append(
                    {
                        "category": "Revenue",
                        "severity": "high" if slope < -50 else "medium",
                        "message": f"Revenue is trending downward (~{round(slope,2)}/day). Investigate cause before it compounds.",
                    }
                )

    # Sales trend risk
    metric_col = sales_col or quantity_col
    if date_col and metric_col and pd.api.types.is_numeric_dtype(df[metric_col]):
        temp = df[[date_col, metric_col]].copy()
        temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
        temp = temp.dropna(subset=[date_col])
        daily = temp.groupby(temp[date_col].dt.date)[metric_col].sum().reset_index()
        if len(daily) >= 3:
            daily["idx"] = range(len(daily))
            model = LinearRegression().fit(
                daily[["idx"]].values, daily[daily.columns[1]].values
            )
            slope = float(model.coef_[0])
            if slope < 0:
                risks.append(
                    {
                        "category": "Sales",
                        "severity": "high" if slope < -20 else "medium",
                        "message": f"Sales volume is declining (~{round(slope,2)}/day trend).",
                    }
                )

    # Inventory risk
    if (
        inventory_col
        and product_col
        and pd.api.types.is_numeric_dtype(df[inventory_col])
    ):
        LOW_STOCK_THRESHOLD = 10
        latest = df.sort_values(date_col) if date_col else df
        latest = latest.groupby(product_col).last()
        low_products = latest[latest[inventory_col] < LOW_STOCK_THRESHOLD]
        for prod, row in low_products.iterrows():
            risks.append(
                {
                    "category": "Inventory",
                    "severity": "high" if row[inventory_col] < 5 else "medium",
                    "message": f"{prod} is low on stock ({int(row[inventory_col])} units remaining).",
                }
            )

    # Customer churn risk
    if customer_col and date_col:
        temp = df[[customer_col, date_col]].copy()
        temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
        temp = temp.dropna(subset=[date_col])
        if len(temp) > 0:
            end_date = temp[date_col].max()
            last_order = temp.groupby(customer_col)[date_col].max()
            recency = (end_date - last_order).dt.days
            max_r = max(recency.max(), 1)
            high_risk_count = int((recency / max_r > 0.66).sum())
            if high_risk_count > 0:
                risks.append(
                    {
                        "category": "Customer",
                        "severity": "medium",
                        "message": f"{high_risk_count} customer(s) at high risk of churn based on order recency.",
                    }
                )

    del df, file_bytes

    severity_order = {"high": 0, "medium": 1, "low": 2}
    risks.sort(key=lambda r: severity_order.get(r["severity"], 3))

    high_count = sum(1 for r in risks if r["severity"] == "high")
    medium_count = sum(1 for r in risks if r["severity"] == "medium")

    return {
        "available": True,
        "overall_risk_level": (
            "high" if high_count > 0 else "medium" if medium_count > 0 else "low"
        ),
        "risk_count": {"high": high_count, "medium": medium_count},
        "risks": risks,
    }


@app.get("/datasets/{dataset_id}/opportunity-detection")
async def get_opportunity_detection(dataset_id: str, authorization: str = Header(None)):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("storage_path, filename, analysis")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]
    filename = result.data["filename"]
    columns = result.data["analysis"]["columns"]

    date_col = next((c["name"] for c in columns if c["role"] == "date"), None)
    revenue_col = next((c["name"] for c in columns if c["role"] == "revenue"), None)
    sales_col = next((c["name"] for c in columns if c["role"] == "sales"), None)
    quantity_col = next((c["name"] for c in columns if c["role"] == "quantity"), None)
    product_col = next((c["name"] for c in columns if c["role"] == "product"), None)
    customer_col = next(
        (c["name"] for c in columns if c["role"] == "customer_id"), None
    )

    file_bytes = supabase.storage.from_("datasets").download(storage_path)
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    opportunities = []

    # Revenue growth opportunity
    if date_col and revenue_col and pd.api.types.is_numeric_dtype(df[revenue_col]):
        temp = df[[date_col, revenue_col]].copy()
        temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
        temp = temp.dropna(subset=[date_col])
        daily = temp.groupby(temp[date_col].dt.date)[revenue_col].sum().reset_index()
        if len(daily) >= 3:
            daily["idx"] = range(len(daily))
            model = LinearRegression().fit(
                daily[["idx"]].values, daily[daily.columns[1]].values
            )
            slope = float(model.coef_[0])
            if slope > 0:
                opportunities.append(
                    {
                        "category": "Revenue",
                        "impact": "high" if slope > 50 else "medium",
                        "message": f"Revenue is trending upward (~{round(slope,2)}/day). Consider scaling marketing spend to accelerate growth.",
                    }
                )

    # Sales growth opportunity
    metric_col = sales_col or quantity_col
    if date_col and metric_col and pd.api.types.is_numeric_dtype(df[metric_col]):
        temp = df[[date_col, metric_col]].copy()
        temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
        temp = temp.dropna(subset=[date_col])
        daily = temp.groupby(temp[date_col].dt.date)[metric_col].sum().reset_index()
        if len(daily) >= 3:
            daily["idx"] = range(len(daily))
            model = LinearRegression().fit(
                daily[["idx"]].values, daily[daily.columns[1]].values
            )
            slope = float(model.coef_[0])
            if slope > 0:
                opportunities.append(
                    {
                        "category": "Sales",
                        "impact": "high" if slope > 20 else "medium",
                        "message": f"Sales volume is growing (~{round(slope,2)}/day trend). Demand is rising.",
                    }
                )

    # Product-level demand opportunity
    if (
        product_col
        and metric_col
        and date_col
        and pd.api.types.is_numeric_dtype(df[metric_col])
    ):
        temp = df[[date_col, product_col, metric_col]].copy()
        temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
        temp = temp.dropna(subset=[date_col])
        for prod, group in temp.groupby(product_col):
            daily = (
                group.groupby(group[date_col].dt.date)[metric_col].sum().reset_index()
            )
            if len(daily) >= 3:
                daily["idx"] = range(len(daily))
                model = LinearRegression().fit(
                    daily[["idx"]].values, daily[daily.columns[1]].values
                )
                slope = float(model.coef_[0])
                if slope > 0:
                    opportunities.append(
                        {
                            "category": "Product",
                            "impact": "high" if slope > 10 else "medium",
                            "message": f"{prod} shows rising demand (~{round(slope,2)}/day). Consider increasing production/stock.",
                        }
                    )

    # Customer base growth opportunity
    if customer_col and date_col:
        temp = df[[customer_col, date_col]].copy()
        temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
        temp = temp.dropna(subset=[date_col])
        if len(temp) > 0:
            first_half = temp[temp[date_col] <= temp[date_col].median()]
            second_half = temp[temp[date_col] > temp[date_col].median()]
            first_unique = first_half[customer_col].nunique()
            second_unique = second_half[customer_col].nunique()
            if first_unique > 0 and second_unique > first_unique:
                growth_pct = round(
                    ((second_unique - first_unique) / first_unique) * 100, 1
                )
                opportunities.append(
                    {
                        "category": "Customer",
                        "impact": "high" if growth_pct > 30 else "medium",
                        "message": f"Customer base grew {growth_pct}% in the latest period ({second_unique} vs {first_unique} unique customers). Consider expanding marketing reach.",
                    }
                )

    del df, file_bytes

    impact_order = {"high": 0, "medium": 1}
    opportunities.sort(key=lambda o: impact_order.get(o["impact"], 2))

    high_count = sum(1 for o in opportunities if o["impact"] == "high")
    medium_count = sum(1 for o in opportunities if o["impact"] == "medium")

    return {
        "available": True,
        "overall_opportunity_level": (
            "high" if high_count > 0 else "medium" if medium_count > 0 else "low"
        ),
        "opportunity_count": {"high": high_count, "medium": medium_count},
        "opportunities": opportunities,
    }


@app.get("/datasets/{dataset_id}/trend-detection")
async def get_trend_detection(dataset_id: str, authorization: str = Header(None)):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("storage_path, filename, analysis")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]
    filename = result.data["filename"]
    columns = result.data["analysis"]["columns"]

    date_col = next((c["name"] for c in columns if c["role"] == "date"), None)
    revenue_col = next((c["name"] for c in columns if c["role"] == "revenue"), None)
    sales_col = next((c["name"] for c in columns if c["role"] == "sales"), None)
    quantity_col = next((c["name"] for c in columns if c["role"] == "quantity"), None)
    spend_col = next(
        (c["name"] for c in columns if c["role"] == "marketing_spend"), None
    )

    if not date_col:
        return {"available": False, "reason": "Needs a date column"}

    file_bytes = supabase.storage.from_("datasets").download(storage_path)
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df = df.dropna(subset=[date_col])

    def trend_for(col, label, unit=""):
        if not col or not pd.api.types.is_numeric_dtype(df[col]):
            return None
        temp = df[[date_col, col]].copy()
        daily = temp.groupby(temp[date_col].dt.date)[col].sum().reset_index()
        if len(daily) < 3:
            return None
        daily["idx"] = range(len(daily))
        model = LinearRegression().fit(
            daily[["idx"]].values, daily[daily.columns[1]].values
        )
        slope = float(model.coef_[0])
        r2 = round(
            float(model.score(daily[["idx"]].values, daily[daily.columns[1]].values)), 2
        )
        direction = (
            "growing" if slope > 0.5 else "declining" if slope < -0.5 else "flat"
        )
        pct_word = (
            "increasing" if slope > 0 else "decreasing" if slope < 0 else "staying flat"
        )
        summary = f"{label} is {pct_word} by approximately {abs(round(slope, 2))}{unit} per day (trend confidence: {'strong' if r2 > 0.5 else 'weak'})."
        return {
            "metric": label,
            "direction": direction,
            "daily_change": round(slope, 2),
            "confidence": r2,
            "summary": summary,
        }

    trends = []
    for col, label, unit in [
        (revenue_col, "Revenue", ""),
        (sales_col or quantity_col, "Sales", " units"),
        (spend_col, "Marketing Spend", ""),
    ]:
        t = trend_for(col, label, unit)
        if t:
            trends.append(t)

    del df, file_bytes

    if not trends:
        return {
            "available": False,
            "reason": "No trackable numeric metrics with a date column found",
        }

    return {"available": True, "trends": trends}


@app.get("/datasets/{dataset_id}/filter-options")
async def get_filter_options(dataset_id: str, authorization: str = Header(None)):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("storage_path, filename, analysis")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]
    filename = result.data["filename"]
    columns = result.data["analysis"]["columns"]

    region_col = next((c["name"] for c in columns if c["role"] == "region"), None)
    product_col = next((c["name"] for c in columns if c["role"] == "product"), None)

    if not region_col and not product_col:
        return {"regions": [], "products": []}

    file_bytes = supabase.storage.from_("datasets").download(storage_path)
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    regions = (
        sorted(df[region_col].dropna().astype(str).unique().tolist())
        if region_col
        else []
    )
    products = (
        sorted(df[product_col].dropna().astype(str).unique().tolist())
        if product_col
        else []
    )

    del df, file_bytes
    return {"regions": regions, "products": products}


@app.get("/datasets/{dataset_id}/customer-analytics")
async def get_customer_analytics(dataset_id: str, authorization: str = Header(None)):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("storage_path, filename, analysis")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]
    filename = result.data["filename"]
    columns = result.data["analysis"]["columns"]

    customer_col = next(
        (c["name"] for c in columns if c["role"] == "customer_id"), None
    )
    revenue_col = next((c["name"] for c in columns if c["role"] == "revenue"), None)

    if not customer_col:
        return {"available": False, "reason": "No customer_id column detected"}

    file_bytes = supabase.storage.from_("datasets").download(storage_path)
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    order_counts = df[customer_col].value_counts()

    top_by_orders = [
        {"customer_id": str(k), "order_count": int(v)}
        for k, v in order_counts.head(10).items()
    ]

    top_by_revenue = []
    if revenue_col and pd.api.types.is_numeric_dtype(df[revenue_col]):
        rev_by_customer = (
            df.groupby(customer_col)[revenue_col].sum().sort_values(ascending=False)
        )
        top_by_revenue = [
            {"customer_id": str(k), "total_revenue": round(float(v), 2)}
            for k, v in rev_by_customer.head(10).items()
        ]

    # simple segmentation: one-time vs repeat customers
    repeat_customers = int((order_counts > 1).sum())
    one_time_customers = int((order_counts == 1).sum())

    del df, file_bytes

    return {
        "available": True,
        "unique_customers": int(order_counts.shape[0]),
        "repeat_customers": repeat_customers,
        "one_time_customers": one_time_customers,
        "top_by_orders": top_by_orders,
        "top_by_revenue": top_by_revenue,
    }


@app.get("/datasets/{dataset_id}/sales-analytics")
async def get_sales_analytics(
    dataset_id: str,
    authorization: str = Header(None),
    region: str = None,
    product: str = None,
    date_from: str = None,
    date_to: str = None,
):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("storage_path, filename, analysis")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]
    filename = result.data["filename"]
    columns = result.data["analysis"]["columns"]

    sales_col = next((c["name"] for c in columns if c["role"] == "sales"), None)
    product_col = next((c["name"] for c in columns if c["role"] == "product"), None)
    quantity_col = next((c["name"] for c in columns if c["role"] == "quantity"), None)
    region_col = next((c["name"] for c in columns if c["role"] == "region"), None)
    date_col = next((c["name"] for c in columns if c["role"] == "date"), None)

    if not sales_col and not quantity_col:
        return {"available": False, "reason": "No sales or quantity column detected"}

    file_bytes = supabase.storage.from_("datasets").download(storage_path)
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    df = apply_dynamic_filters(df, columns, region, product, date_from, date_to)
    metric_col = sales_col or quantity_col

    summary = {}
    if pd.api.types.is_numeric_dtype(df[metric_col]):
        summary["total_sales"] = round(float(df[metric_col].sum()), 2)
        summary["avg_sale"] = round(float(df[metric_col].mean()), 2)

    by_product = []
    if product_col and pd.api.types.is_numeric_dtype(df[metric_col]):
        grouped = df.groupby(product_col)[metric_col].sum().sort_values(ascending=False)
        by_product = [
            {"product": str(k), "total": round(float(v), 2)}
            for k, v in grouped.head(10).items()
        ]

    by_region = []
    if region_col and pd.api.types.is_numeric_dtype(df[metric_col]):
        grouped = df.groupby(region_col)[metric_col].sum().sort_values(ascending=False)
        by_region = [
            {"region": str(k), "total": round(float(v), 2)} for k, v in grouped.items()
        ]

    sales_series = []
    if date_col and pd.api.types.is_numeric_dtype(df[metric_col]):
        temp = df[[date_col, metric_col]].copy()
        temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
        temp = temp.dropna(subset=[date_col])
        grouped = temp.groupby(temp[date_col].dt.strftime("%Y-%m-%d"))[metric_col].sum()
        sales_series = [
            {"date": d, "sales": round(float(v), 2)} for d, v in grouped.items()
        ]

    del df, file_bytes

    return {
        "available": True,
        "metric_used": metric_col,
        "summary": summary,
        "by_product": by_product,
        "by_region": by_region,
        "sales_series": sales_series,
    }


@app.get("/datasets/{dataset_id}/marketing-analytics")
async def get_marketing_analytics(
    dataset_id: str,
    authorization: str = Header(None),
    region: str = None,
    product: str = None,
):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("storage_path, filename, analysis")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]
    filename = result.data["filename"]
    columns = result.data["analysis"]["columns"]

    spend_col = next(
        (c["name"] for c in columns if c["role"] == "marketing_spend"), None
    )
    revenue_col = next((c["name"] for c in columns if c["role"] == "revenue"), None)
    date_col = next((c["name"] for c in columns if c["role"] == "date"), None)

    if not spend_col:
        return {"available": False, "reason": "No marketing_spend column detected"}

    file_bytes = supabase.storage.from_("datasets").download(storage_path)
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    df = apply_dynamic_filters(df, columns, region, product, None, None)
    summary = {}
    if pd.api.types.is_numeric_dtype(df[spend_col]):
        summary["total_spend"] = round(float(df[spend_col].sum()), 2)

    if (
        revenue_col
        and pd.api.types.is_numeric_dtype(df[revenue_col])
        and pd.api.types.is_numeric_dtype(df[spend_col])
    ):
        total_revenue = float(df[revenue_col].sum())
        total_spend = float(df[spend_col].sum())
        summary["total_revenue"] = round(total_revenue, 2)
        summary["roi"] = round(total_revenue / total_spend, 2) if total_spend else None

    spend_series = []
    if date_col and pd.api.types.is_numeric_dtype(df[spend_col]):
        temp = df[[date_col, spend_col]].copy()
        temp[date_col] = pd.to_datetime(temp[date_col], errors="coerce")
        temp = temp.dropna(subset=[date_col])
        grouped = temp.groupby(temp[date_col].dt.strftime("%Y-%m-%d"))[spend_col].sum()
        spend_series = [
            {"date": d, "spend": round(float(v), 2)} for d, v in grouped.items()
        ]

    del df, file_bytes

    return {
        "available": True,
        "summary": summary,
        "spend_series": spend_series,
    }


@app.get("/datasets/{dataset_id}/inventory-analytics")
async def get_inventory_analytics(
    dataset_id: str,
    authorization: str = Header(None),
    region: str = None,
    product: str = None,
):
    company_id, _ = get_company_id(authorization)

    result = (
        supabase.table("datasets")
        .select("storage_path, filename, analysis")
        .eq("id", dataset_id)
        .eq("company_id", company_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Dataset not found")

    storage_path = result.data["storage_path"]
    filename = result.data["filename"]
    columns = result.data["analysis"]["columns"]

    inventory_col = next((c["name"] for c in columns if c["role"] == "inventory"), None)
    product_col = next((c["name"] for c in columns if c["role"] == "product"), None)
    date_col = next((c["name"] for c in columns if c["role"] == "date"), None)

    if not inventory_col:
        return {"available": False, "reason": "No inventory column detected"}

    file_bytes = supabase.storage.from_("datasets").download(storage_path)
    if filename.lower().endswith(".csv"):
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    df = apply_dynamic_filters(df, columns, region, product, None, None)
    LOW_STOCK_THRESHOLD = 10

    latest_by_product = []
    if product_col and pd.api.types.is_numeric_dtype(df[inventory_col]):
        sort_col = date_col if date_col else None
        temp = df.copy()
        if sort_col:
            temp[sort_col] = pd.to_datetime(temp[sort_col], errors="coerce")
            temp = temp.sort_values(sort_col)
        latest = temp.groupby(product_col).last()
        min_levels = temp.groupby(product_col)[inventory_col].min()
        for prod, row in latest.iterrows():
            level = float(row[inventory_col])
            min_level = float(min_levels[prod])
            latest_by_product.append(
                {
                    "product": str(prod),
                    "inventory": round(level, 2),
                    "low_stock": level < LOW_STOCK_THRESHOLD,
                    "min_inventory": round(min_level, 2),
                    "had_low_stock_event": min_level < LOW_STOCK_THRESHOLD,
                }
            )
        latest_by_product.sort(key=lambda x: x["inventory"])

    low_stock_alerts = [p for p in latest_by_product if p["low_stock"]]
    historical_dip_alerts = [
        p for p in latest_by_product if p["had_low_stock_event"] and not p["low_stock"]
    ]

    del df, file_bytes

    return {
        "available": True,
        "low_stock_threshold": LOW_STOCK_THRESHOLD,
        "latest_by_product": latest_by_product,
        "low_stock_alerts": low_stock_alerts,
        "historical_dip_alerts": historical_dip_alerts,
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

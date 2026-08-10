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
SUPABASE_JWT_SECRET = os.environ[
    "SUPABASE_JWT_SECRET"
]  # Supabase dashboard → Settings → API → JWT Secret

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def get_company_id(authorization: str = Header(None)) -> str:
    """Verify the user's Supabase JWT and resolve their company_id via memberships table."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or invalid Authorization header"
        )

    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
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
        }
        for col in df.columns
    ]

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

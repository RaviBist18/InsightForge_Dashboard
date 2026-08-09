from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io

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


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    filename = file.filename or ""
    if not filename.lower().endswith((".csv", ".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only CSV or Excel files supported")

    contents = await file.read()

    # 20MB limit per your ₹0-cost / free-tier RAM constraint
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

    preview_df = df.head(10)
    preview = [
        {k: (None if pd.isna(v) else v) for k, v in row.items()}
        for row in preview_df.to_dict(orient="records")
    ]

    columns = [
        {
            "name": col,
            "dtype": str(df[col].dtype),
            "null_count": int(df[col].isnull().sum()),
        }
        for col in df.columns
    ]

    del contents, df  # free memory immediately, per your RAM-conscious approach

    return {
        "filename": filename,
        "row_count": len(preview) if len(preview) < 10 else "10+ (preview truncated)",
        "columns": columns,
        "preview": preview,
    }

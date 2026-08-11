"""
Paginated dataset list endpoint — FastAPI + SQLAlchemy.
Adjust model import / session dependency to match your actual repo structure.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session
from typing import Literal

# from app.db import get_db          # adjust import
# from app.models import Dataset     # adjust import

router = APIRouter()

SortOption = Literal["newest", "oldest", "name"]


@router.get("/api/datasets")
def list_datasets(
    page: int = Query(1, ge=1),
    limit: int = Query(
        15, ge=1, le=100
    ),  # hard cap — never let client request unbounded rows
    search: str = Query("", max_length=200),
    sort: SortOption = Query("newest"),
    db: Session = Depends(get_db),
):
    query = select(Dataset).where(
        Dataset.user_id == current_user_id
    )  # scope to user/org

    if search:
        query = query.where(Dataset.filename.ilike(f"%{search}%"))

    if sort == "newest":
        query = query.order_by(Dataset.uploaded_at.desc())
    elif sort == "oldest":
        query = query.order_by(Dataset.uploaded_at.asc())
    elif sort == "name":
        query = query.order_by(Dataset.filename.asc())

    # total count for pagination — separate query, same filters, no order/limit
    count_query = select(func.count()).select_from(query.subquery())
    total = db.execute(count_query).scalar_one()

    rows = db.execute(query.offset((page - 1) * limit).limit(limit)).scalars().all()

    return {
        "data": [
            {
                "id": str(d.id),
                "filename": d.filename,
                "uploadedAt": d.uploaded_at.isoformat(),
                "rows": d.row_count,
                "status": d.status,
            }
            for d in rows
        ],
        "total": total,
        "page": page,
        "pageSize": limit,
    }

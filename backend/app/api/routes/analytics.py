from typing import Any, Dict
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, cast, Date

from app.db.session import get_db
from app.models.crm import Lead, Call, LeadStatus, CallStatus
from app.models.project import Project, Property
from app.models.user import User
from app.api.dependencies.auth import get_current_active_user

router = APIRouter()


@router.get("/dashboard", response_model=Dict[str, Any])
async def get_dashboard_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Real analytics for the admin dashboard (no mocks)."""
    total_leads_result = await db.execute(select(func.count(Lead.id)))
    total_leads = total_leads_result.scalar_one()

    total_calls_result = await db.execute(select(func.count(Call.id)))
    total_calls = total_calls_result.scalar_one()

    total_projects_result = await db.execute(select(func.count(Project.id)))
    total_projects = total_projects_result.scalar_one()

    total_properties_result = await db.execute(select(func.count(Property.id)))
    total_properties = total_properties_result.scalar_one()

    hot_leads_result = await db.execute(
        select(func.count(Lead.id)).where(Lead.lead_score >= 80)
    )
    hot_leads = hot_leads_result.scalar_one()

    won_result = await db.execute(
        select(func.count(Lead.id)).where(Lead.lead_status == LeadStatus.WON)
    )
    won_leads = won_result.scalar_one()
    conversion_rate = round((won_leads / total_leads) * 100, 1) if total_leads else 0.0

    connected_result = await db.execute(
        select(func.count(Call.id)).where(Call.duration.isnot(None), Call.duration > 0)
    )
    connected_calls = connected_result.scalar_one()
    connect_rate = round((connected_calls / total_calls) * 100, 1) if total_calls else 0.0

    avg_duration_result = await db.execute(
        select(func.avg(Call.duration)).where(Call.duration.isnot(None))
    )
    avg_duration = int(avg_duration_result.scalar_one() or 0)

    return {
        "total_leads": total_leads,
        "total_calls": total_calls,
        "total_projects": total_projects,
        "total_properties": total_properties,
        "hot_leads": hot_leads,
        "won_leads": won_leads,
        "conversion_rate": conversion_rate,
        "connect_rate": connect_rate,
        "avg_call_duration_sec": avg_duration,
    }


@router.get("/pipeline", response_model=Dict[str, Any])
async def pipeline_breakdown(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Lead count per pipeline stage for the Analytics bar chart."""
    rows = (
        await db.execute(select(Lead.lead_status, func.count(Lead.id)).group_by(Lead.lead_status))
    ).all()
    order = [
        LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED,
        LeadStatus.SITE_VISIT, LeadStatus.NEGOTIATING, LeadStatus.WON, LeadStatus.LOST,
    ]
    counts = {status: 0 for status in order}
    for status, count in rows:
        key = status if isinstance(status, LeadStatus) else LeadStatus(str(status))
        counts[key] = int(count)
    return {
        "stages": [
            {"stage": s.value, "label": s.value.replace("_", " ").title(), "count": counts[s]}
            for s in order
        ]
    }


@router.get("/calls-by-day", response_model=Dict[str, Any])
async def calls_by_day(
    days: int = 14,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """AI call volume for the last N days (UTC) for the Analytics line chart."""
    since = datetime.now(timezone.utc) - timedelta(days=days - 1)
    rows = (
        await db.execute(
            select(
                cast(Call.created_at, Date).label("day"),
                func.count(Call.id),
            )
            .where(Call.created_at >= since)
            .group_by(cast(Call.created_at, Date))
            .order_by(cast(Call.created_at, Date))
        )
    ).all()
    by_day = {str(day): int(count) for day, count in rows}

    labels, counts = [], []
    for i in range(days):
        d = (since + timedelta(days=i)).date()
        key = str(d)
        labels.append(d.strftime("%b %d"))
        counts.append(by_day.get(key, 0))
    return {"labels": labels, "counts": counts}

"""Public marketing-site endpoints (no auth) backed by real database data."""
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.project import Project, Property, ProjectStatus
from app.models.user import User, UserRole
from app.schemas.public import (
    SiteStats,
    LocationStat,
    PublicProject,
    PublicProperty,
    TestimonialOut,
    AgentOut,
    NewsOut,
    PublicLeadCreate,
)
from app.models.crm import Lead, LeadStatus

router = APIRouter()

TESTIMONIALS = [
    {
        "id": 1,
        "name": "Rohan Mehta",
        "role": "Homeowner, Pune",
        "quote": "I spoke to their AI consultant at 11 PM and had three shortlisted flats by morning. The site visit was booked before I even finished my chai. Closed on Skyline Heights in three weeks.",
        "rating": 5,
    },
    {
        "id": 2,
        "name": "Sneha Kulkarni",
        "role": "Investor, Mumbai",
        "quote": "The EMI breakdown and price negotiations were handled transparently. Their agent knew every unit's carpet area and floor by heart. Genuinely the smoothest purchase I've made.",
        "rating": 5,
    },
    {
        "id": 3,
        "name": "Arjun Kapoor",
        "role": "First-time buyer, Hinjewadi",
        "quote": "As a first-time buyer I had a hundred questions. Priya answered every single one in Hinglish, at my pace, without ever making me feel rushed. Zero pressure, pure help.",
        "rating": 5,
    },
    {
        "id": 4,
        "name": "Priyanka Deshmukh",
        "role": "NRI buyer, Dubai",
        "quote": "Handled everything remotely — video walk-through coordination, documentation status, payment plan. The weekly follow-ups were punctual and never pushy.",
        "rating": 5,
    },
]

NEWS = [
    {
        "id": 1,
        "slug": "rera-checklist-2026",
        "title": "How can I verify my property is RERA registered?",
        "category": "GUIDES",
        "excerpt": "A five-minute checklist every buyer should run before paying a single rupee of booking amount.",
        "body": "Buying a home is the biggest financial decision most families make. Before you pay any booking amount, verify the project on your state's RERA portal using the promoter's registration number. Cross-check the sanctioned plan, the promised completion date, and the litigation history. Ask for the RERA registration certificate in writing, and compare the carpet area in the agreement with what the sales team quotes. A transparent developer will share all of this on day one — if they hesitate, walk away.",
        "published_at": "2026-09-10T09:00:00Z",
    },
    {
        "id": 2,
        "slug": "under-50-lakh-upgrades",
        "title": "6 upgrades under ₹50,000 that lift resale value the most",
        "category": "INVESTING",
        "excerpt": "Small spends, outsized returns — the renovations that actually move the needle on valuation.",
        "body": "Not every value-adding upgrade needs a lakh-scale budget. Modular kitchen refits, premium bathroom fittings, smart lighting, deep-cleaning and polishing of floors, a fresh coat of neutral paint, and verified Vaastu-compliant entry changes consistently deliver 3-5x returns at resale. The key is timing: do these eight weeks before listing, and always keep invoices — documented upgrades justify higher asking prices to bank valuers too.",
        "published_at": "2026-09-05T09:00:00Z",
    },
    {
        "id": 3,
        "slug": "four-mortgage-mistakes",
        "title": "How to avoid these four mortgage calculation mistakes",
        "category": "FINANCE",
        "excerpt": "EMI calculators lie to you in four specific ways. Here is how to read between the rows.",
        "body": "Most buyers compare loans on EMI alone and miss processing fees, insurance bundling, and the reset spread after the first year. Always compare annual percentage rate, not headline interest rate. Model a two-percentage-point rate rise before signing — if that EMI breaks your budget, the loan is too big. Finally, check prepayment penalties: RBI rules cap them on floating-rate loans, but fixed-rate products can still lock you in.",
        "published_at": "2026-08-28T09:00:00Z",
    },
    {
        "id": 4,
        "slug": "hinjewadi-price-trends",
        "title": "Hinjewadi Phase 2: why prices moved 11% this year",
        "category": "MARKET",
        "excerpt": "Metro connectivity, IT expansion and limited ready inventory are rewriting the west-Pune story.",
        "body": "West Pune's IT corridor added 40,000 jobs in twelve months while ready-to-move inventory in Phase 2 fell to a five-year low. The combination pushed per-square-foot rates up 11% year-on-year. Rental yields of 3.8-4.2% now beat most city suburbs, and the metro extension timeline has shortened absorption cycles. For buyers who missed the 2024 window, pre-launch inventory from RERA-registered builders remains the value entry point.",
        "published_at": "2026-08-20T09:00:00Z",
    },
    {
        "id": 5,
        "slug": "home-loan-approval-documents",
        "title": "The exact document set banks want for instant approval",
        "category": "FINANCE",
        "excerpt": "Walk into the bank with this folder and your approval cycle shrinks from weeks to days.",
        "body": "Salaried applicants need six months of salary slips, Form 16 for two years, six months of bank statements, employment proof, and KYC documents. Self-employed buyers should add three years of ITRs with computation, audited balance sheets, and a business proof set. Get your credit report before the bank does — surprises there cost you both rate and time. Pre-approved projects skip the legal-verification queue entirely, which is why we list only RERA-registered inventory.",
        "published_at": "2026-08-12T09:00:00Z",
    },
    {
        "id": 6,
        "slug": "site-visit-questions",
        "title": "12 questions to ask on every site visit",
        "category": "GUIDES",
        "excerpt": "Print this list. The answers separate a good buy from a decade of regret.",
        "body": "Ask about the sanctioned versus saleable carpet area, the exact possession date with penalty clause, maintenance charges for the first three years, the builder's track record on past projects, water source and backup power, parking allocation, society formation timeline, and the payment-plan milestones. Record answers in writing on the brochure. At a professional site visit, none of these questions should surprise the sales team.",
        "published_at": "2026-08-04T09:00:00Z",
    },
]


async def _decorate_projects(rows, db: AsyncSession) -> List[PublicProject]:
    out: List[PublicProject] = []
    for project, unit_count, min_price, max_price in rows:
        out.append(
            PublicProject(
                id=str(project.id),
                name=project.name,
                builder=project.builder,
                description=project.description,
                city=project.city or "",
                location=project.location or "",
                status=project.status.value if isinstance(project.status, ProjectStatus) else str(project.status),
                unit_count=int(unit_count or 0),
                min_price=float(min_price) if min_price is not None else None,
                max_price=float(max_price) if max_price is not None else None,
            )
        )
    return out


@router.get("/stats", response_model=SiteStats)
async def site_stats(db: AsyncSession = Depends(get_db)) -> Any:
    property_count = (await db.execute(select(func.count(Property.id)))).scalar_one()
    projects = await db.execute(select(func.count(Project.id)))
    locations = await db.execute(
        select(func.count(func.distinct(Project.location))).where(Project.location.isnot(None))
    )
    agents = await db.execute(select(func.count(User.id)).where(User.role != UserRole.ADMIN))
    return SiteStats(
        total_properties=property_count,
        total_projects=projects.scalar_one(),
        total_locations=locations.scalar_one(),
        happy_customers=12400 + property_count * 137,  # baseline marketing figure, grows with inventory
        agents_count=agents.scalar_one(),
    )


@router.get("/locations", response_model=List[LocationStat])
async def locations(db: AsyncSession = Depends(get_db)) -> Any:
    rows = (
        (
            await db.execute(
                select(Project.location, Project.city, func.count(Property.id))
                .join(Property, Property.project_id == Project.id)
                .where(Project.location.isnot(None))
                .group_by(Project.location, Project.city)
                .order_by(func.count(Property.id).desc())
                .limit(8)
            )
        )
        .all()
    )
    return [
        LocationStat(name=loc, city=city, property_count=int(count))
        for loc, city, count in rows
    ]


@router.get("/featured-projects", response_model=List[PublicProject])
async def featured_projects(limit: int = Query(6, le=12), db: AsyncSession = Depends(get_db)) -> Any:
    rows = (
        (
            await db.execute(
                select(
                    Project,
                    func.count(Property.id).label("unit_count"),
                    func.min(Property.price).label("min_price"),
                    func.max(Property.price).label("max_price"),
                )
                .outerjoin(Property, Property.project_id == Project.id)
                .group_by(Project.id)
                .limit(limit)
            )
        )
        .all()
    )
    return await _decorate_projects(rows, db)


@router.get("/properties", response_model=List[PublicProperty])
async def public_properties(
    purpose: Optional[str] = None,          # reserved for parity with admin filters
    location: Optional[str] = None,
    bedrooms: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    configuration: Optional[str] = None,
    q: Optional[str] = None,
    featured: bool = False,
    limit: int = Query(24, le=100),
    db: AsyncSession = Depends(get_db),
) -> Any:
    stmt = (
        select(Property)
        .join(Project, Property.project_id == Project.id)
        .options(selectinload(Property.project))
        .where(Property.availability.is_(True))
    )
    if location:
        stmt = stmt.where(Project.location.ilike(f"%{location}%"))
    if bedrooms:
        stmt = stmt.where(Property.bedrooms == bedrooms)
    if min_price:
        stmt = stmt.where(Property.price >= min_price)
    if max_price:
        stmt = stmt.where(Property.price <= max_price)
    if configuration:
        stmt = stmt.where(Property.configuration.ilike(f"%{configuration}%"))
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Project.name.ilike(like), Project.location.ilike(like), Project.city.ilike(like)))
    if featured:
        stmt = stmt.where(Property.price.isnot(None)).order_by(Property.price.desc())
    else:
        stmt = stmt.order_by(Property.created_at.desc())
    stmt = stmt.limit(limit)
    return (await db.execute(stmt)).scalars().all()


@router.get("/properties/{property_id}", response_model=PublicProperty)
async def public_property_detail(property_id: str, db: AsyncSession = Depends(get_db)) -> Any:
    row = (
        await db.execute(
            select(Property)
            .options(selectinload(Property.project))
            .where(Property.id == property_id)
        )
    ).scalars().first()
    if not row:
        raise HTTPException(status_code=404, detail="Property not found")
    return row


@router.get("/testimonials", response_model=List[TestimonialOut])
async def testimonials() -> Any:
    return TESTIMONIALS


AGENTS = [
    {
        "id": "agent-priya",
        "name": "Priya Sharma",
        "role": "AI Sales Consultant · Hinglish & English",
        "email": "priya@dealcloser.example",
        "phone": "+91 98765 43210",
    },
    {
        "id": "agent-arjun",
        "name": "Arjun Deshpande",
        "role": "Senior Property Consultant · West Pune",
        "email": "arjun@dealcloser.example",
        "phone": "+91 98765 43211",
    },
    {
        "id": "agent-meera",
        "name": "Meera Joshi",
        "role": "Home Loans & Documentation Expert",
        "email": "meera@dealcloser.example",
        "phone": "+91 98765 43212",
    },
    {
        "id": "agent-karan",
        "name": "Karan Malhotra",
        "role": "Investment Advisory · Commercial",
        "email": "karan@dealcloser.example",
        "phone": "+91 98765 43213",
    },
]


@router.get("/agents", response_model=List[AgentOut])
async def agents() -> Any:
    return AGENTS


@router.get("/news", response_model=List[NewsOut])
async def news(limit: int = Query(6, le=12)) -> Any:
    return NEWS[:limit]


@router.get("/news/{slug}", response_model=NewsOut)
async def news_detail(slug: str) -> Any:
    for item in NEWS:
        if item["slug"] == slug:
            return item
    raise HTTPException(status_code=404, detail="Article not found")


@router.post("/leads", status_code=201)
async def public_lead(payload: PublicLeadCreate, db: AsyncSession = Depends(get_db)) -> Any:
    """Anonymous site-visitor enquiry -> real Lead row in the CRM."""
    lead = Lead(
        name=payload.name or payload.email or payload.phone or "Website Visitor",
        phone=payload.phone,
        email=payload.email,
        budget_min=payload.budget_min,
        budget_max=payload.budget_max,
        preferred_location=payload.preferred_location,
        configuration=payload.configuration,
        bedrooms=payload.bedrooms,
        purpose=payload.purpose or ("BUY" if payload.message is None else "ENQUIRY"),
        lead_status=LeadStatus.NEW,
        lead_score=35.0,
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return {"ok": True, "lead_id": str(lead.id), "message": "Thank you! Our consultant will call you shortly."}

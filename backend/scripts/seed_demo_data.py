"""Seed the CRM with demo data so the Priya voice agent has inventory to pitch.

Idempotent: projects/properties are keyed by name and re-run safely.

Usage (from repo root or backend/):
    backend/venv/Scripts/python.exe backend/scripts/seed_demo_data.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
sys.path[:0] = [str(ROOT), str(BACKEND)]

from backend.app.db.session import AsyncSessionLocal, engine_async  # noqa: E402
from backend.app.models.base import Base  # noqa: E402
from backend.app.models.crm import Call, CallDirection, CallStatus, Lead, LeadStatus  # noqa: E402
from backend.app.models.project import Project, Property  # noqa: E402
from backend.app.models.user import User  # noqa: E402  # noqa: F401 (register table)

PROJECTS: list[dict] = [
    {
        "name": "Skyline Heights",
        "builder": "Meridian Developers",
        "city": "Pune",
        "location": "Hinjewadi Phase 2",
        "status": "UNDER_CONSTRUCTION",
        "description": "Premium towers near the IT park with clubhouse, podium garden and sky lounge. Possession Dec 2026.",
        "properties": [
            # unit, config, bed, bath, carpet, builtup, floor, facing, price(lakh), available, amenities
            ("A-201", "2 BHK", 2, 2, 720, 890, 2, "East", 62.5, True,
             ["clubhouse", "swimming pool", "gym", "kids play area", "24x7 security"]),
            ("A-302", "2 BHK", 2, 2, 745, 920, 3, "East", 66.0, True,
             ["clubhouse", "swimming pool", "gym", "24x7 security"]),
            ("A-401", "3 BHK", 3, 3, 1050, 1290, 4, "North-East", 88.0, True,
             ["clubhouse", "swimming pool", "gym", "sky lounge", "24x7 security"]),
            ("B-101", "3 BHK", 3, 3, 1085, 1330, 1, "North", 84.5, True,
             ["podium garden", "gym", "kids play area", "24x7 security"]),
            ("B-502", "3 BHK", 3, 3, 1085, 1330, 5, "North", 92.0, False,
             ["podium garden", "gym", "sky lounge", "24x7 security"]),
        ],
    },
    {
        "name": "Green Valley Residences",
        "builder": "Sanjivani Buildcon",
        "city": "Pune",
        "location": "Wakad",
        "status": "READY_TO_MOVE",
        "description": "Ready-to-move homes next to the Wakad-Hinjewadi bridge, walking distance from Xion Mall.",
        "properties": [
            ("C-102", "1 BHK", 1, 1, 420, 530, 1, "West", 38.0, True,
             ["garden", "gym", "security"]),
            ("C-204", "2 BHK", 2, 2, 680, 840, 2, "South-East", 55.0, True,
             ["garden", "gym", "community hall", "security"]),
            ("C-301", "2 BHK", 2, 2, 680, 840, 3, "South-East", 57.5, True,
             ["garden", "gym", "community hall", "security"]),
            ("D-402", "4 BHK", 4, 4, 1620, 1980, 4, "North-East", 145.0, True,
             ["private deck", "clubhouse", "pool", "gym", "concierge"]),
        ],
    },
    {
        "name": "Lakeview Enclave",
        "builder": "Kohinoor Group",
        "city": "Pune",
        "location": "Baner",
        "status": "PRE_LAUNCH",
        "description": "Pre-launch riverside project with only 90 units. Pre-launch pricing valid this quarter.",
        "properties": [
            ("E-101", "2 BHK", 2, 2, 750, 930, 1, "Lake facing", 71.0, True,
             ["lake view deck", "clubhouse", "pool", "gym"]),
            ("E-202", "2 BHK", 2, 2, 750, 930, 2, "Lake facing", 74.5, True,
             ["lake view deck", "clubhouse", "pool", "gym"]),
            ("E-303", "3 BHK", 3, 3, 1120, 1370, 3, "Lake facing", 97.0, True,
             ["lake view deck", "clubhouse", "pool", "gym", "ev charging"]),
        ],
    },
]

DEMO_LEADS = [
    {
        "name": "Rohit Verma",
        "phone": "9822011223",
        "email": "rohit.verma@example.com",
        "budget_min": 5_000_000,
        "budget_max": 7_000_000,
        "preferred_location": "Hinjewadi",
        "configuration": "2 BHK",
        "bedrooms": 2,
        "purpose": "self-use",
        "buying_timeline": "3 months",
        "financing_required": True,
        "lead_score": 75,
        "lead_status": LeadStatus.QUALIFIED,
    },
    {
        "name": "Priya Nair",
        "phone": "9845098450",
        "email": None,
        "budget_min": 12_000_000,
        "budget_max": 15_000_000,
        "preferred_location": "Baner",
        "configuration": "3 BHK",
        "bedrooms": 3,
        "purpose": "investment",
        "buying_timeline": "immediate",
        "financing_required": False,
        "lead_score": 60,
        "lead_status": LeadStatus.NEW,
    },
]


async def seed() -> None:
    async with engine_async.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        projects_created = 0
        properties_created = 0

        for spec in PROJECTS:
            exists = (
                await db.execute(
                    Project.__table__.select().where(Project.name == spec["name"])
                )
            ).first()
            if exists:
                print(f"project '{spec['name']}' already seeded — skipping")
                continue

            project = Project(
                name=spec["name"],
                builder=spec["builder"],
                city=spec["city"],
                location=spec["location"],
                status=spec["status"],
                description=spec["description"],
            )
            db.add(project)
            await db.flush()

            for (unit, config, beds, baths, carpet, builtup, floor, facing,
                 price_lakh, available, amenities) in spec["properties"]:
                db.add(Property(
                    project_id=project.id,
                    unit_number=unit,
                    configuration=config,
                    bedrooms=beds,
                    bathrooms=baths,
                    carpet_area=carpet,
                    built_up_area=builtup,
                    floor=floor,
                    facing=facing,
                    price=price_lakh * 1e5,
                    availability=available,
                    amenities=amenities,
                ))
                properties_created += 1
            projects_created += 1
            print(f"seeded project '{spec['name']}' with {len(spec['properties'])} properties")

        for spec in DEMO_LEADS:
            exists = (
                await db.execute(Lead.__table__.select().where(Lead.phone == spec["phone"]))
            ).first()
            if exists:
                print(f"lead '{spec['name']}' already seeded — skipping")
                continue
            db.add(Lead(**spec))
            print(f"seeded lead '{spec['name']}'")

        # one historical completed call for the dashboard/CRM to show
        call_exists = (
            await db.execute(Call.__table__.select().where(Call.call_id == "seed:demo-call-001"))
        ).first()
        if not call_exists:
            lead_row = (
                await db.execute(Lead.__table__.select().where(Lead.phone == "9822011223"))
            ).first()
            db.add(Call(
                lead_id=lead_row._mapping["id"] if lead_row else None,
                call_id="seed:demo-call-001",
                direction=CallDirection.INBOUND,
                status=CallStatus.COMPLETED,
                duration=214,
                summary="Demo seeded call: buyer asked about 2 BHK in Hinjewadi, site visit follow-up pending.",
            ))
            print("seeded demo call 'seed:demo-call-001'")

        await db.commit()
        print(f"\nDone: +{projects_created} projects, +{properties_created} properties.")


if __name__ == "__main__":
    asyncio.run(seed())

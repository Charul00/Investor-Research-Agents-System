from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.audit_log import AuditLog
from app.models.enums import InviteStatus, MembershipRole, MembershipStatus, ReportStatus
from app.models.invite import Invite
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.report import Report
from app.models.user import User
from app.models.watchlist import WatchlistItem
from app.services.organizations import create_organization_record

DEMO_PASSWORD = "DemoPass123"


def get_or_create_user(
    db: Session,
    full_name: str,
    email: str,
    legacy_email: str | None = None,
) -> User:
    user = db.execute(select(User).where(User.email == email.lower())).scalar_one_or_none()
    if user is not None:
        return user

    if legacy_email:
        user = db.execute(
            select(User).where(User.email == legacy_email.lower())
        ).scalar_one_or_none()
        if user is not None:
            user.email = email.lower()
            user.full_name = full_name
            user.password_hash = hash_password(DEMO_PASSWORD)
            return user

    user = User(
        full_name=full_name,
        email=email.lower(),
        password_hash=hash_password(DEMO_PASSWORD),
    )
    db.add(user)
    db.flush()
    return user


def get_or_create_organization(db: Session, name: str, admin_user: User) -> Organization:
    existing = (
        db.execute(select(Organization).where(Organization.name == name)).scalar_one_or_none()
    )
    if existing is not None:
        return existing

    return create_organization_record(db, name, created_by_user_id=admin_user.id)


def ensure_membership(
    db: Session,
    organization: Organization,
    user: User,
    role: MembershipRole,
) -> Membership:
    membership = db.execute(
        select(Membership).where(
            Membership.organization_id == organization.id,
            Membership.user_id == user.id,
        )
    ).scalar_one_or_none()
    if membership is not None:
        membership.role = role
        membership.status = MembershipStatus.ACTIVE
        return membership

    membership = Membership(
        organization_id=organization.id,
        user_id=user.id,
        role=role,
        status=MembershipStatus.ACTIVE,
    )
    db.add(membership)
    db.flush()
    return membership


def ensure_report(
    db: Session,
    organization: Organization,
    author: User,
    title: str,
    query_text: str,
    summary: str,
    status: ReportStatus,
    tags: list[str],
) -> Report:
    report = db.execute(
        select(Report).where(
            Report.organization_id == organization.id,
            Report.title == title,
        )
    ).scalar_one_or_none()
    if report is not None:
        report.query_text = query_text
        report.summary = summary
        report.status = status
        report.tags = tags
        return report

    report = Report(
        organization_id=organization.id,
        author_id=author.id,
        title=title,
        query_text=query_text,
        summary=summary,
        status=status,
        tags=tags,
    )
    db.add(report)
    db.flush()
    return report


def ensure_watchlist_item(
    db: Session,
    organization: Organization,
    user: User,
    symbol: str,
    company_name: str,
    notes: str,
) -> WatchlistItem:
    item = db.execute(
        select(WatchlistItem).where(
            WatchlistItem.organization_id == organization.id,
            WatchlistItem.symbol == symbol,
        )
    ).scalar_one_or_none()
    if item is not None:
        item.company_name = company_name
        item.notes = notes
        return item

    item = WatchlistItem(
        organization_id=organization.id,
        added_by_user_id=user.id,
        symbol=symbol,
        company_name=company_name,
        notes=notes,
    )
    db.add(item)
    db.flush()
    return item


def ensure_invite(
    db: Session,
    organization: Organization,
    created_by: User,
    code: str,
    role: MembershipRole,
) -> Invite:
    invite = db.execute(select(Invite).where(Invite.code == code)).scalar_one_or_none()
    if invite is not None:
        invite.organization_id = organization.id
        invite.created_by_user_id = created_by.id
        invite.role = role
        invite.status = InviteStatus.PENDING
        invite.expires_at = datetime.now(UTC) + timedelta(days=14)
        return invite

    invite = Invite(
        organization_id=organization.id,
        created_by_user_id=created_by.id,
        code=code,
        role=role,
        status=InviteStatus.PENDING,
        expires_at=datetime.now(UTC) + timedelta(days=14),
    )
    db.add(invite)
    db.flush()
    return invite


def record_audit(
    db: Session,
    organization: Organization,
    actor: User,
    action: str,
    entity_type: str,
    entity_id: str,
    payload: dict,
) -> None:
    exists = db.execute(
        select(AuditLog.id).where(
            AuditLog.organization_id == organization.id,
            AuditLog.action == action,
            AuditLog.entity_type == entity_type,
            AuditLog.entity_id == entity_id,
        )
    ).first()
    if exists:
        return

    db.add(
        AuditLog(
            organization_id=organization.id,
            actor_user_id=actor.id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            payload=payload,
        )
    )


def seed() -> None:
    db = SessionLocal()
    try:
        northstar_admin = get_or_create_user(
            db,
            "Aarav Mehta",
            "admin@northstar.com",
            legacy_email="admin@northstar.test",
        )
        northstar_analyst = get_or_create_user(
            db,
            "Maya Iyer",
            "analyst@northstar.com",
            legacy_email="analyst@northstar.test",
        )
        eastbridge_admin = get_or_create_user(
            db,
            "Rohan Shah",
            "admin@eastbridge.com",
            legacy_email="admin@eastbridge.test",
        )
        northstar_associate = get_or_create_user(
            db,
            "Isha Kapoor",
            "associate@northstar.com",
        )
        northstar_pm = get_or_create_user(
            db,
            "Dev Rao",
            "pm@northstar.com",
        )
        eastbridge_analyst = get_or_create_user(
            db,
            "Leah Fernandes",
            "analyst@eastbridge.com",
        )
        eastbridge_intern = get_or_create_user(
            db,
            "Kabir Sethi",
            "intern@eastbridge.com",
        )
        helios_admin = get_or_create_user(
            db,
            "Naina Varma",
            "admin@helios.com",
        )
        helios_analyst = get_or_create_user(
            db,
            "Omar Khan",
            "analyst@helios.com",
        )
        cedar_admin = get_or_create_user(
            db,
            "Sara Williams",
            "admin@cedarridge.com",
        )
        cedar_analyst = get_or_create_user(
            db,
            "Ethan Brooks",
            "analyst@cedarridge.com",
        )
        multi_org_analyst = get_or_create_user(
            db,
            "Priya Nair",
            "multi@research.demo",
        )

        northstar = get_or_create_organization(db, "Northstar Capital", northstar_admin)
        eastbridge = get_or_create_organization(db, "Eastbridge Research", eastbridge_admin)
        helios = get_or_create_organization(db, "Helios Asset Management", helios_admin)
        cedar = get_or_create_organization(db, "Cedar Ridge Partners", cedar_admin)

        ensure_membership(db, northstar, northstar_admin, MembershipRole.ADMIN)
        ensure_membership(db, northstar, northstar_analyst, MembershipRole.ANALYST)
        ensure_membership(db, northstar, northstar_associate, MembershipRole.ANALYST)
        ensure_membership(db, northstar, northstar_pm, MembershipRole.ADMIN)
        ensure_membership(db, northstar, multi_org_analyst, MembershipRole.ANALYST)
        ensure_membership(db, eastbridge, eastbridge_admin, MembershipRole.ADMIN)
        ensure_membership(db, eastbridge, eastbridge_analyst, MembershipRole.ANALYST)
        ensure_membership(db, eastbridge, eastbridge_intern, MembershipRole.ANALYST)
        ensure_membership(db, eastbridge, multi_org_analyst, MembershipRole.ANALYST)
        ensure_membership(db, helios, helios_admin, MembershipRole.ADMIN)
        ensure_membership(db, helios, helios_analyst, MembershipRole.ANALYST)
        ensure_membership(db, cedar, cedar_admin, MembershipRole.ADMIN)
        ensure_membership(db, cedar, cedar_analyst, MembershipRole.ANALYST)

        reports = [
            ensure_report(
                db,
                northstar,
                northstar_admin,
                "NVIDIA Q3 Earnings Deep Dive",
                "Analyze NVIDIA's Q3 earnings, compare revenue growth with AMD and Intel, "
                "and summarize competitive risks.",
                "Revenue momentum remains strong, but valuation sensitivity and supply "
                "constraints need monitoring.",
                ReportStatus.COMPLETE,
                ["earnings", "semis", "ai"],
            ),
            ensure_report(
                db,
                northstar,
                northstar_analyst,
                "Tesla 30-Day Market Brief",
                "Review Tesla's stock performance this quarter, recent news, and key "
                "operating risks.",
                "Recent headlines are mixed, with margin pressure offset by delivery "
                "stabilization.",
                ReportStatus.DRAFT,
                ["autos", "ev", "risk"],
            ),
            ensure_report(
                db,
                northstar,
                northstar_admin,
                "Bank Capital Position Comparison",
                "Compare JPMorgan, Goldman Sachs, and Morgan Stanley balance sheet strength.",
                "JPMorgan screens strongest on scale and capital flexibility.",
                ReportStatus.COMPLETE,
                ["banks", "balance-sheet"],
            ),
            ensure_report(
                db,
                northstar,
                northstar_associate,
                "AMD AI Accelerator Watch",
                "Compare AMD's AI accelerator positioning against NVIDIA and Intel.",
                "AMD has credible accelerator momentum, but software ecosystem depth remains "
                "the key gap versus NVIDIA.",
                ReportStatus.COMPLETE,
                ["semis", "ai", "competitors"],
            ),
            ensure_report(
                db,
                northstar,
                northstar_pm,
                "Microsoft Cloud AI Spend Review",
                "Assess Microsoft's AI infrastructure spending and cloud revenue durability.",
                "Azure AI demand supports growth, while capex intensity is the main margin "
                "trade-off to monitor.",
                ReportStatus.DRAFT,
                ["cloud", "ai", "capex"],
            ),
            ensure_report(
                db,
                northstar,
                multi_org_analyst,
                "Intel Foundry Turnaround Monitor",
                "Track Intel foundry execution, margin pressure, and AI PC demand signals.",
                "Foundry progress is improving, but investor confidence still depends on "
                "manufacturing milestones.",
                ReportStatus.FAILED,
                ["semis", "foundry", "turnaround"],
            ),
            ensure_report(
                db,
                eastbridge,
                eastbridge_admin,
                "Apple Services Revenue Watch",
                "Summarize Apple's services growth trajectory and hardware demand risks.",
                "Services durability remains the core support for multiple expansion.",
                ReportStatus.COMPLETE,
                ["apple", "consumer-tech"],
            ),
            ensure_report(
                db,
                eastbridge,
                eastbridge_analyst,
                "Amazon Retail Margin Brief",
                "Review Amazon retail margin trends, AWS growth, and recent news sentiment.",
                "AWS stabilization and retail efficiency support earnings quality, but "
                "consumer demand needs monitoring.",
                ReportStatus.COMPLETE,
                ["amazon", "cloud", "retail"],
            ),
            ensure_report(
                db,
                eastbridge,
                eastbridge_intern,
                "Meta AI Capex Risk Note",
                "Summarize Meta's AI capex plans, ad revenue trends, and valuation risks.",
                "Ad momentum remains solid, while AI infrastructure spending is the key "
                "investor debate.",
                ReportStatus.DRAFT,
                ["meta", "ads", "ai"],
            ),
            ensure_report(
                db,
                eastbridge,
                multi_org_analyst,
                "Alphabet Search AI Pressure",
                "Analyze Alphabet search monetization risk from generative AI products.",
                "Alphabet remains highly cash-generative, but AI search behavior creates "
                "long-term monetization uncertainty.",
                ReportStatus.COMPLETE,
                ["alphabet", "search", "ai"],
            ),
            ensure_report(
                db,
                helios,
                helios_admin,
                "Semiconductor Basket Weekly",
                "Compare NVIDIA, AMD, Intel, and Broadcom sentiment for the weekly IC memo.",
                "AI infrastructure leaders remain favored, while cyclical names need clearer "
                "margin recovery evidence.",
                ReportStatus.COMPLETE,
                ["semis", "weekly", "basket"],
            ),
            ensure_report(
                db,
                helios,
                helios_analyst,
                "Tesla Demand Pulse",
                "Analyze Tesla delivery trends, EV pricing pressure, and margin risks.",
                "Demand signals are mixed, and price cuts remain the clearest risk to "
                "near-term gross margin.",
                ReportStatus.DRAFT,
                ["tesla", "ev", "demand"],
            ),
            ensure_report(
                db,
                helios,
                helios_admin,
                "Bank Capital Stress Notes",
                "Compare JPMorgan, Goldman Sachs, and Morgan Stanley capital resilience.",
                "JPMorgan has the strongest scale advantage, while Goldman has higher "
                "capital markets cyclicality.",
                ReportStatus.COMPLETE,
                ["banks", "capital", "risk"],
            ),
            ensure_report(
                db,
                cedar,
                cedar_admin,
                "Consumer Tech Valuation Screen",
                "Rank Apple, Amazon, Meta, and Alphabet on valuation and earnings durability.",
                "Apple and Microsoft-style quality names screen defensively, while platform "
                "AI capex remains a valuation swing factor.",
                ReportStatus.COMPLETE,
                ["consumer-tech", "valuation"],
            ),
            ensure_report(
                db,
                cedar,
                cedar_analyst,
                "Morgan Stanley Wealth Unit Brief",
                "Assess Morgan Stanley wealth management stability and capital market exposure.",
                "Wealth management supports recurring revenue, but trading and banking cycles "
                "still influence earnings volatility.",
                ReportStatus.DRAFT,
                ["banks", "wealth", "morgan-stanley"],
            ),
            ensure_report(
                db,
                cedar,
                cedar_admin,
                "JPMorgan Credit Quality Watch",
                "Track JPMorgan credit trends, deposit costs, and regulatory capital risk.",
                "Credit quality remains manageable, but deposit beta and capital rules are "
                "important watch items.",
                ReportStatus.COMPLETE,
                ["jpm", "credit", "capital"],
            ),
        ]

        watchlist_items = [
            ensure_watchlist_item(
                db,
                northstar,
                northstar_admin,
                "NVDA",
                "NVIDIA Corporation",
                "Primary AI infrastructure coverage name.",
            ),
            ensure_watchlist_item(
                db,
                northstar,
                northstar_analyst,
                "TSLA",
                "Tesla, Inc.",
                "Track delivery data, margin commentary, and regulatory headlines.",
            ),
            ensure_watchlist_item(
                db,
                northstar,
                northstar_admin,
                "JPM",
                "JPMorgan Chase & Co.",
                "Use for bank capital comparison demos.",
            ),
            ensure_watchlist_item(
                db,
                northstar,
                northstar_associate,
                "AMD",
                "Advanced Micro Devices, Inc.",
                "AI accelerator and EPYC server CPU coverage.",
            ),
            ensure_watchlist_item(
                db,
                northstar,
                northstar_pm,
                "INTC",
                "Intel Corporation",
                "Foundry execution and AI PC turnaround watch.",
            ),
            ensure_watchlist_item(
                db,
                northstar,
                multi_org_analyst,
                "MSFT",
                "Microsoft Corporation",
                "Azure AI demand, capex, and cloud margin sensitivity.",
            ),
            ensure_watchlist_item(
                db,
                eastbridge,
                eastbridge_admin,
                "AAPL",
                "Apple Inc.",
                "Services growth and China demand sensitivity.",
            ),
            ensure_watchlist_item(
                db,
                eastbridge,
                eastbridge_analyst,
                "AMZN",
                "Amazon.com, Inc.",
                "AWS growth and retail margin efficiency.",
            ),
            ensure_watchlist_item(
                db,
                eastbridge,
                eastbridge_intern,
                "META",
                "Meta Platforms, Inc.",
                "Ad growth, AI capex, and Reality Labs losses.",
            ),
            ensure_watchlist_item(
                db,
                eastbridge,
                multi_org_analyst,
                "GOOGL",
                "Alphabet Inc.",
                "Search AI disruption and cloud profitability.",
            ),
            ensure_watchlist_item(
                db,
                helios,
                helios_admin,
                "NVDA",
                "NVIDIA Corporation",
                "AI infrastructure leader for semis basket.",
            ),
            ensure_watchlist_item(
                db,
                helios,
                helios_analyst,
                "AMD",
                "Advanced Micro Devices, Inc.",
                "Second-source AI accelerator thesis.",
            ),
            ensure_watchlist_item(
                db,
                helios,
                helios_admin,
                "INTC",
                "Intel Corporation",
                "Foundry and data center recovery watch.",
            ),
            ensure_watchlist_item(
                db,
                helios,
                helios_analyst,
                "TSLA",
                "Tesla, Inc.",
                "EV demand pulse and margin sensitivity.",
            ),
            ensure_watchlist_item(
                db,
                cedar,
                cedar_admin,
                "JPM",
                "JPMorgan Chase & Co.",
                "Capital strength and credit quality anchor.",
            ),
            ensure_watchlist_item(
                db,
                cedar,
                cedar_analyst,
                "GS",
                "Goldman Sachs Group, Inc.",
                "Capital markets cycle and risk-weighted assets.",
            ),
            ensure_watchlist_item(
                db,
                cedar,
                cedar_admin,
                "MS",
                "Morgan Stanley",
                "Wealth management franchise stability.",
            ),
            ensure_watchlist_item(
                db,
                cedar,
                cedar_analyst,
                "AAPL",
                "Apple Inc.",
                "Defensive consumer tech and services durability.",
            ),
        ]

        ensure_invite(db, northstar, northstar_admin, "NORTHSTAR1", MembershipRole.ANALYST)
        ensure_invite(db, eastbridge, eastbridge_admin, "EASTBRIDGE1", MembershipRole.ANALYST)
        ensure_invite(db, helios, helios_admin, "HELIOS1", MembershipRole.ANALYST)
        ensure_invite(db, cedar, cedar_admin, "CEDAR1", MembershipRole.ANALYST)

        for report in reports:
            organization = northstar if report.organization_id == northstar.id else eastbridge
            actor = northstar_admin if organization.id == northstar.id else eastbridge_admin
            record_audit(
                db,
                organization,
                actor,
                "demo.report.seeded",
                "report",
                str(report.id),
                {"title": report.title},
            )

        for item in watchlist_items:
            organization = northstar if item.organization_id == northstar.id else eastbridge
            actor = northstar_admin if organization.id == northstar.id else eastbridge_admin
            record_audit(
                db,
                organization,
                actor,
                "demo.watchlist.seeded",
                "watchlist_item",
                str(item.id),
                {"symbol": item.symbol},
            )

        db.commit()
        print("Demo data seeded successfully.")
        print("Northstar admin: admin@northstar.com / DemoPass123")
        print("Northstar analyst: analyst@northstar.com / DemoPass123")
        print("Eastbridge admin: admin@eastbridge.com / DemoPass123")
        print("Eastbridge analyst: analyst@eastbridge.com / DemoPass123")
        print("Helios admin: admin@helios.com / DemoPass123")
        print("Helios analyst: analyst@helios.com / DemoPass123")
        print("Cedar Ridge admin: admin@cedarridge.com / DemoPass123")
        print("Cedar Ridge analyst: analyst@cedarridge.com / DemoPass123")
        print("Multi-org analyst: multi@research.demo / DemoPass123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()

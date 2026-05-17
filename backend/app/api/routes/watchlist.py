from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select

from app.api.deps import DbSession, get_current_membership
from app.core.errors import api_error
from app.models.audit_log import AuditLog
from app.models.membership import Membership
from app.models.watchlist import WatchlistItem
from app.schemas.watchlist import (
    WatchlistCreateRequest,
    WatchlistItemResponse,
    WatchlistListResponse,
    WatchlistUpdateRequest,
)

router = APIRouter()


def normalize_symbol(symbol: str) -> str:
    return symbol.strip().upper()


def serialize_watchlist_item(item: WatchlistItem) -> WatchlistItemResponse:
    return WatchlistItemResponse(
        id=item.id,
        organization_id=item.organization_id,
        added_by_user_id=item.added_by_user_id,
        symbol=item.symbol,
        company_name=item.company_name,
        notes=item.notes,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def get_watchlist_item_or_404(
    db: DbSession,
    item_id: UUID,
    organization_id: UUID,
) -> WatchlistItem:
    statement = select(WatchlistItem).where(
        WatchlistItem.id == item_id,
        WatchlistItem.organization_id == organization_id,
    )
    item = db.execute(statement).scalar_one_or_none()
    if item is None:
        raise api_error(
            status_code=status.HTTP_404_NOT_FOUND,
            code="watchlist_item_not_found",
            message="Watchlist item not found.",
        )
    return item


@router.get("", response_model=WatchlistListResponse)
def list_watchlist(
    membership: Annotated[Membership, Depends(get_current_membership)],
    db: DbSession,
) -> WatchlistListResponse:
    statement = (
        select(WatchlistItem)
        .where(WatchlistItem.organization_id == membership.organization_id)
        .order_by(WatchlistItem.created_at.desc())
    )
    items = list(db.execute(statement).scalars())
    return WatchlistListResponse(items=[serialize_watchlist_item(item) for item in items])


@router.post("", response_model=WatchlistItemResponse, status_code=status.HTTP_201_CREATED)
def create_watchlist_item(
    payload: WatchlistCreateRequest,
    membership: Annotated[Membership, Depends(get_current_membership)],
    db: DbSession,
) -> WatchlistItemResponse:
    symbol = normalize_symbol(payload.symbol)
    existing = db.execute(
        select(WatchlistItem).where(
            WatchlistItem.organization_id == membership.organization_id,
            WatchlistItem.symbol == symbol,
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="watchlist_symbol_exists",
            message="This symbol is already in the watchlist.",
        )

    item = WatchlistItem(
        organization_id=membership.organization_id,
        added_by_user_id=membership.user_id,
        symbol=symbol,
        company_name=payload.company_name.strip(),
        notes=payload.notes.strip() if payload.notes else None,
    )
    db.add(item)
    db.flush()
    db.add(
        AuditLog(
            organization_id=membership.organization_id,
            actor_user_id=membership.user_id,
            action="watchlist.created",
            entity_type="watchlist_item",
            entity_id=str(item.id),
            payload={"symbol": item.symbol, "company_name": item.company_name},
        )
    )
    db.commit()
    db.refresh(item)
    return serialize_watchlist_item(item)


@router.patch("/{item_id}", response_model=WatchlistItemResponse)
def update_watchlist_item(
    item_id: UUID,
    payload: WatchlistUpdateRequest,
    membership: Annotated[Membership, Depends(get_current_membership)],
    db: DbSession,
) -> WatchlistItemResponse:
    item = get_watchlist_item_or_404(db, item_id, membership.organization_id)

    if payload.company_name is not None:
        item.company_name = payload.company_name.strip()
    if payload.notes is not None:
        item.notes = payload.notes.strip() or None

    db.add(
        AuditLog(
            organization_id=membership.organization_id,
            actor_user_id=membership.user_id,
            action="watchlist.updated",
            entity_type="watchlist_item",
            entity_id=str(item.id),
            payload={"symbol": item.symbol, "company_name": item.company_name},
        )
    )
    db.commit()
    db.refresh(item)
    return serialize_watchlist_item(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_watchlist_item(
    item_id: UUID,
    membership: Annotated[Membership, Depends(get_current_membership)],
    db: DbSession,
) -> Response:
    item = get_watchlist_item_or_404(db, item_id, membership.organization_id)
    db.add(
        AuditLog(
            organization_id=membership.organization_id,
            actor_user_id=membership.user_id,
            action="watchlist.deleted",
            entity_type="watchlist_item",
            entity_id=str(item.id),
            payload={"symbol": item.symbol},
        )
    )
    db.delete(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

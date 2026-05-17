from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_membership
from app.core.errors import api_error
from app.models.membership import Membership
from app.schemas.research import ResearchQueryRequest, ResearchResponse
from app.services.research import run_research

router = APIRouter()


@router.post("", response_model=ResearchResponse)
async def create_research(
    payload: ResearchQueryRequest,
    membership: Annotated[Membership, Depends(get_current_membership)],
) -> ResearchResponse:
    try:
        return await run_research(payload.query.strip())
    except Exception as exc:
        raise api_error(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="research_engine_unavailable",
            message="Research engine is temporarily unavailable. Please try again in a moment.",
        ) from exc

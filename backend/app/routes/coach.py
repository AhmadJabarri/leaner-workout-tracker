"""Authenticated endpoint for asking questions about saved workout history."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models import User
from app.rate_limit import coach_limiter
from app.schemas.coach import CoachAnswer, CoachInput
from app.services.coach import (
    LOOKBACK_WEEKS,
    CoachNotConfiguredError,
    answer_workout_question,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/coach", tags=["AI Coach"])


@router.post("/ask", response_model=CoachAnswer, summary="Ask about your workout progress")
def ask_coach(
    payload: CoachInput,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CoachAnswer:
    """Use only the signed-in user's workout context to generate an explanation."""
    limit_key = str(user.id)
    coach_limiter.check(limit_key, "You've asked the Coach a lot this hour. Try again later.")
    # Count before calling Groq, since failed provider calls can still cost quota.
    coach_limiter.hit(limit_key)
    try:
        answer, sessions_analyzed = answer_workout_question(db, user, payload.question)
    except CoachNotConfiguredError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI Coach is not configured yet.",
        ) from error
    except RuntimeError as error:
        logger.exception("AI Coach returned an unusable response.")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI Coach could not produce an answer. Please try again.",
        ) from error
    except Exception as error:
        # Provider diagnostics stay in server logs; keys and internal errors aren't returned.
        logger.exception("AI Coach provider request failed.")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI Coach is temporarily unavailable. Please try again.",
        ) from error

    return CoachAnswer(
        answer=answer,
        lookback_weeks=LOOKBACK_WEEKS,
        sessions_analyzed=sessions_analyzed,
    )

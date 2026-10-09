"""Read and update the signed-in user's profile."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models import User, UserProfile
from app.schemas.profile import ProfileRead, ProfileUpdate, default_protein_target_g

router = APIRouter(prefix="/api/profile", tags=["Profile"])


def _to_read(profile: UserProfile | None) -> ProfileRead:
    if profile is None:
        return ProfileRead()
    result = ProfileRead.model_validate(profile)
    result.effective_protein_target_g = profile.protein_target_g or default_protein_target_g(
        profile.body_weight_kg, profile.goal
    )
    return result


@router.get("", response_model=ProfileRead, summary="Get your profile")
def get_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProfileRead:
    return _to_read(db.get(UserProfile, user.id))


@router.put("", response_model=ProfileRead, summary="Replace your profile")
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProfileRead:
    profile = db.get(UserProfile, user.id)
    if profile is None:
        profile = UserProfile(user_id=user.id)
        db.add(profile)

    profile.body_weight_kg = payload.body_weight_kg
    profile.height_cm = payload.height_cm
    profile.age = payload.age
    profile.goal = payload.goal.value if payload.goal else None
    profile.protein_target_g = payload.protein_target_g
    profile.coach_notes = payload.coach_notes or None
    db.commit()
    db.refresh(profile)
    return _to_read(profile)

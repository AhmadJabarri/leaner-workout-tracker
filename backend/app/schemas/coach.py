"""Request and response shapes for the authenticated AI Coach endpoint."""

from pydantic import BaseModel, ConfigDict, Field


class CoachInput(BaseModel):
    """A question from the signed-in user; extra client fields are rejected."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    question: str = Field(min_length=1, max_length=1000)


class CoachAnswer(BaseModel):
    """The model's explanation plus metadata showing how much history was used."""

    answer: str
    lookback_weeks: int = Field(serialization_alias="lookbackWeeks")
    sessions_analyzed: int = Field(serialization_alias="sessionsAnalyzed")

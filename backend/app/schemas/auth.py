"""Input and output shapes for account registration.

The request accepts a password only to hash it on the server. The response
deliberately contains public account details only, never the password hash.
"""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator


class SignUpRequest(BaseModel):
    """Validated details needed to create a new account."""

    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=3, max_length=32, pattern=r"^[a-z0-9_]+$")
    password: SecretStr = Field(min_length=3, max_length=128)

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, value: object) -> object:
        """Trim and lowercase usernames so account matching ignores case."""
        return value.strip().lower() if isinstance(value, str) else value


class SignInRequest(BaseModel):
    """Credentials used to verify an existing account."""

    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=3, max_length=32, pattern=r"^[a-z0-9_]+$")
    password: SecretStr = Field(max_length=128)

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, value: object) -> object:
        """Normalize username casing the same way as sign-up."""
        return value.strip().lower() if isinstance(value, str) else value


class UserRead(BaseModel):
    """Safe account fields returned to the browser after authentication."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str

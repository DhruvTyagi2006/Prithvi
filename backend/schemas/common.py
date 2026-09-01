"""
Shared response shapes all three backend developers should reuse so error
handling looks the same across every router, regardless of who owns it.
"""
from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    """Standard error body returned by every endpoint in this API."""

    detail: str = Field(..., description="Human-readable error message.")

    model_config = {
        "json_schema_extra": {
            "examples": [{"detail": "Location 'loc-099' not found."}]
        }
    }

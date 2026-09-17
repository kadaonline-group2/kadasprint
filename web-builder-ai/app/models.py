from pydantic import BaseModel, Field
from typing import Literal


class GenerateRequest(BaseModel):
    businessDescription: str = Field(
        ..., min_length=10, max_length=4000, description="Deskripsi bisnis dalam bahasa Indonesia"
    )
    schemaVersion: Literal["1.1"]


class ReviseRequest(BaseModel):
    currentState: dict = Field(..., description="WebsiteState saat ini")
    instruction: str = Field(..., min_length=1, description="Instruksi revisi dari pengguna")
    schemaVersion: Literal["1.1"]

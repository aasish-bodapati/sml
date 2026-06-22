from sqlmodel import SQLModel, Field, text
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import List
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB

class WardrobeItem(SQLModel, table=True):
    __tablename__ = "wardrobe_item"

    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    name: str
    category: str
    color: str
    brand: str | None = Field(default=None)
    notes: str | None = Field(default=None)
    photo_url: str | None = Field(default=None)
    # JSON array of descriptive tags (e.g. ["slim fit", "casual", "cotton", "summer"])
    tags: list | None = Field(default=None, sa_column=Column(JSONB, nullable=True))
    times_worn: int = Field(default=0)
    last_worn: datetime | None = Field(default=None)
    added_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"server_default": text("TIMEZONE('utc', now())")}
    )

class WardrobeItemRequest(BaseModel):
    name: str
    category: str
    color: str
    brand: str | None = None
    notes: str | None = None
    photo_url: str | None = None
    tags: List[str] | None = None

class WardrobeItemResponse(BaseModel):
    id: int
    user_id: str
    name: str
    category: str
    color: str
    brand: str | None = None
    notes: str | None = None
    photo_url: str | None = None
    tags: List[str] | None = None
    times_worn: int
    last_worn: datetime | None = None
    added_at: datetime

    class Config:
        from_attributes = True

class ScannedClothingItem(BaseModel):
    name: str
    category: str
    color: str
    brand: str | None = None
    tags: List[str] = []

class ScanWardrobeResponse(BaseModel):
    items: list[ScannedClothingItem]
    photo_url: str

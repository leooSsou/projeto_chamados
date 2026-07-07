from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.chamado import LocationType, TicketStatus

class TicketCreate(BaseModel):
    location_type: LocationType
    location_details: str = Field(..., min_length=1, max_length=150)
    is_room_occupied: bool = Field(default=False)
    category: str = Field(default="Tecnologia", min_length=2, max_length=100)
    subcategory: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=3)
    image_url: Optional[str] = Field(default=None, max_length=255)

class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    status: TicketStatus
    priority: str
    destination_queue: str
    location_type: LocationType
    location_details: str
    is_room_occupied: bool
    category: str
    subcategory: str
    description: str
    image_url: Optional[str]
    sla_duration_hours: float
    sla_deadline: Optional[datetime]
    created_at: datetime
    started_at: Optional[datetime]
    paused_at: Optional[datetime]
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]

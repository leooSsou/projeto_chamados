from pydantic import BaseModel, Field, ConfigDict
from app.models.usuario import UserProfile

class UserCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    username: str = Field(..., min_length=3, max_length=100) # email ou matrícula
    password: str = Field(..., min_length=4, max_length=50) # senha provisória
    department: str = Field(..., min_length=2, max_length=100)
    profile: UserProfile

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    username: str
    department: str
    profile: UserProfile
    must_change_password: bool

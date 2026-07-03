from pydantic import BaseModel, Field, ConfigDict

class UserLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=4, max_length=50)

class UserLoginResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    username: str
    name: str
    profile: str
    must_change_password: bool

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserLoginResponse

class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=4, max_length=50)
    new_password: str = Field(..., min_length=4, max_length=50)

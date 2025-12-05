from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ---------- Boards ----------

class BoardBase(BaseModel):
  name: str
  color: Optional[str] = None


class BoardCreate(BoardBase):
  pass


class Board(BoardBase):
  id: int
  created_at: datetime

  class Config:
    orm_mode = True

class BoardUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

    class Config:
        orm_mode = True

# ---------- Users ----------

class UserBase(BaseModel):
  name: str
  email: Optional[str] = None


class UserCreate(UserBase):
  password: str  # Plaintext, wird im Backend gehasht


class User(UserBase):
    id: int
    created_at: datetime
    is_admin: bool
    is_active: bool
    can_view: bool
    can_edit: bool
    can_delete: bool
    must_change_password: bool

    class Config:
        orm_mode = True

class UserUpdate(BaseModel):
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None
    can_view: Optional[bool] = None
    can_edit: Optional[bool] = None
    can_delete: Optional[bool] = None
    must_change_password: Optional[bool] = None


# ---------- Login ----------

class LoginRequest(BaseModel):
    name: str
    password: str
    
class UserPasswordChange(BaseModel):
    new_password: str


class UserPasswordReset(BaseModel):
    new_password: str

# ---------- Columns ----------

class ColumnBase(BaseModel):
  title: str
  position: Optional[int] = None
  board_id: int
  color: Optional[str] = None


class ColumnCreate(ColumnBase):
  pass


class ColumnUpdate(BaseModel):
  title: Optional[str] = None
  position: Optional[int] = None
  board_id: Optional[int] = None
  color: Optional[str] = None


class Column(ColumnBase):
  id: int
  created_at: datetime

  class Config:
    orm_mode = True


# ---------- Cards ----------

class CardBase(BaseModel):
  title: str
  description: Optional[str] = None
  due_date: Optional[datetime] = None
  column_id: int
  color: Optional[str] = None
  assignee_id: Optional[int] = None
  link: Optional[str] = None


class CardCreate(CardBase):
  pass


class CardUpdate(BaseModel):
  title: Optional[str] = None
  description: Optional[str] = None
  due_date: Optional[datetime] = None
  column_id: Optional[int] = None
  color: Optional[str] = None
  assignee_id: Optional[int] = None
  link: Optional[str] = None


class Card(CardBase):
  id: int
  created_at: datetime

  class Config:
    orm_mode = True

class CardHistory(BaseModel):
    id: int
    card_id: int
    user_id: Optional[int] = None
    action: str
    field: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True

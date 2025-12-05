from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .database import Base


class Board(Base):
  __tablename__ = "boards"

  id = Column(Integer, primary_key=True, index=True)
  name = Column(String, nullable=False)
  color = Column(String, nullable=True)
  created_at = Column(DateTime, default=datetime.utcnow)

  columns = relationship(
    "KanbanColumn",
    back_populates="board",
    cascade="all, delete-orphan",
  )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    email = Column(String, nullable=True, unique=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Rechte / Status
    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=False)
    can_view = Column(Boolean, default=False)
    can_edit = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    must_change_password = Column(Boolean, default=False)

    cards_assigned = relationship("Card", back_populates="assignee")



class KanbanColumn(Base):
  __tablename__ = "columns"

  id = Column(Integer, primary_key=True, index=True)
  title = Column(String, nullable=False)
  position = Column(Integer, default=0)
  created_at = Column(DateTime, default=datetime.utcnow)

  board_id = Column(Integer, ForeignKey("boards.id"), nullable=False)
  color = Column(String, nullable=True)

  board = relationship("Board", back_populates="columns")
  cards = relationship(
    "Card",
    back_populates="column",
    cascade="all, delete-orphan",
  )


class Card(Base):
  __tablename__ = "cards"

  id = Column(Integer, primary_key=True, index=True)
  title = Column(String, nullable=False)
  description = Column(Text, nullable=True)
  link = Column(String, nullable=True)
  due_date = Column(DateTime, nullable=True)
  created_at = Column(DateTime, default=datetime.utcnow)

  color = Column(String, nullable=True)         # Priorität / Label
  column_id = Column(Integer, ForeignKey("columns.id"), nullable=False)

  assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Zuweisung
  assignee = relationship("User", back_populates="cards_assigned")

  column = relationship("KanbanColumn", back_populates="cards")

class CardHistory(Base):
    __tablename__ = "card_history"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    action = Column(String(50), nullable=False)      # z.B. "create", "update", "delete"
    field = Column(String(50), nullable=True)        # z.B. "title", "description", "due_date"
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    card = relationship("Card", backref="history")
    user = relationship("User", backref="card_history")
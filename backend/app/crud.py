from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session
from passlib.hash import pbkdf2_sha256

from . import models, schemas

# ---------- Boards ----------


def create_board(db: Session, board: schemas.BoardCreate) -> models.Board:
    db_board = models.Board(
        name=board.name,
        color=board.color,
    )
    db.add(db_board)
    db.commit()
    db.refresh(db_board)
    return db_board


def get_boards(db: Session) -> list[models.Board]:
    return db.query(models.Board).order_by(models.Board.created_at).all()


def update_board(
    db: Session,
    board_id: int,
    board_update: schemas.BoardUpdate
) -> models.Board:
    db_board = db.query(models.Board).filter(models.Board.id == board_id).first()
    if not db_board:
        raise HTTPException(status_code=404, detail="Board not found")

    if board_update.name is not None:
        db_board.name = board_update.name
    if board_update.color is not None:
        db_board.color = board_update.color

    db.commit()
    db.refresh(db_board)
    return db_board


# ---------- Users ----------


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    hashed = pbkdf2_sha256.hash(user.password)

    # Prüfen, ob es bereits User gibt
    user_count = db.query(models.User).count()
    is_first = user_count == 0

    # Wenn erster User: Admin + aktiv + alle Rechte
    db_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hashed,
        is_admin=is_first,
        is_active=is_first,
        can_view=True if is_first else False,
        can_edit=True if is_first else False,
        can_delete=True if is_first else False,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_users(db: Session) -> list[models.User]:
    return db.query(models.User).order_by(models.User.name).all()


def authenticate_user(db: Session, name: str, password: str) -> Optional[models.User]:
    user = db.query(models.User).filter(models.User.name == name).first()
    if not user:
        return None
    if not pbkdf2_sha256.verify(password, user.password_hash):
        return None
    return user


def update_user(db: Session, user_id: int, data: schemas.UserUpdate) -> Optional[models.User]:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None

    fields = data.dict(exclude_unset=True)
    for key, value in fields.items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


def change_user_password(
    db: Session,
    user_id: int,
    new_password: str,
) -> models.User:
    """
    Wird genutzt, wenn der Benutzer selbst (nach Login) sein Passwort ändert.
    Setzt must_change_password wieder auf False.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = pbkdf2_sha256.hash(new_password)
    user.must_change_password = False
    db.commit()
    db.refresh(user)
    return user


def admin_reset_password(
    db: Session,
    user_id: int,
    new_password: str,
) -> models.User:
    """
    Wird vom Admin genutzt, um ein neues (temporäres) Passwort zu setzen.
    must_change_password wird dabei auf True gesetzt, damit der User
    beim nächsten Login ein eigenes Passwort wählen muss.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = pbkdf2_sha256.hash(new_password)
    user.must_change_password = True
    db.commit()
    db.refresh(user)
    return user


# ---------- Columns ----------


def create_column(db: Session, column: schemas.ColumnCreate) -> models.KanbanColumn:
    position = column.position if column.position is not None else 0
    db_column = models.KanbanColumn(
        title=column.title,
        position=position,
        board_id=column.board_id,
        color=column.color,
    )
    db.add(db_column)
    db.commit()
    db.refresh(db_column)
    return db_column


def get_columns_by_board(db: Session, board_id: int) -> list[models.KanbanColumn]:
    return (
        db.query(models.KanbanColumn)
        .filter(models.KanbanColumn.board_id == board_id)
        .order_by(models.KanbanColumn.position)
        .all()
    )


def update_column(
    db: Session,
    column_id: int,
    column_data: schemas.ColumnUpdate,
) -> Optional[models.KanbanColumn]:
    db_column = (
        db.query(models.KanbanColumn)
        .filter(models.KanbanColumn.id == column_id)
        .first()
    )
    if not db_column:
        return None

    data = column_data.dict(exclude_unset=True)

    if "title" in data:
        db_column.title = data["title"]
    if "position" in data:
        db_column.position = data["position"]
    if "board_id" in data:
        db_column.board_id = data["board_id"]
    if "color" in data:
        db_column.color = data["color"]

    db.commit()
    db.refresh(db_column)
    return db_column


# ---------- Cards & History ----------


def create_card_history(
    db: Session,
    card_id: int,
    user_id: Optional[int],
    action: str,
    field: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
):
    entry = models.CardHistory(
        card_id=card_id,
        user_id=user_id,
        action=action,
        field=field,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(entry)
    return entry


def create_card(
    db: Session,
    card: schemas.CardCreate,
    user_id: Optional[int] = None
) -> models.Card:
    db_card = models.Card(
        title=card.title,
        description=card.description,
        due_date=card.due_date,
        column_id=card.column_id,
        color=card.color,
        assignee_id=card.assignee_id,
        link=card.link,
    )
    db.add(db_card)
    db.commit()
    db.refresh(db_card)

    # History: Erstellung
    create_card_history(
        db,
        card_id=db_card.id,
        user_id=user_id,
        action="create",
        field=None,
        old_value=None,
        new_value=db_card.title,
    )
    db.commit()

    return db_card


def update_card(
    db: Session,
    card_id: int,
    card_update: schemas.CardUpdate,
    user_id: Optional[int] = None,
) -> models.Card:
    db_card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Card not found")

    # vorherige Werte merken
    before = {
        "title": db_card.title,
        "description": db_card.description,
        "due_date": db_card.due_date.isoformat() if db_card.due_date else None,
        "column_id": str(db_card.column_id),
        "color": db_card.color,
        "assignee_id": str(db_card.assignee_id) if db_card.assignee_id else None,
        "link": db_card.link,
    }

    # Card aktualisieren
    for field, value in card_update.dict(exclude_unset=True).items():
        setattr(db_card, field, value)

    db.commit()
    db.refresh(db_card)

    # nachher-Werte
    after = {
        "title": db_card.title,
        "description": db_card.description,
        "due_date": db_card.due_date.isoformat() if db_card.due_date else None,
        "column_id": str(db_card.column_id),
        "color": db_card.color,
        "assignee_id": str(db_card.assignee_id) if db_card.assignee_id else None,
        "link": db_card.link,
    }

    # Unterschiede loggen
    for field in before.keys():
        if before[field] != after[field]:
            create_card_history(
                db,
                card_id=db_card.id,
                user_id=user_id,
                action="update",
                field=field,
                old_value=before[field],
                new_value=after[field],
            )

    db.commit()
    return db_card


def delete_card(
    db: Session,
    card_id: int,
    user_id: Optional[int] = None
):
    db_card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Card not found")

    title_before = db_card.title

    db.delete(db_card)

    # History: Delete
    create_card_history(
        db,
        card_id=card_id,
        user_id=user_id,
        action="delete",
        field=None,
        old_value=title_before,
        new_value=None,
    )

    db.commit()
    return {"ok": True}


def get_card_history(db: Session, card_id: int):
    """
    Liefert alle History-Einträge zu einer Karte (neueste zuerst).
    """
    return (
        db.query(models.CardHistory)
        .filter(models.CardHistory.card_id == card_id)
        .order_by(models.CardHistory.created_at.desc())
        .all()
    )

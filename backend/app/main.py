from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models, schemas, crud
from .database import SessionLocal, engine

# Tabellen erstellen
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Kanban API",
    version="1.0.0",
)

origins = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------- Boards ----------


@app.post("/boards/", response_model=schemas.Board)
def create_board(board: schemas.BoardCreate, db: Session = Depends(get_db)):
    return crud.create_board(db, board)


@app.get("/boards/", response_model=List[schemas.Board])
def read_boards(db: Session = Depends(get_db)):
    return crud.get_boards(db)


@app.get("/boards/{board_id}", response_model=schemas.Board)
def read_board(board_id: int, db: Session = Depends(get_db)):
    db_board = db.query(models.Board).filter(models.Board.id == board_id).first()
    if not db_board:
        raise HTTPException(status_code=404, detail="Board not found")
    return db_board


@app.patch("/boards/{board_id}", response_model=schemas.Board)
def update_board(board_id: int, board: schemas.BoardUpdate, db: Session = Depends(get_db)):
    return crud.update_board(db, board_id, board)


# ---------- Users ----------


@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return crud.create_user(db, user)


@app.get("/users/", response_model=List[schemas.User])
def read_users(db: Session = Depends(get_db)):
    return crud.get_users(db)


@app.post("/login", response_model=schemas.User)
def login(data: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, data.name, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        # Benutzer existiert, aber noch nicht vom Admin freigeschaltet
        raise HTTPException(status_code=403, detail="Account not activated by admin")

    return user


@app.patch("/users/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    data: schemas.UserUpdate,
    db: Session = Depends(get_db),
):
    db_user = crud.update_user(db, user_id, data)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


# 🔐 Passwort ändern (User selbst, nach Login)
@app.post("/users/{user_id}/change_password", response_model=schemas.User)
def change_password(
    user_id: int,
    data: schemas.UserPasswordChange,
    db: Session = Depends(get_db),
):
    # Aktuell kein serverseitiger Admin-/Identity-Check,
    # das regeln wir vorerst im Frontend.
    return crud.change_user_password(
        db,
        user_id=user_id,
        new_password=data.new_password,
    )


# 🔐 Passwort-Reset durch Admin (temporäres Passwort, must_change_password = True)
@app.post("/users/{user_id}/reset_password", response_model=schemas.User)
def reset_password(
    user_id: int,
    data: schemas.UserPasswordReset,
    db: Session = Depends(get_db),
):
    # Aktuell kein harter Admin-Check auf Backend-Seite,
    # Frontend sorgt dafür, dass nur Admins diesen Button sehen.
    return crud.admin_reset_password(
        db,
        user_id=user_id,
        new_password=data.new_password,
    )


# ---------- Columns ----------


@app.post("/columns/", response_model=schemas.Column)
def create_column(column: schemas.ColumnCreate, db: Session = Depends(get_db)):
    board = db.query(models.Board).filter(models.Board.id == column.board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    return crud.create_column(db, column)


@app.get("/boards/{board_id}/columns", response_model=List[schemas.Column])
def read_columns_by_board(board_id: int, db: Session = Depends(get_db)):
    board = db.query(models.Board).filter(models.Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    return crud.get_columns_by_board(db, board_id=board_id)


@app.get("/columns/", response_model=List[schemas.Column])
def read_all_columns(db: Session = Depends(get_db)):
    return db.query(models.KanbanColumn).order_by(models.KanbanColumn.position).all()


@app.patch("/columns/{column_id}", response_model=schemas.Column)
def update_column(
    column_id: int,
    column_data: schemas.ColumnUpdate,
    db: Session = Depends(get_db),
):
    db_column = crud.update_column(db, column_id, column_data)
    if not db_column:
        raise HTTPException(status_code=404, detail="Column not found")
    return db_column


@app.delete("/columns/{column_id}", status_code=204)
def delete_column(column_id: int, db: Session = Depends(get_db)):
    db_column = (
        db.query(models.KanbanColumn)
        .filter(models.KanbanColumn.id == column_id)
        .first()
    )
    if not db_column:
        raise HTTPException(status_code=404, detail="Column not found")

    db.delete(db_column)
    db.commit()
    return None


# ---------- Cards ----------


@app.post("/cards/", response_model=schemas.Card)
def create_card(
    card: schemas.CardCreate,
    db: Session = Depends(get_db),
    x_user_id: Optional[int] = Header(None),
):
    column = (
        db.query(models.KanbanColumn)
        .filter(models.KanbanColumn.id == card.column_id)
        .first()
    )
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")

    # Optional: prüfen, ob assignee existiert
    if card.assignee_id is not None:
        user = db.query(models.User).filter(models.User.id == card.assignee_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Assignee not found")

    # History: user_id an crud weitergeben
    return crud.create_card(db, card, user_id=x_user_id)


@app.get("/cards/", response_model=List[schemas.Card])
def read_cards(db: Session = Depends(get_db)):
    return db.query(models.Card).order_by(models.Card.created_at).all()


@app.get("/columns/{column_id}/cards", response_model=List[schemas.Card])
def read_cards_by_column(column_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Card)
        .filter(models.Card.column_id == column_id)
        .order_by(models.Card.created_at)
        .all()
    )


@app.patch("/cards/{card_id}", response_model=schemas.Card)
def update_card(
    card_id: int,
    card_data: schemas.CardUpdate,
    db: Session = Depends(get_db),
    x_user_id: Optional[int] = Header(None),
):
    # Optional: wenn assignee_id im Update, prüfen
    if card_data.assignee_id is not None:
        user = db.query(models.User).filter(models.User.id == card_data.assignee_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Assignee not found")

    db_card = crud.update_card(db, card_id, card_data, user_id=x_user_id)
    if not db_card:
        raise HTTPException(status_code=404, detail="Card not found")
    return db_card


@app.delete("/cards/{card_id}", status_code=204)
def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    x_user_id: Optional[int] = Header(None),
):
    db_card = db.query(models.Card).filter(models.Card.id == card_id).first()
    if not db_card:
        raise HTTPException(status_code=404, detail="Card not found")

    # History im crud löschen/loggen
    crud.delete_card(db, card_id, user_id=x_user_id)
    return None


# ---------- Card History ----------


@app.get("/cards/{card_id}/history", response_model=List[schemas.CardHistory])
def read_card_history(card_id: int, db: Session = Depends(get_db)):
    return crud.get_card_history(db, card_id)

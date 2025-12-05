import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Standard: lokal SQLite (für Entwicklung)
DEFAULT_SQLALCHEMY_DATABASE_URL = "sqlite:///./kanban.db"

# In Docker / Produktion per ENV konfigurierbar
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    DEFAULT_SQLALCHEMY_DATABASE_URL,
)

# Für SQLite braucht man extra connect_args, für Postgres nicht
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

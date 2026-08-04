import os
import tempfile
from collections.abc import Generator

os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret-with-at-least-thirty-two-characters"  # noqa: S105
os.environ["COOKIE_SECURE"] = "false"
os.environ["STORAGE_BACKEND"] = "local"
os.environ["LOCAL_STORAGE_PATH"] = tempfile.mkdtemp(prefix="cyberpass-tests-")
os.environ.pop("OPENAI_API_KEY", None)
os.environ.pop("OPENAI_MODEL", None)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401
from app.core.database import Base, get_db
from app.main import app

test_engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=test_engine, expire_on_commit=False)


def override_db() -> Generator[Session, None, None]:
    with TestingSession() as session:
        yield session


app.dependency_overrides[get_db] = override_db


@pytest.fixture(autouse=True)
def reset_database() -> Generator[None, None, None]:
    Base.metadata.drop_all(test_engine)
    Base.metadata.create_all(test_engine)
    yield


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db() -> Generator[Session, None, None]:
    with TestingSession() as session:
        yield session

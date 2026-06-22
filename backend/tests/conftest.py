"""Pytest configuration and shared fixtures for backend tests."""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """Return a FastAPI test client."""
    return TestClient(app)

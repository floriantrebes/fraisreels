"""Tests for the FastAPI app."""

from fastapi.testclient import TestClient

from app.main import app


def test_root_returns_service_metadata() -> None:
    """Role: Ensure the root endpoint returns service metadata.

    Inputs: None.
    Outputs: Response JSON with status and service keys.
    Errors: None.
    """

    client = TestClient(app)
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "Frais Reels API",
    }

"""Tests for the FastAPI app."""

from pathlib import Path

from fastapi.testclient import TestClient

from app.db import init_db
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


def test_dashboard_returns_year_summary() -> None:
    """Role: Ensure the dashboard endpoint returns yearly summaries.

    Inputs: Seeded API data for one person.
    Outputs: Dashboard summary response.
    Errors: None.
    """

    db_path = Path("data.db")
    if db_path.exists():
        db_path.unlink()

    init_db()
    client = TestClient(app)
    household = client.post("/households", json={"name": "Foyer Test"})
    person = client.post(
        "/persons",
        json={
            "household_id": household.json()["id"],
            "first_name": "Alex",
            "last_name": "Durand",
        },
    )
    vehicle = client.post(
        "/vehicles",
        json={
            "person_id": person.json()["id"],
            "name": "Citadine",
            "power_cv": 4,
        },
    )
    client.post(
        "/mileage",
        json={
            "person_id": person.json()["id"],
            "vehicle_id": vehicle.json()["id"],
            "year": 2024,
            "month": 1,
            "km": 4000,
        },
    )
    client.post(
        "/meals",
        json={
            "person_id": person.json()["id"],
            "year": 2024,
            "month": 2,
            "meal_cost": 15.0,
        },
    )
    client.post(
        "/other-expenses",
        json={
            "person_id": person.json()["id"],
            "year": 2024,
            "description": "Téléphone",
            "amount": 120.0,
            "attachment_path": None,
        },
    )
    response = client.get("/api/dashboard/2024")

    assert response.status_code == 200
    payload = response.json()
    assert payload["year"] == 2024
    assert payload["total_deduction"] == 2553.8
    assert payload["people"][0]["vehicle_deduction_total"] == 2424.0

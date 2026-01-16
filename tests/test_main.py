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


def test_dashboard_html_includes_dialog_actions() -> None:
    """Role: Ensure the dashboard HTML includes dialog-driven actions.

    Inputs: None.
    Outputs: HTML response with dialog identifiers.
    Errors: None.
    """

    client = TestClient(app)
    response = client.get("/dashboard")

    assert response.status_code == 200
    assert "data-dialog-target" in response.text
    assert "household-dialog" in response.text


def test_mileage_scale_endpoint_returns_brackets() -> None:
    """Role: Ensure the mileage scale endpoint returns bracket data.

    Inputs: None.
    Outputs: Mileage scale list response.
    Errors: None.
    """

    client = TestClient(app)
    response = client.get("/api/mileage-scale")

    assert response.status_code == 200
    payload = response.json()
    assert payload
    first_entry = payload[0]
    assert "power_cv" in first_entry
    assert "brackets" in first_entry
    assert len(first_entry["brackets"]) == 3


def test_admin_crud_and_detail_endpoints() -> None:
    """Role: Validate CRUD endpoints and detailed operations.

    Inputs: Seeded API data for one person.
    Outputs: Updated and deleted entities with details.
    Errors: None.
    """

    db_path = Path("data.db")
    if db_path.exists():
        db_path.unlink()

    init_db()
    client = TestClient(app)
    household = client.post("/households", json={"name": "Foyer Alpha"})
    person = client.post(
        "/persons",
        json={
            "household_id": household.json()["id"],
            "first_name": "Sam",
            "last_name": "Dupont",
        },
    )
    vehicle = client.post(
        "/vehicles",
        json={
            "person_id": person.json()["id"],
            "name": "Berline",
            "power_cv": 6,
        },
    )
    mileage = client.post(
        "/mileage",
        json={
            "person_id": person.json()["id"],
            "vehicle_id": vehicle.json()["id"],
            "year": 2024,
            "month": 3,
            "km": 1200,
        },
    )
    meal = client.post(
        "/meals",
        json={
            "person_id": person.json()["id"],
            "year": 2024,
            "month": 4,
            "meal_cost": 22.5,
        },
    )
    other = client.post(
        "/other-expenses",
        json={
            "person_id": person.json()["id"],
            "year": 2024,
            "description": "Logiciel",
            "amount": 300.0,
            "attachment_path": "factures/logiciel.pdf",
        },
    )

    list_households = client.get("/households")
    list_people = client.get("/persons")
    list_vehicles = client.get("/vehicles")

    assert list_households.status_code == 200
    assert list_people.status_code == 200
    assert list_vehicles.status_code == 200
    assert list_people.json()[0]["household_name"] == "Foyer Alpha"

    details = client.get(
        f"/api/people/{person.json()['id']}/details/2024"
    )
    assert details.status_code == 200
    detail_payload = details.json()
    assert len(detail_payload["mileage_entries"]) == 1
    assert len(detail_payload["meal_expenses"]) == 1
    assert len(detail_payload["other_expenses"]) == 1

    updated_household = client.put(
        f"/households/{household.json()['id']}",
        json={"name": "Foyer Beta"},
    )
    updated_person = client.put(
        f"/persons/{person.json()['id']}",
        json={
            "household_id": household.json()["id"],
            "first_name": "Samuel",
            "last_name": "Dupont",
        },
    )
    updated_vehicle = client.put(
        f"/vehicles/{vehicle.json()['id']}",
        json={
            "person_id": person.json()["id"],
            "name": "Break",
            "power_cv": 6,
        },
    )
    updated_mileage = client.put(
        f"/mileage/{mileage.json()['id']}",
        json={
            "person_id": person.json()["id"],
            "vehicle_id": vehicle.json()["id"],
            "year": 2024,
            "month": 4,
            "km": 1450,
        },
    )
    updated_meal = client.put(
        f"/meals/{meal.json()['id']}",
        json={
            "person_id": person.json()["id"],
            "year": 2024,
            "month": 5,
            "meal_cost": 18.0,
        },
    )
    updated_other = client.put(
        f"/other-expenses/{other.json()['id']}",
        json={
            "person_id": person.json()["id"],
            "year": 2024,
            "description": "Téléphone",
            "amount": 180.0,
            "attachment_path": None,
        },
    )

    assert updated_household.json()["name"] == "Foyer Beta"
    assert updated_person.json()["first_name"] == "Samuel"
    assert updated_vehicle.json()["name"] == "Break"
    assert updated_mileage.json()["month"] == 4
    assert updated_meal.json()["month"] == 5
    assert updated_other.json()["description"] == "Téléphone"

    delete_mileage = client.delete(
        f"/mileage/{mileage.json()['id']}"
    )
    delete_meal = client.delete(f"/meals/{meal.json()['id']}")
    delete_other = client.delete(
        f"/other-expenses/{other.json()['id']}"
    )
    delete_vehicle = client.delete(
        f"/vehicles/{vehicle.json()['id']}"
    )
    delete_person = client.delete(
        f"/persons/{person.json()['id']}"
    )
    delete_household = client.delete(
        f"/households/{household.json()['id']}"
    )

    assert delete_mileage.status_code == 200
    assert delete_meal.status_code == 200
    assert delete_other.status_code == 200
    assert delete_vehicle.status_code == 200
    assert delete_person.status_code == 200
    assert delete_household.status_code == 200

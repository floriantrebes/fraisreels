"""FastAPI application for frais réels tracking."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.db import init_db
from app.models import (
    DashboardPersonSummary,
    DashboardResponse,
    HouseholdCreate,
    HouseholdResponse,
    MealExpenseCreate,
    MealExpenseResponse,
    MileageEntryCreate,
    MileageEntryResponse,
    OtherExpenseCreate,
    OtherExpenseResponse,
    PersonCreate,
    PersonResponse,
    PersonYearSummary,
    VehicleCreate,
    VehicleResponse,
    VehicleSummary,
)
from app.repositories import (
    create_household,
    create_meal_expense,
    create_mileage_entry,
    create_other_expense,
    create_person,
    create_vehicle,
    fetch_people_with_households,
    fetch_person,
)
from app.services import (
    build_vehicle_deductions,
    calculate_meals_total,
    calculate_other_expenses_total,
)

app = FastAPI(title="Frais Reels")
STATIC_DIR = Path(__file__).resolve().parent / "static"
INDEX_FILE = STATIC_DIR / "index.html"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
YEAR_MIN = 2000
YEAR_MAX = 2100


def validate_year(year: int) -> None:
    """Role: Validate the dashboard year range.

    Inputs: year integer.
    Outputs: None.
    Errors: Raises HTTPException for invalid year.
    """

    if year < YEAR_MIN or year > YEAR_MAX:
        raise HTTPException(
            status_code=400,
            detail="Year must be between 2000 and 2100",
        )


def build_person_summary(
    person_id: int,
    year: int,
) -> tuple[list[VehicleSummary], float, float, float, float]:
    """Role: Build yearly summary data for a person.

    Inputs: person_id and year.
    Outputs: vehicle summaries, vehicle total, meal total, other total, total.
    Errors: Propagates ValueError from services or repositories.
    """

    vehicle_deductions = build_vehicle_deductions(person_id, year)
    vehicles = [
        VehicleSummary(
            vehicle_id=item.vehicle_id,
            vehicle_name=item.vehicle_name,
            power_cv=item.power_cv,
            total_km=item.total_km,
            deduction=item.deduction,
        )
        for item in vehicle_deductions
    ]
    vehicle_total = sum(vehicle.deduction for vehicle in vehicle_deductions)
    meals_total = calculate_meals_total(person_id, year)
    other_total = calculate_other_expenses_total(person_id, year)
    total = meals_total + other_total + vehicle_total
    return vehicles, vehicle_total, meals_total, other_total, round(total, 2)


@app.on_event("startup")
def on_startup() -> None:
    """Initialize database on startup."""

    init_db()


@app.get("/")
def root() -> dict[str, str]:
    """Role: Provide a basic health response.

    Inputs: None.
    Outputs: A JSON payload with service metadata.
    Errors: None.
    """

    return {
        "status": "ok",
        "service": "Frais Reels API",
    }


@app.get("/dashboard")
def serve_dashboard() -> FileResponse:
    """Role: Serve the dashboard HTML page.

    Inputs: None.
    Outputs: HTML file response for the dashboard.
    Errors: 404 if the dashboard file is missing.
    """

    if not INDEX_FILE.exists():
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return FileResponse(INDEX_FILE)


@app.post("/households", response_model=HouseholdResponse)
def create_household_endpoint(payload: HouseholdCreate) -> HouseholdResponse:
    """Create a household."""

    row = create_household(payload.name)
    return HouseholdResponse(id=row["id"], name=row["name"])


@app.post("/persons", response_model=PersonResponse)
def create_person_endpoint(payload: PersonCreate) -> PersonResponse:
    """Create a person."""

    try:
        row = create_person(payload.household_id, payload.first_name,
                            payload.last_name)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return PersonResponse(
        id=row["id"],
        household_id=row["household_id"],
        first_name=row["first_name"],
        last_name=row["last_name"],
    )


@app.post("/vehicles", response_model=VehicleResponse)
def create_vehicle_endpoint(payload: VehicleCreate) -> VehicleResponse:
    """Create a vehicle."""

    try:
        row = create_vehicle(payload.person_id, payload.name, payload.power_cv)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return VehicleResponse(
        id=row["id"],
        person_id=row["person_id"],
        name=row["name"],
        power_cv=row["power_cv"],
    )


@app.post("/mileage", response_model=MileageEntryResponse)
def create_mileage_entry_endpoint(
    payload: MileageEntryCreate,
) -> MileageEntryResponse:
    """Create a mileage entry."""

    try:
        row = create_mileage_entry(
            payload.person_id,
            payload.vehicle_id,
            payload.year,
            payload.month,
            payload.km,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return MileageEntryResponse(
        id=row["id"],
        person_id=row["person_id"],
        vehicle_id=row["vehicle_id"],
        year=row["year"],
        month=row["month"],
        km=row["km"],
    )


@app.post("/meals", response_model=MealExpenseResponse)
def create_meal_expense_endpoint(
    payload: MealExpenseCreate,
) -> MealExpenseResponse:
    """Create a meal expense."""

    try:
        row = create_meal_expense(
            payload.person_id,
            payload.year,
            payload.month,
            payload.meal_cost,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return MealExpenseResponse(
        id=row["id"],
        person_id=row["person_id"],
        year=row["year"],
        month=row["month"],
        meal_cost=row["meal_cost"],
    )


@app.post("/other-expenses", response_model=OtherExpenseResponse)
def create_other_expense_endpoint(
    payload: OtherExpenseCreate,
) -> OtherExpenseResponse:
    """Create another professional expense."""

    try:
        row = create_other_expense(
            payload.person_id,
            payload.year,
            payload.description,
            payload.amount,
            payload.attachment_path,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return OtherExpenseResponse(
        id=row["id"],
        person_id=row["person_id"],
        year=row["year"],
        description=row["description"],
        amount=row["amount"],
        attachment_path=row["attachment_path"],
    )


@app.get("/persons/{person_id}/summary/{year}",
         response_model=PersonYearSummary)
def get_person_summary(person_id: int, year: int) -> PersonYearSummary:
    """Get yearly deduction summary for a person."""

    validate_year(year)
    try:
        fetch_person(person_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    vehicles, _, meals_total, other_total, total = build_person_summary(
        person_id,
        year,
    )
    return PersonYearSummary(
        person_id=person_id,
        year=year,
        vehicle_summaries=vehicles,
        meals_deduction=meals_total,
        other_expenses=other_total,
        total_deduction=round(total, 2),
    )


@app.get("/api/dashboard/{year}", response_model=DashboardResponse)
def get_dashboard(year: int) -> DashboardResponse:
    """Role: Provide the yearly dashboard summary.

    Inputs: year path parameter.
    Outputs: Dashboard summary with per-person deductions.
    Errors: 404 if no people exist for the dashboard.
    """

    validate_year(year)
    people_rows = fetch_people_with_households()
    if not people_rows:
        raise HTTPException(status_code=404, detail="No people found")
    people: list[DashboardPersonSummary] = []
    total_deduction = 0.0
    for row in people_rows:
        vehicles, vehicle_total, meals_total, other_total, total = (
            build_person_summary(row["person_id"], year)
        )
        total_deduction += total
        people.append(
            DashboardPersonSummary(
                person_id=row["person_id"],
                household_name=row["household_name"],
                first_name=row["first_name"],
                last_name=row["last_name"],
                vehicle_summaries=vehicles,
                vehicle_deduction_total=round(vehicle_total, 2),
                meals_deduction=meals_total,
                other_expenses=other_total,
                total_deduction=total,
            )
        )
    return DashboardResponse(
        year=year,
        people=people,
        total_deduction=round(total_deduction, 2),
    )

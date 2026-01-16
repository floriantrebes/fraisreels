"""FastAPI application for frais réels tracking."""

from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.constants import MILEAGE_SCALE
from app.db import init_db
from app.models import (
    DashboardPersonSummary,
    DashboardResponse,
    HouseholdCreate,
    HouseholdResponse,
    HouseholdUpdate,
    MealExpenseCreate,
    MealExpenseResponse,
    MealExpenseUpdate,
    MileageEntryCreate,
    MileageEntryResponse,
    MileageEntryUpdate,
    MileageScaleBracketResponse,
    MileageScaleResponse,
    OtherExpenseCreate,
    OtherExpenseResponse,
    OtherExpenseUpdate,
    PersonCreate,
    PersonListResponse,
    PersonResponse,
    PersonUpdate,
    PersonYearSummary,
    PersonYearDetail,
    VehicleCreate,
    VehicleListResponse,
    VehicleResponse,
    VehicleUpdate,
    VehicleSummary,
)
from app.repositories import (
    create_household,
    create_meal_expense,
    create_mileage_entry,
    create_other_expense,
    create_person,
    create_vehicle,
    delete_household,
    delete_meal_expense,
    delete_mileage_entry,
    delete_other_expense,
    delete_person,
    delete_vehicle,
    fetch_households,
    fetch_people_with_households,
    fetch_people_overview,
    fetch_person,
    fetch_mileage_entries_by_year,
    fetch_other_expenses_by_year,
    fetch_meal_expenses_by_year,
    fetch_vehicles_with_people,
    update_household,
    update_meal_expense,
    update_mileage_entry,
    update_other_expense,
    update_person,
    update_vehicle,
)
from app.services import (
    build_vehicle_deductions,
    calculate_meal_deduction,
    calculate_meals_total,
    calculate_other_expenses_total,
)
from app.constants import MILEAGE_SCALE

app = FastAPI(title="Frais Reels")
STATIC_DIR = Path(__file__).resolve().parent / "static"
INDEX_FILE = STATIC_DIR / "index.html"
ADMIN_FILE = STATIC_DIR / "admin.html"
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


def build_mileage_entries(
    rows: list[Mapping[str, object]],
) -> list[dict[str, object]]:
    """Role: Build mileage entry dictionaries from rows.

    Inputs: SQLite rows for mileage entries.
    Outputs: List of mileage detail dictionaries.
    Errors: None.
    """

    return [
        {
            "id": row["id"],
            "person_id": row["person_id"],
            "vehicle_id": row["vehicle_id"],
            "vehicle_name": row["vehicle_name"],
            "year": row["year"],
            "month": row["month"],
            "km": row["km"],
        }
        for row in rows
    ]


def build_meal_entries(
    rows: list[Mapping[str, object]],
) -> list[dict[str, object]]:
    """Role: Build meal expense dictionaries from rows.

    Inputs: SQLite rows for meal expenses.
    Outputs: List of meal detail dictionaries.
    Errors: None.
    """

    return [
        {
            "id": row["id"],
            "person_id": row["person_id"],
            "year": row["year"],
            "month": row["month"],
            "meal_cost": row["meal_cost"],
            "deductible_amount": calculate_meal_deduction(
                float(row["meal_cost"])
            ),
        }
        for row in rows
    ]


def build_other_entries(
    rows: list[Mapping[str, object]],
) -> list[dict[str, object]]:
    """Role: Build other expense dictionaries from rows.

    Inputs: SQLite rows for other expenses.
    Outputs: List of other expense detail dictionaries.
    Errors: None.
    """

    return [
        {
            "id": row["id"],
            "person_id": row["person_id"],
            "year": row["year"],
            "description": row["description"],
            "amount": row["amount"],
            "attachment_path": row["attachment_path"],
        }
        for row in rows
    ]


def build_mileage_scale_entries() -> list[MileageScaleEntry]:
    """Role: Build mileage scale entries for the admin page.

    Inputs: None.
    Outputs: List of mileage scale entries.
    Errors: None.
    """

    entries: list[MileageScaleEntry] = []
    for power_cv, brackets in sorted(MILEAGE_SCALE.items()):
        entries.append(
            MileageScaleEntry(
                power_cv=power_cv,
                brackets=[
                    MileageScaleBracket(
                        max_km=bracket.max_km,
                        rate=bracket.rate,
                        fixed=bracket.fixed,
                    )
                    for bracket in brackets
                ],
            )
        )
    return entries


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


@app.get("/api/mileage-scale", response_model=list[MileageScaleEntry])
def mileage_scale() -> list[MileageScaleEntry]:
    """Role: Return the mileage scale values.

    Inputs: None.
    Outputs: List of mileage scale entries.
    Errors: None.
    """

    return build_mileage_scale_entries()


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


@app.get("/admin")
def serve_admin() -> FileResponse:
    """Role: Serve the admin HTML page.

    Inputs: None.
    Outputs: HTML file response for the admin page.
    Errors: 404 if the admin file is missing.
    """

    if not ADMIN_FILE.exists():
        raise HTTPException(status_code=404, detail="Admin page not found")
    return FileResponse(ADMIN_FILE)


@app.get(
    "/api/mileage-scale",
    response_model=list[MileageScaleResponse],
)
def list_mileage_scale_endpoint() -> list[MileageScaleResponse]:
    """List the mileage scale brackets."""

    responses = []
    for power_cv, brackets in sorted(MILEAGE_SCALE.items()):
        response_brackets = [
            MileageScaleBracketResponse(
                max_km=bracket.max_km,
                rate=bracket.rate,
                fixed=bracket.fixed,
            )
            for bracket in brackets
        ]
        responses.append(
            MileageScaleResponse(
                power_cv=power_cv,
                brackets=response_brackets,
            )
        )
    return responses


@app.post("/households", response_model=HouseholdResponse)
def create_household_endpoint(payload: HouseholdCreate) -> HouseholdResponse:
    """Create a household."""

    row = create_household(payload.name)
    return HouseholdResponse(id=row["id"], name=row["name"])


@app.get("/households", response_model=list[HouseholdResponse])
def list_households_endpoint() -> list[HouseholdResponse]:
    """List all households."""

    rows = fetch_households()
    return [HouseholdResponse(id=row["id"], name=row["name"]) for row in rows]


@app.put("/households/{household_id}", response_model=HouseholdResponse)
def update_household_endpoint(
    household_id: int,
    payload: HouseholdUpdate,
) -> HouseholdResponse:
    """Update a household."""

    try:
        row = update_household(household_id, payload.name)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return HouseholdResponse(id=row["id"], name=row["name"])


@app.delete("/households/{household_id}", response_model=HouseholdResponse)
def delete_household_endpoint(household_id: int) -> HouseholdResponse:
    """Delete a household."""

    try:
        row = delete_household(household_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
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


@app.get("/persons", response_model=list[PersonListResponse])
def list_people_endpoint() -> list[PersonListResponse]:
    """List all people with their households."""

    rows = fetch_people_overview()
    return [
        PersonListResponse(
            id=row["id"],
            household_id=row["household_id"],
            household_name=row["household_name"],
            first_name=row["first_name"],
            last_name=row["last_name"],
        )
        for row in rows
    ]


@app.put("/persons/{person_id}", response_model=PersonResponse)
def update_person_endpoint(
    person_id: int,
    payload: PersonUpdate,
) -> PersonResponse:
    """Update a person."""

    try:
        row = update_person(
            person_id,
            payload.household_id,
            payload.first_name,
            payload.last_name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return PersonResponse(
        id=row["id"],
        household_id=row["household_id"],
        first_name=row["first_name"],
        last_name=row["last_name"],
    )


@app.delete("/persons/{person_id}", response_model=PersonResponse)
def delete_person_endpoint(person_id: int) -> PersonResponse:
    """Delete a person."""

    try:
        row = delete_person(person_id)
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


@app.get("/vehicles", response_model=list[VehicleListResponse])
def list_vehicles_endpoint() -> list[VehicleListResponse]:
    """List all vehicles with owner names."""

    rows = fetch_vehicles_with_people()
    return [
        VehicleListResponse(
            id=row["id"],
            person_id=row["person_id"],
            person_name=f"{row['first_name']} {row['last_name']}",
            name=row["name"],
            power_cv=row["power_cv"],
        )
        for row in rows
    ]


@app.put("/vehicles/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle_endpoint(
    vehicle_id: int,
    payload: VehicleUpdate,
) -> VehicleResponse:
    """Update a vehicle."""

    try:
        row = update_vehicle(
            vehicle_id,
            payload.person_id,
            payload.name,
            payload.power_cv,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return VehicleResponse(
        id=row["id"],
        person_id=row["person_id"],
        name=row["name"],
        power_cv=row["power_cv"],
    )


@app.delete("/vehicles/{vehicle_id}", response_model=VehicleResponse)
def delete_vehicle_endpoint(vehicle_id: int) -> VehicleResponse:
    """Delete a vehicle."""

    try:
        row = delete_vehicle(vehicle_id)
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


@app.put("/mileage/{entry_id}", response_model=MileageEntryResponse)
def update_mileage_entry_endpoint(
    entry_id: int,
    payload: MileageEntryUpdate,
) -> MileageEntryResponse:
    """Update a mileage entry."""

    try:
        row = update_mileage_entry(
            entry_id,
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


@app.delete("/mileage/{entry_id}", response_model=MileageEntryResponse)
def delete_mileage_entry_endpoint(entry_id: int) -> MileageEntryResponse:
    """Delete a mileage entry."""

    try:
        row = delete_mileage_entry(entry_id)
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


@app.put("/meals/{expense_id}", response_model=MealExpenseResponse)
def update_meal_expense_endpoint(
    expense_id: int,
    payload: MealExpenseUpdate,
) -> MealExpenseResponse:
    """Update a meal expense."""

    try:
        row = update_meal_expense(
            expense_id,
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


@app.delete("/meals/{expense_id}", response_model=MealExpenseResponse)
def delete_meal_expense_endpoint(
    expense_id: int,
) -> MealExpenseResponse:
    """Delete a meal expense."""

    try:
        row = delete_meal_expense(expense_id)
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


@app.put("/other-expenses/{expense_id}", response_model=OtherExpenseResponse)
def update_other_expense_endpoint(
    expense_id: int,
    payload: OtherExpenseUpdate,
) -> OtherExpenseResponse:
    """Update another professional expense."""

    try:
        row = update_other_expense(
            expense_id,
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


@app.delete("/other-expenses/{expense_id}",
            response_model=OtherExpenseResponse)
def delete_other_expense_endpoint(
    expense_id: int,
) -> OtherExpenseResponse:
    """Delete another professional expense."""

    try:
        row = delete_other_expense(expense_id)
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


@app.get("/api/people/{person_id}/details/{year}",
         response_model=PersonYearDetail)
def get_person_year_detail(person_id: int, year: int) -> PersonYearDetail:
    """Get detailed yearly operations for a person."""

    validate_year(year)
    try:
        fetch_person(person_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    mileage_rows = fetch_mileage_entries_by_year(person_id, year)
    meal_rows = fetch_meal_expenses_by_year(person_id, year)
    other_rows = fetch_other_expenses_by_year(person_id, year)
    mileage_entries = build_mileage_entries(mileage_rows)
    meal_expenses = build_meal_entries(meal_rows)
    other_expenses = build_other_entries(other_rows)
    mileage_total_km = sum(entry["km"] for entry in mileage_entries)
    vehicle_deductions = build_vehicle_deductions(person_id, year)
    mileage_deduction_total = sum(
        item.deduction for item in vehicle_deductions
    )
    meals_total = calculate_meals_total(person_id, year)
    other_total = calculate_other_expenses_total(person_id, year)
    total = meals_total + other_total + mileage_deduction_total
    return PersonYearDetail(
        person_id=person_id,
        year=year,
        mileage_entries=mileage_entries,
        meal_expenses=meal_expenses,
        other_expenses=other_expenses,
        mileage_total_km=round(mileage_total_km, 2),
        mileage_deduction_total=round(mileage_deduction_total, 2),
        meals_deduction_total=meals_total,
        other_expenses_total=other_total,
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

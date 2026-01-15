"""FastAPI application for frais réels tracking."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException

from app.db import init_db
from app.models import (
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
    fetch_person,
)
from app.services import (
    build_vehicle_deductions,
    calculate_meals_total,
    calculate_other_expenses_total,
)

app = FastAPI(title="Frais Reels")


@app.on_event("startup")
def on_startup() -> None:
    """Initialize database on startup."""

    init_db()


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

    try:
        fetch_person(person_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    vehicle_deductions = build_vehicle_deductions(person_id, year)
    meals_total = calculate_meals_total(person_id, year)
    other_total = calculate_other_expenses_total(person_id, year)
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
    total = meals_total + other_total
    total += sum(vehicle.deduction for vehicle in vehicle_deductions)
    return PersonYearSummary(
        person_id=person_id,
        year=year,
        vehicle_summaries=vehicles,
        meals_deduction=meals_total,
        other_expenses=other_total,
        total_deduction=round(total, 2),
    )

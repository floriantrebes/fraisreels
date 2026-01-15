"""Data models for API requests and responses."""

from __future__ import annotations

from pydantic import BaseModel, Field


class HouseholdCreate(BaseModel):
    """Represents a household creation request."""

    name: str = Field(min_length=1, max_length=100)


class HouseholdResponse(BaseModel):
    """Represents a household response."""

    id: int
    name: str


class PersonCreate(BaseModel):
    """Represents a person creation request."""

    household_id: int
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)


class PersonResponse(BaseModel):
    """Represents a person response."""

    id: int
    household_id: int
    first_name: str
    last_name: str


class VehicleCreate(BaseModel):
    """Represents a vehicle creation request."""

    person_id: int
    name: str = Field(min_length=1, max_length=100)
    power_cv: int = Field(ge=1, le=50)


class VehicleResponse(BaseModel):
    """Represents a vehicle response."""

    id: int
    person_id: int
    name: str
    power_cv: int


class MileageEntryCreate(BaseModel):
    """Represents a mileage entry creation request."""

    person_id: int
    vehicle_id: int
    year: int = Field(ge=2000, le=2100)
    month: int = Field(ge=1, le=12)
    km: float = Field(ge=0)


class MileageEntryResponse(BaseModel):
    """Represents a mileage entry response."""

    id: int
    person_id: int
    vehicle_id: int
    year: int
    month: int
    km: float


class MealExpenseCreate(BaseModel):
    """Represents a meal expense creation request."""

    person_id: int
    year: int = Field(ge=2000, le=2100)
    month: int = Field(ge=1, le=12)
    meal_cost: float = Field(ge=0)


class MealExpenseResponse(BaseModel):
    """Represents a meal expense response."""

    id: int
    person_id: int
    year: int
    month: int
    meal_cost: float


class OtherExpenseCreate(BaseModel):
    """Represents an other expense creation request."""

    person_id: int
    year: int = Field(ge=2000, le=2100)
    description: str = Field(min_length=1, max_length=255)
    amount: float = Field(ge=0)
    attachment_path: str | None = Field(default=None, max_length=255)


class OtherExpenseResponse(BaseModel):
    """Represents an other expense response."""

    id: int
    person_id: int
    year: int
    description: str
    amount: float
    attachment_path: str | None


class VehicleSummary(BaseModel):
    """Represents mileage summary for a vehicle."""

    vehicle_id: int
    vehicle_name: str
    power_cv: int
    total_km: float
    deduction: float


class PersonYearSummary(BaseModel):
    """Represents the yearly tax deduction summary for a person."""

    person_id: int
    year: int
    vehicle_summaries: list[VehicleSummary]
    meals_deduction: float
    other_expenses: float
    total_deduction: float


class DashboardPersonSummary(BaseModel):
    """Represents a person summary for the dashboard."""

    person_id: int
    household_name: str
    first_name: str
    last_name: str
    vehicle_summaries: list[VehicleSummary]
    vehicle_deduction_total: float
    meals_deduction: float
    other_expenses: float
    total_deduction: float


class DashboardResponse(BaseModel):
    """Represents the yearly dashboard response."""

    year: int
    people: list[DashboardPersonSummary]
    total_deduction: float

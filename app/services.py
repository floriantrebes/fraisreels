"""Business logic for deductions and summaries."""

from __future__ import annotations

from dataclasses import dataclass

from app.constants import MAX_CV, MEAL_MAXIMUM_COST, MEAL_MINIMUM_COST
from app.constants import MILEAGE_SCALE, MileageBracket
from app.repositories import (
    fetch_meal_expenses_by_year,
    fetch_other_expenses_by_year,
    fetch_vehicle_km_by_year,
)


@dataclass(frozen=True)
class VehicleDeduction:
    """Represents a vehicle deduction result."""

    vehicle_id: int
    vehicle_name: str
    power_cv: int
    total_km: float
    deduction: float


def normalize_power_cv(power_cv: int) -> int:
    """Normalize power to the maximum scale bucket.

    Args:
        power_cv: Fiscal power in CV.

    Returns:
        int: Normalized CV value.

    Raises:
        ValueError: If the power is not positive.
    """

    if power_cv <= 0:
        raise ValueError("power_cv must be positive")
    if power_cv >= MAX_CV:
        return MAX_CV
    return power_cv


def select_bracket(power_cv: int, km: float) -> MileageBracket:
    """Select the mileage bracket for the given kilometers.

    Args:
        power_cv: Fiscal power in CV.
        km: Total kilometers.

    Returns:
        MileageBracket: Matching mileage bracket.

    Raises:
        ValueError: If no bracket is defined.
    """

    normalized = normalize_power_cv(power_cv)
    brackets = MILEAGE_SCALE.get(normalized)
    if brackets is None:
        raise ValueError("Unsupported power scale")
    for bracket in brackets:
        if bracket.max_km is None:
            return bracket
        if km <= bracket.max_km:
            return bracket
    raise ValueError("No matching mileage bracket")


def calculate_mileage_deduction(power_cv: int, km: float) -> float:
    """Calculate mileage deduction using the official scale.

    Args:
        power_cv: Fiscal power in CV.
        km: Total kilometers.

    Returns:
        float: Deduction amount.

    Raises:
        ValueError: If km is negative.
    """

    if km < 0:
        raise ValueError("km must be non-negative")
    bracket = select_bracket(power_cv, km)
    return round((km * bracket.rate) + bracket.fixed, 2)


def calculate_meal_deduction(meal_cost: float) -> float:
    """Calculate deduction for a single meal expense.

    Args:
        meal_cost: Meal cost.

    Returns:
        float: Deductible amount.

    Raises:
        ValueError: If meal_cost is negative.
    """

    if meal_cost < 0:
        raise ValueError("meal_cost must be non-negative")
    if meal_cost <= MEAL_MINIMUM_COST:
        return 0.0
    deductible_cost = min(meal_cost, MEAL_MAXIMUM_COST)
    return round(deductible_cost - MEAL_MINIMUM_COST, 2)


def build_vehicle_deductions(
    person_id: int,
    year: int,
) -> list[VehicleDeduction]:
    """Build vehicle deductions for a person and year.

    Args:
        person_id: Person identifier.
        year: Tax year.

    Returns:
        list[VehicleDeduction]: Vehicle deductions.
    """

    rows = fetch_vehicle_km_by_year(person_id, year)
    deductions: list[VehicleDeduction] = []
    for row in rows:
        total_km = float(row["total_km"] or 0.0)
        deduction = calculate_mileage_deduction(row["power_cv"], total_km)
        deductions.append(
            VehicleDeduction(
                vehicle_id=row["vehicle_id"],
                vehicle_name=row["vehicle_name"],
                power_cv=row["power_cv"],
                total_km=total_km,
                deduction=deduction,
            )
        )
    return deductions


def calculate_meals_total(person_id: int, year: int) -> float:
    """Calculate total meal deductions for a year.

    Args:
        person_id: Person identifier.
        year: Tax year.

    Returns:
        float: Total meal deductions.
    """

    total = 0.0
    rows = fetch_meal_expenses_by_year(person_id, year)
    for row in rows:
        total += calculate_meal_deduction(float(row["meal_cost"]))
    return round(total, 2)


def calculate_other_expenses_total(person_id: int, year: int) -> float:
    """Calculate total other expenses for a year.

    Args:
        person_id: Person identifier.
        year: Tax year.

    Returns:
        float: Total of other expenses.
    """

    total = 0.0
    rows = fetch_other_expenses_by_year(person_id, year)
    for row in rows:
        total += float(row["amount"])
    return round(total, 2)

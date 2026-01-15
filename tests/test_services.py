"""Tests for deduction calculations."""

from app.constants import MEAL_MAXIMUM_COST, MEAL_MINIMUM_COST
from app.services import (
    calculate_meal_deduction,
    calculate_mileage_deduction,
)


def test_calculate_mileage_deduction_low_km() -> None:
    """Validate mileage deduction for low km."""

    result = calculate_mileage_deduction(3, 1000)
    assert result == 529.0


def test_calculate_mileage_deduction_high_km() -> None:
    """Validate mileage deduction for high km."""

    result = calculate_mileage_deduction(7, 25000)
    assert result == 11750.0


def test_calculate_meal_deduction_below_minimum() -> None:
    """Meal deduction should be zero when below minimum."""

    result = calculate_meal_deduction(MEAL_MINIMUM_COST)
    assert result == 0.0


def test_calculate_meal_deduction_cap() -> None:
    """Meal deduction should cap at the maximum."""

    result = calculate_meal_deduction(MEAL_MAXIMUM_COST + 5)
    assert result == round(MEAL_MAXIMUM_COST - MEAL_MINIMUM_COST, 2)

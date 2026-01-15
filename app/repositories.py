"""Database repositories for CRUD operations."""

from __future__ import annotations

import sqlite3
from typing import Iterable

from app.db import execute_query, get_connection


def fetch_one(cursor: sqlite3.Cursor) -> sqlite3.Row:
    """Fetch a single row or raise a ValueError.

    Args:
        cursor: SQLite cursor with results.

    Returns:
        sqlite3.Row: The first row of the result set.

    Raises:
        ValueError: If no row is returned.
    """

    row = cursor.fetchone()
    if row is None:
        raise ValueError("Resource not found")
    return row


def create_household(name: str) -> sqlite3.Row:
    """Create a household.

    Args:
        name: Household name.

    Returns:
        sqlite3.Row: Created household row.
    """

    query = "INSERT INTO households (name) VALUES (?)"
    with get_connection() as connection:
        cursor = execute_query(connection, query, (name,))
        return fetch_household(cursor.lastrowid)


def fetch_household(household_id: int) -> sqlite3.Row:
    """Fetch a household by ID.

    Args:
        household_id: Household identifier.

    Returns:
        sqlite3.Row: Household row.
    """

    query = "SELECT id, name FROM households WHERE id = ?"
    with get_connection() as connection:
        cursor = execute_query(connection, query, (household_id,))
        return fetch_one(cursor)


def create_person(
    household_id: int,
    first_name: str,
    last_name: str,
) -> sqlite3.Row:
    """Create a person.

    Args:
        household_id: Household identifier.
        first_name: Person first name.
        last_name: Person last name.

    Returns:
        sqlite3.Row: Created person row.
    """

    query = (
        "INSERT INTO persons (household_id, first_name, last_name) "
        "VALUES (?, ?, ?)"
    )
    with get_connection() as connection:
        cursor = execute_query(connection, query, (household_id, first_name,
                                                 last_name))
        return fetch_person(cursor.lastrowid)


def fetch_person(person_id: int) -> sqlite3.Row:
    """Fetch a person by ID.

    Args:
        person_id: Person identifier.

    Returns:
        sqlite3.Row: Person row.
    """

    query = (
        "SELECT id, household_id, first_name, last_name "
        "FROM persons WHERE id = ?"
    )
    with get_connection() as connection:
        cursor = execute_query(connection, query, (person_id,))
        return fetch_one(cursor)


def create_vehicle(
    person_id: int,
    name: str,
    power_cv: int,
) -> sqlite3.Row:
    """Create a vehicle.

    Args:
        person_id: Owner person identifier.
        name: Vehicle name.
        power_cv: Fiscal power in CV.

    Returns:
        sqlite3.Row: Created vehicle row.
    """

    query = (
        "INSERT INTO vehicles (person_id, name, power_cv) "
        "VALUES (?, ?, ?)"
    )
    with get_connection() as connection:
        cursor = execute_query(connection, query, (person_id, name, power_cv))
        return fetch_vehicle(cursor.lastrowid)


def fetch_vehicle(vehicle_id: int) -> sqlite3.Row:
    """Fetch a vehicle by ID.

    Args:
        vehicle_id: Vehicle identifier.

    Returns:
        sqlite3.Row: Vehicle row.
    """

    query = "SELECT id, person_id, name, power_cv FROM vehicles WHERE id = ?"
    with get_connection() as connection:
        cursor = execute_query(connection, query, (vehicle_id,))
        return fetch_one(cursor)


def create_mileage_entry(
    person_id: int,
    vehicle_id: int,
    year: int,
    month: int,
    km: float,
) -> sqlite3.Row:
    """Create a mileage entry.

    Args:
        person_id: Person identifier.
        vehicle_id: Vehicle identifier.
        year: Tax year.
        month: Month number.
        km: Kilometers.

    Returns:
        sqlite3.Row: Created mileage entry row.
    """

    query = (
        "INSERT INTO mileage_entries (person_id, vehicle_id, year, month, km) "
        "VALUES (?, ?, ?, ?, ?)"
    )
    with get_connection() as connection:
        cursor = execute_query(
            connection,
            query,
            (person_id, vehicle_id, year, month, km),
        )
        return fetch_mileage_entry(cursor.lastrowid)


def fetch_mileage_entry(entry_id: int) -> sqlite3.Row:
    """Fetch a mileage entry by ID.

    Args:
        entry_id: Mileage entry identifier.

    Returns:
        sqlite3.Row: Mileage entry row.
    """

    query = (
        "SELECT id, person_id, vehicle_id, year, month, km "
        "FROM mileage_entries WHERE id = ?"
    )
    with get_connection() as connection:
        cursor = execute_query(connection, query, (entry_id,))
        return fetch_one(cursor)


def create_meal_expense(
    person_id: int,
    year: int,
    month: int,
    meal_cost: float,
) -> sqlite3.Row:
    """Create a meal expense.

    Args:
        person_id: Person identifier.
        year: Tax year.
        month: Month number.
        meal_cost: Meal cost.

    Returns:
        sqlite3.Row: Created meal expense row.
    """

    query = (
        "INSERT INTO meal_expenses (person_id, year, month, meal_cost) "
        "VALUES (?, ?, ?, ?)"
    )
    with get_connection() as connection:
        cursor = execute_query(connection, query, (person_id, year, month,
                                                 meal_cost))
        return fetch_meal_expense(cursor.lastrowid)


def fetch_meal_expense(expense_id: int) -> sqlite3.Row:
    """Fetch a meal expense by ID.

    Args:
        expense_id: Meal expense identifier.

    Returns:
        sqlite3.Row: Meal expense row.
    """

    query = (
        "SELECT id, person_id, year, month, meal_cost "
        "FROM meal_expenses WHERE id = ?"
    )
    with get_connection() as connection:
        cursor = execute_query(connection, query, (expense_id,))
        return fetch_one(cursor)


def create_other_expense(
    person_id: int,
    year: int,
    description: str,
    amount: float,
    attachment_path: str | None,
) -> sqlite3.Row:
    """Create an other expense.

    Args:
        person_id: Person identifier.
        year: Tax year.
        description: Expense description.
        amount: Expense amount.
        attachment_path: Optional attachment path.

    Returns:
        sqlite3.Row: Created other expense row.
    """

    query = (
        "INSERT INTO other_expenses "
        "(person_id, year, description, amount, attachment_path) "
        "VALUES (?, ?, ?, ?, ?)"
    )
    params: Iterable[object] = (
        person_id,
        year,
        description,
        amount,
        attachment_path,
    )
    with get_connection() as connection:
        cursor = execute_query(connection, query, params)
        return fetch_other_expense(cursor.lastrowid)


def fetch_other_expense(expense_id: int) -> sqlite3.Row:
    """Fetch an other expense by ID.

    Args:
        expense_id: Other expense identifier.

    Returns:
        sqlite3.Row: Other expense row.
    """

    query = (
        "SELECT id, person_id, year, description, amount, attachment_path "
        "FROM other_expenses WHERE id = ?"
    )
    with get_connection() as connection:
        cursor = execute_query(connection, query, (expense_id,))
        return fetch_one(cursor)


def fetch_vehicle_km_by_year(
    person_id: int,
    year: int,
) -> list[sqlite3.Row]:
    """Fetch total km per vehicle for a year.

    Args:
        person_id: Person identifier.
        year: Tax year.

    Returns:
        list[sqlite3.Row]: Rows with vehicle and total_km.
    """

    query = (
        "SELECT vehicles.id AS vehicle_id, vehicles.name AS vehicle_name, "
        "vehicles.power_cv AS power_cv, "
        "SUM(mileage_entries.km) AS total_km "
        "FROM mileage_entries "
        "JOIN vehicles ON vehicles.id = mileage_entries.vehicle_id "
        "WHERE mileage_entries.person_id = ? AND mileage_entries.year = ? "
        "GROUP BY vehicles.id, vehicles.name, vehicles.power_cv"
    )
    with get_connection() as connection:
        cursor = execute_query(connection, query, (person_id, year))
        return list(cursor.fetchall())


def fetch_meal_expenses_by_year(
    person_id: int,
    year: int,
) -> list[sqlite3.Row]:
    """Fetch meal expenses for a year.

    Args:
        person_id: Person identifier.
        year: Tax year.

    Returns:
        list[sqlite3.Row]: Meal expense rows.
    """

    query = (
        "SELECT id, person_id, year, month, meal_cost "
        "FROM meal_expenses WHERE person_id = ? AND year = ?"
    )
    with get_connection() as connection:
        cursor = execute_query(connection, query, (person_id, year))
        return list(cursor.fetchall())


def fetch_other_expenses_by_year(
    person_id: int,
    year: int,
) -> list[sqlite3.Row]:
    """Fetch other expenses for a year.

    Args:
        person_id: Person identifier.
        year: Tax year.

    Returns:
        list[sqlite3.Row]: Other expense rows.
    """

    query = (
        "SELECT id, person_id, year, description, amount, attachment_path "
        "FROM other_expenses WHERE person_id = ? AND year = ?"
    )
    with get_connection() as connection:
        cursor = execute_query(connection, query, (person_id, year))
        return list(cursor.fetchall())

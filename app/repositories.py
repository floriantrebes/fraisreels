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


def fetch_people_with_households() -> list[sqlite3.Row]:
    """Role: Fetch all people with household metadata.

    Inputs: None.
    Outputs: List of people with household names.
    Errors: Propagates sqlite3.Error if query fails.
    """

    query = (
        "SELECT persons.id AS person_id, persons.first_name AS first_name, "
        "persons.last_name AS last_name, "
        "households.name AS household_name "
        "FROM persons "
        "JOIN households ON households.id = persons.household_id "
        "ORDER BY persons.last_name, persons.first_name"
    )
    with get_connection() as connection:
        cursor = execute_query(connection, query, ())
        return list(cursor.fetchall())


def fetch_people_overview() -> list[sqlite3.Row]:
    """Role: Fetch all people with household metadata and identifiers.

    Inputs: None.
    Outputs: List of people with household names and IDs.
    Errors: Propagates sqlite3.Error if query fails.
    """

    query = (
        "SELECT persons.id AS id, persons.household_id AS household_id, "
        "persons.first_name AS first_name, "
        "persons.last_name AS last_name, "
        "households.name AS household_name "
        "FROM persons "
        "JOIN households ON households.id = persons.household_id "
        "ORDER BY persons.last_name, persons.first_name"
    )
    with get_connection() as connection:
        cursor = execute_query(connection, query, ())
        return list(cursor.fetchall())


def fetch_households() -> list[sqlite3.Row]:
    """Fetch all households.

    Returns:
        list[sqlite3.Row]: Household rows.
    """

    query = "SELECT id, name FROM households ORDER BY name"
    with get_connection() as connection:
        cursor = execute_query(connection, query, ())
        return list(cursor.fetchall())


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


def fetch_vehicles_with_people() -> list[sqlite3.Row]:
    """Fetch vehicles with owner names.

    Returns:
        list[sqlite3.Row]: Vehicle rows with person names.
    """

    query = (
        "SELECT vehicles.id AS id, vehicles.person_id AS person_id, "
        "vehicles.name AS name, vehicles.power_cv AS power_cv, "
        "persons.first_name AS first_name, persons.last_name AS last_name "
        "FROM vehicles "
        "JOIN persons ON persons.id = vehicles.person_id "
        "ORDER BY persons.last_name, vehicles.name"
    )
    with get_connection() as connection:
        cursor = execute_query(connection, query, ())
        return list(cursor.fetchall())


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


def fetch_mileage_entries_by_year(
    person_id: int,
    year: int,
) -> list[sqlite3.Row]:
    """Fetch mileage entries for a year with vehicle names.

    Args:
        person_id: Person identifier.
        year: Tax year.

    Returns:
        list[sqlite3.Row]: Mileage entry rows.
    """

    query = (
        "SELECT mileage_entries.id AS id, "
        "mileage_entries.person_id AS person_id, "
        "mileage_entries.vehicle_id AS vehicle_id, "
        "mileage_entries.year AS year, mileage_entries.month AS month, "
        "mileage_entries.km AS km, vehicles.name AS vehicle_name "
        "FROM mileage_entries "
        "JOIN vehicles ON vehicles.id = mileage_entries.vehicle_id "
        "WHERE mileage_entries.person_id = ? AND mileage_entries.year = ? "
        "ORDER BY mileage_entries.month"
    )
    with get_connection() as connection:
        cursor = execute_query(connection, query, (person_id, year))
        return list(cursor.fetchall())


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


def update_household(household_id: int, name: str) -> sqlite3.Row:
    """Update a household.

    Args:
        household_id: Household identifier.
        name: Household name.

    Returns:
        sqlite3.Row: Updated household row.
    """

    fetch_household(household_id)
    query = "UPDATE households SET name = ? WHERE id = ?"
    with get_connection() as connection:
        execute_query(connection, query, (name, household_id))
        return fetch_household(household_id)


def update_person(
    person_id: int,
    household_id: int,
    first_name: str,
    last_name: str,
) -> sqlite3.Row:
    """Update a person.

    Args:
        person_id: Person identifier.
        household_id: Household identifier.
        first_name: Person first name.
        last_name: Person last name.

    Returns:
        sqlite3.Row: Updated person row.
    """

    fetch_person(person_id)
    fetch_household(household_id)
    query = (
        "UPDATE persons "
        "SET household_id = ?, first_name = ?, last_name = ? "
        "WHERE id = ?"
    )
    params = (household_id, first_name, last_name, person_id)
    with get_connection() as connection:
        execute_query(connection, query, params)
        return fetch_person(person_id)


def update_vehicle(
    vehicle_id: int,
    person_id: int,
    name: str,
    power_cv: int,
) -> sqlite3.Row:
    """Update a vehicle.

    Args:
        vehicle_id: Vehicle identifier.
        person_id: Owner identifier.
        name: Vehicle name.
        power_cv: Fiscal power.

    Returns:
        sqlite3.Row: Updated vehicle row.
    """

    fetch_vehicle(vehicle_id)
    fetch_person(person_id)
    query = (
        "UPDATE vehicles SET person_id = ?, name = ?, power_cv = ? "
        "WHERE id = ?"
    )
    params = (person_id, name, power_cv, vehicle_id)
    with get_connection() as connection:
        execute_query(connection, query, params)
        return fetch_vehicle(vehicle_id)


def update_mileage_entry(
    entry_id: int,
    person_id: int,
    vehicle_id: int,
    year: int,
    month: int,
    km: float,
) -> sqlite3.Row:
    """Update a mileage entry.

    Args:
        entry_id: Mileage entry identifier.
        person_id: Person identifier.
        vehicle_id: Vehicle identifier.
        year: Tax year.
        month: Month number.
        km: Kilometers.

    Returns:
        sqlite3.Row: Updated mileage entry row.
    """

    fetch_mileage_entry(entry_id)
    fetch_person(person_id)
    fetch_vehicle(vehicle_id)
    query = (
        "UPDATE mileage_entries "
        "SET person_id = ?, vehicle_id = ?, year = ?, month = ?, km = ? "
        "WHERE id = ?"
    )
    params = (person_id, vehicle_id, year, month, km, entry_id)
    with get_connection() as connection:
        execute_query(connection, query, params)
        return fetch_mileage_entry(entry_id)


def update_meal_expense(
    expense_id: int,
    person_id: int,
    year: int,
    month: int,
    meal_cost: float,
) -> sqlite3.Row:
    """Update a meal expense.

    Args:
        expense_id: Meal expense identifier.
        person_id: Person identifier.
        year: Tax year.
        month: Month number.
        meal_cost: Meal cost.

    Returns:
        sqlite3.Row: Updated meal expense row.
    """

    fetch_meal_expense(expense_id)
    fetch_person(person_id)
    query = (
        "UPDATE meal_expenses "
        "SET person_id = ?, year = ?, month = ?, meal_cost = ? "
        "WHERE id = ?"
    )
    params = (person_id, year, month, meal_cost, expense_id)
    with get_connection() as connection:
        execute_query(connection, query, params)
        return fetch_meal_expense(expense_id)


def update_other_expense(
    expense_id: int,
    person_id: int,
    year: int,
    description: str,
    amount: float,
    attachment_path: str | None,
) -> sqlite3.Row:
    """Update an other expense.

    Args:
        expense_id: Other expense identifier.
        person_id: Person identifier.
        year: Tax year.
        description: Expense description.
        amount: Expense amount.
        attachment_path: Optional attachment path.

    Returns:
        sqlite3.Row: Updated other expense row.
    """

    fetch_other_expense(expense_id)
    fetch_person(person_id)
    query = (
        "UPDATE other_expenses "
        "SET person_id = ?, year = ?, description = ?, amount = ?, "
        "attachment_path = ? "
        "WHERE id = ?"
    )
    params: Iterable[object] = (
        person_id,
        year,
        description,
        amount,
        attachment_path,
        expense_id,
    )
    with get_connection() as connection:
        execute_query(connection, query, params)
        return fetch_other_expense(expense_id)


def delete_household(household_id: int) -> sqlite3.Row:
    """Delete a household.

    Args:
        household_id: Household identifier.

    Returns:
        sqlite3.Row: Deleted household row.
    """

    row = fetch_household(household_id)
    query = "DELETE FROM households WHERE id = ?"
    with get_connection() as connection:
        execute_query(connection, query, (household_id,))
        return row


def delete_person(person_id: int) -> sqlite3.Row:
    """Delete a person.

    Args:
        person_id: Person identifier.

    Returns:
        sqlite3.Row: Deleted person row.
    """

    row = fetch_person(person_id)
    query = "DELETE FROM persons WHERE id = ?"
    with get_connection() as connection:
        execute_query(connection, query, (person_id,))
        return row


def delete_vehicle(vehicle_id: int) -> sqlite3.Row:
    """Delete a vehicle.

    Args:
        vehicle_id: Vehicle identifier.

    Returns:
        sqlite3.Row: Deleted vehicle row.
    """

    row = fetch_vehicle(vehicle_id)
    query = "DELETE FROM vehicles WHERE id = ?"
    with get_connection() as connection:
        execute_query(connection, query, (vehicle_id,))
        return row


def delete_mileage_entry(entry_id: int) -> sqlite3.Row:
    """Delete a mileage entry.

    Args:
        entry_id: Mileage entry identifier.

    Returns:
        sqlite3.Row: Deleted mileage entry row.
    """

    row = fetch_mileage_entry(entry_id)
    query = "DELETE FROM mileage_entries WHERE id = ?"
    with get_connection() as connection:
        execute_query(connection, query, (entry_id,))
        return row


def delete_meal_expense(expense_id: int) -> sqlite3.Row:
    """Delete a meal expense.

    Args:
        expense_id: Meal expense identifier.

    Returns:
        sqlite3.Row: Deleted meal expense row.
    """

    row = fetch_meal_expense(expense_id)
    query = "DELETE FROM meal_expenses WHERE id = ?"
    with get_connection() as connection:
        execute_query(connection, query, (expense_id,))
        return row


def delete_other_expense(expense_id: int) -> sqlite3.Row:
    """Delete an other expense.

    Args:
        expense_id: Other expense identifier.

    Returns:
        sqlite3.Row: Deleted other expense row.
    """

    row = fetch_other_expense(expense_id)
    query = "DELETE FROM other_expenses WHERE id = ?"
    with get_connection() as connection:
        execute_query(connection, query, (expense_id,))
        return row


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

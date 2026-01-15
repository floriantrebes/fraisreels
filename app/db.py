"""Database access and schema initialization."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Iterable

DB_PATH = Path("data.db")


def get_connection() -> sqlite3.Connection:
    """Create and return a SQLite connection.

    Returns:
        sqlite3.Connection: Active SQLite connection.

    Raises:
        sqlite3.Error: If the connection cannot be created.
    """

    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def execute_script(connection: sqlite3.Connection, script: str) -> None:
    """Execute a SQL script using the provided connection.

    Args:
        connection: Active database connection.
        script: SQL script to execute.

    Raises:
        sqlite3.Error: If the script execution fails.
    """

    connection.executescript(script)
    connection.commit()


def init_db() -> None:
    """Initialize database tables if they do not exist.

    Raises:
        sqlite3.Error: If table creation fails.
    """

    schema = """
    CREATE TABLE IF NOT EXISTS households (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS persons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        household_id INTEGER NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        FOREIGN KEY (household_id) REFERENCES households(id)
    );

    CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        power_cv INTEGER NOT NULL,
        FOREIGN KEY (person_id) REFERENCES persons(id)
    );

    CREATE TABLE IF NOT EXISTS mileage_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER NOT NULL,
        vehicle_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        km REAL NOT NULL,
        FOREIGN KEY (person_id) REFERENCES persons(id),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );

    CREATE TABLE IF NOT EXISTS meal_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        meal_cost REAL NOT NULL,
        FOREIGN KEY (person_id) REFERENCES persons(id)
    );

    CREATE TABLE IF NOT EXISTS other_expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER NOT NULL,
        year INTEGER NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        attachment_path TEXT,
        FOREIGN KEY (person_id) REFERENCES persons(id)
    );
    """
    with get_connection() as connection:
        execute_script(connection, schema)


def execute_query(
    connection: sqlite3.Connection,
    query: str,
    params: Iterable[object],
) -> sqlite3.Cursor:
    """Execute a parameterized SQL query.

    Args:
        connection: Active database connection.
        query: SQL query string.
        params: Query parameters.

    Returns:
        sqlite3.Cursor: Cursor after executing the query.

    Raises:
        sqlite3.Error: If query execution fails.
    """

    cursor = connection.execute(query, params)
    connection.commit()
    return cursor

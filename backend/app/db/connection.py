"""The single seam through which the backend talks to Postgres.

Route handlers and services must go through `get_connection()` rather than
importing a driver directly — that keeps the database swappable behind one
choke point instead of scattered across the codebase.
"""

from contextlib import contextmanager

import psycopg

from app.config import DATABASE_URL


@contextmanager
def get_connection():
    conn = psycopg.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()

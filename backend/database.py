import sqlite3
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "loginshield.db"


def get_connection():
    DATA_DIR.mkdir(exist_ok=True)

    connection = sqlite3.connect(DB_PATH)

    connection.row_factory = sqlite3.Row

    return connection


def initialize_database():

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT UNIQUE NOT NULL,
            email TEXT,
            created_at TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS otp_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT NOT NULL,
            otp_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            verified INTEGER DEFAULT 0
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS login_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER,

            phone TEXT NOT NULL,

            timestamp TEXT NOT NULL,

            ip_address TEXT,

            country TEXT,
            region TEXT,
            city TEXT,

            latitude REAL,
            longitude REAL,

            device TEXT,
            browser TEXT,
            operating_system TEXT,

            user_agent TEXT,

            status TEXT,

            risk_score INTEGER DEFAULT 0,
            risk_level TEXT DEFAULT 'LOW',

            detection_reasons TEXT
        )
    """)

    connection.commit()
    connection.close()
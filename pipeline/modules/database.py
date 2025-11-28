"""
Database Module
Handles SQLite database operations for storing processed data
"""
import sqlite3
import pandas as pd
from pathlib import Path
import logging
from typing import Optional, List
from datetime import datetime

import config

logger = logging.getLogger(__name__)


class VectorInsightDB:
    """Manages SQLite database for VectorInsight data"""
    
    def __init__(self, db_path: Optional[Path] = None):
        """
        Initialize database connection
        
        Args:
            db_path: Path to SQLite database file. If None, uses config.DB_PATH
        """
        self.db_path = db_path or config.DB_PATH
        self.connection = None
        
    def connect(self):
        """Establish database connection"""
        try:
            self.connection = sqlite3.connect(str(self.db_path))
            logger.info(f"Connected to database: {self.db_path}")
            return self.connection
        except sqlite3.Error as e:
            logger.error(f"Failed to connect to database: {str(e)}")
            raise
    
    def close(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed")
    
    def create_tables(self):
        """Create database tables if they don't exist"""
        with self.connect() as conn:
            cursor = conn.cursor()
            
            # Surveillance Sessions Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS surveillance_sessions (
                    ID INTEGER PRIMARY KEY,
                    SessionID INTEGER,
                    SessionFrontendID TEXT,
                    SessionHouseNumber TEXT,
                    SessionCollectorTitle TEXT,
                    SessionCollectorName TEXT,
                    SessionCollectionDate TEXT,
                    SessionCollectionMethod TEXT,
                    SessionSpecimenCondition TEXT,
                    SessionNotes TEXT,
                    NumPeopleSleptInHouse INTEGER,
                    WasIrsConducted TEXT,
                    MonthsSinceIrs INTEGER,
                    NumLlinsAvailable INTEGER,
                    LlinType TEXT,
                    LlinBrand TEXT,
                    NumPeopleSleptUnderLlin INTEGER,
                    SiteID INTEGER,
                    SiteDistrict TEXT,
                    SiteSubCounty TEXT,
                    SiteParish TEXT,
                    SiteSentinelSite TEXT,
                    SiteHealthCenter TEXT,
                    ProgramID INTEGER,
                    ProgramName TEXT,
                    ProgramCountry TEXT,
                    CreatedAt TEXT,
                    UpdatedAt TEXT,
                    ImportedAt TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Specimens Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS specimens (
                    SpecimenID TEXT PRIMARY KEY,
                    SessionID INTEGER,
                    Species TEXT,
                    Sex TEXT,
                    AbdomenStatus TEXT,
                    CapturedAt TEXT,
                    ImageID INTEGER,
                    ImageUrl TEXT,
                    SessionCollectionMethod TEXT,
                    SiteDistrict TEXT,
                    SiteSubCounty TEXT,
                    ProgramCountry TEXT,
                    ImportedAt TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (SessionID) REFERENCES surveillance_sessions (SessionID)
                )
            """)
            
            # Monthly Metrics Table (for pre-calculated aggregations)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS monthly_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    year_month TEXT NOT NULL,
                    metric_name TEXT NOT NULL,
                    metric_value REAL,
                    metric_json TEXT,
                    category TEXT,
                    calculated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(year_month, metric_name, category)
                )
            """)
            
            # Create indexes for better query performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_sessions_date 
                ON surveillance_sessions(SessionCollectionDate)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_sessions_method 
                ON surveillance_sessions(SessionCollectionMethod)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_specimens_species 
                ON specimens(Species)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_specimens_session 
                ON specimens(SessionID)
            """)

            cursor.execute("""
                CREATE VIEW IF NOT EXISTS Surveillance AS
                SELECT
                    SessionCollectorName    AS CollectorName,
                    SessionCollectionDate   AS SessionCollectionDate,
                    SessionID               AS SessionID,
                    SiteDistrict            AS SiteDistrict,
                    COALESCE(SiteName, '')  AS SiteName,
                    SessionCollectionMethod AS SessionCollectionMethod
                FROM surveillance_sessions
            """)

            cursor.execute("""
                CREATE VIEW IF NOT EXISTS Specimens AS
                SELECT
                    SpecimenID,
                    SessionID,
                    Species
                FROM specimens
            """)
            cursor.executescript("""
                DROP VIEW IF EXISTS Surveillance;
                CREATE VIEW Surveillance AS
                SELECT
                SessionCollectorName    AS CollectorName,
                SessionCollectionDate   AS SessionCollectionDate,
                SessionID               AS SessionID,
                SiteDistrict            AS SiteDistrict,
                COALESCE(
                    SiteVillageName,
                    CAST(SiteParish AS TEXT),
                    CAST(SiteHealthCenter AS TEXT),
                    ''
                )                       AS SiteName,
                SessionCollectionMethod AS SessionCollectionMethod
                FROM surveillance_sessions;

                CREATE VIEW IF NOT EXISTS Specimens AS
                SELECT
                SpecimenID,
                SessionID,
                Species
                FROM specimens;
                """)
            conn.commit()
            logger.info("Database tables created successfully")
    
    def insert_surveillance_data(self, df: pd.DataFrame, replace: bool = True):
        """
        Insert surveillance data into database
        
        Args:
            df: DataFrame with surveillance data
            replace: If True, replaces existing data. If False, appends.
        """
        with self.connect() as conn:
            if_exists = 'replace' if replace else 'append'
            df.to_sql('surveillance_sessions', conn, if_exists=if_exists, index=False)
            logger.info(f"Inserted {len(df)} surveillance records into database")
    
    def insert_specimens_data(self, df: pd.DataFrame, replace: bool = True):
        """
        Insert specimens data into database
        
        Args:
            df: DataFrame with specimens data
            replace: If True, replaces existing data. If False, appends.
        """
        with self.connect() as conn:
            if_exists = 'replace' if replace else 'append'
            df.to_sql('specimens', conn, if_exists=if_exists, index=False)
            logger.info(f"Inserted {len(df)} specimen records into database")
    
    def insert_metric(self, year_month: str, metric_name: str, metric_value: float, 
                     metric_json: Optional[str] = None, category: Optional[str] = None):
        """
        Insert or update a calculated metric
        
        Args:
            year_month: Year-month in YYYY-MM format
            metric_name: Name of the metric
            metric_value: Numeric value of the metric
            metric_json: Optional JSON string with detailed data
            category: Optional category for grouping metrics
        """
        with self.connect() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO monthly_metrics 
                (year_month, metric_name, metric_value, metric_json, category, calculated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (year_month, metric_name, metric_value, metric_json, category, 
                  datetime.now().isoformat()))
            conn.commit()
    
    def query(self, sql: str, params: tuple = None) -> pd.DataFrame:
        """
        Execute a SQL query and return results as DataFrame
        
        Args:
            sql: SQL query string
            params: Optional tuple of parameters for parameterized query
            
        Returns:
            DataFrame with query results
        """
        with self.connect() as conn:
            if params:
                return pd.read_sql_query(sql, conn, params=params)
            return pd.read_sql_query(sql, conn)
    
    def get_surveillance_data(self, start_date: Optional[str] = None, 
                             end_date: Optional[str] = None) -> pd.DataFrame:
        """
        Get surveillance data with optional date filtering
        
        Args:
            start_date: Optional start date (YYYY-MM-DD)
            end_date: Optional end date (YYYY-MM-DD)
            
        Returns:
            DataFrame with surveillance data
        """
        sql = "SELECT * FROM surveillance_sessions WHERE 1=1"
        params = []
        
        if start_date:
            sql += " AND SessionCollectionDate >= ?"
            params.append(start_date)
        if end_date:
            sql += " AND SessionCollectionDate <= ?"
            params.append(end_date)
        
        sql += " ORDER BY SessionCollectionDate DESC"
        
        return self.query(sql, tuple(params) if params else None)
    
    def get_specimens_data(self, start_date: Optional[str] = None,
                          end_date: Optional[str] = None,
                          species: Optional[str] = None) -> pd.DataFrame:
        """
        Get specimens data with optional filtering
        
        Args:
            start_date: Optional start date (YYYY-MM-DD)
            end_date: Optional end date (YYYY-MM-DD)
            species: Optional species filter
            
        Returns:
            DataFrame with specimens data
        """
        sql = "SELECT * FROM specimens WHERE 1=1"
        params = []
        
        if start_date:
            sql += " AND CapturedAt >= ?"
            params.append(start_date)
        if end_date:
            sql += " AND CapturedAt <= ?"
            params.append(end_date)
        if species:
            sql += " AND Species = ?"
            params.append(species)
        
        sql += " ORDER BY CapturedAt DESC"
        
        return self.query(sql, tuple(params) if params else None)
    
    def get_metrics(self, year_month: Optional[str] = None) -> pd.DataFrame:
        """
        Get calculated metrics
        
        Args:
            year_month: Optional year-month filter (YYYY-MM)
            
        Returns:
            DataFrame with metrics
        """
        sql = "SELECT * FROM monthly_metrics WHERE 1=1"
        params = []
        
        if year_month:
            sql += " AND year_month = ?"
            params.append(year_month)
        
        sql += " ORDER BY calculated_at DESC"
        
        return self.query(sql, tuple(params) if params else None)


def initialize_database() -> VectorInsightDB:
    """
    Initialize database and create tables
    
    Returns:
        VectorInsightDB instance
    """
    db = VectorInsightDB()
    db.create_tables()
    return db


if __name__ == "__main__":
    # Test database initialization
    logging.basicConfig(level=logging.INFO)
    logger.info("Testing database initialization...")
    
    db = initialize_database()
    logger.info("Database initialized successfully!")

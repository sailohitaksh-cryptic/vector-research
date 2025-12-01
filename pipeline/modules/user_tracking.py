"""
User Tracking Module for VectorResearch
Tracks field team activity, submissions, and training status
"""

import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
import sqlite3

class UserTracker:
    """Track and analyze field team user activity"""
    
    def __init__(self, db_path='data/vectorinsight.db'):
        self.db_path = db_path
        self.conn = None
        
    def connect(self):
        """Connect to database"""
        self.conn = sqlite3.connect(self.db_path)
        return self.conn
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
    
    def create_user_tracking_tables(self):
        """Create tables for user tracking"""
        conn = self.connect()
        cursor = conn.cursor()
        
        # Table 1: User/Collector Information
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS field_collectors (
            collector_id INTEGER PRIMARY KEY AUTOINCREMENT,
            collector_name TEXT UNIQUE NOT NULL,
            district TEXT,
            site TEXT,
            role TEXT DEFAULT 'Village Health Team Member',
            phone_number TEXT,
            email TEXT,
            date_registered DATE DEFAULT (date('now')),
            status TEXT DEFAULT 'Active',
            notes TEXT
        )
        """)
        
        # Table 2: Training Records
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS training_records (
            training_id INTEGER PRIMARY KEY AUTOINCREMENT,
            collector_id INTEGER NOT NULL,
            training_date DATE NOT NULL,
            training_type TEXT,
            trainer_name TEXT,
            topics_covered TEXT,
            assessment_score REAL,
            certification_status TEXT,
            notes TEXT,
            FOREIGN KEY (collector_id) REFERENCES field_collectors(collector_id)
        )
        """)
        
        # Table 3: Data Submission Log (auto-populated from surveillance data)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS submission_logs (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            collector_name TEXT NOT NULL,
            submission_date DATE NOT NULL,
            district TEXT,
            site TEXT,
            collection_method TEXT,
            num_houses INTEGER DEFAULT 0,
            num_specimens INTEGER DEFAULT 0,
            data_quality_score REAL,
            notes TEXT
        )
        """)
        
        conn.commit()
        self.close()
        print("✓ User tracking tables created successfully")
    
    def register_collector(self, name, district=None, site=None, role='Village Health Team Member', 
                          phone=None, email=None, status='Active'):
        """Register a new field collector"""
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
            INSERT INTO field_collectors 
            (collector_name, district, site, role, phone_number, email, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (name, district, site, role, phone, email, status))
            
            conn.commit()
            print(f"✓ Registered collector: {name}")
            return cursor.lastrowid
        except sqlite3.IntegrityError:
            print(f"! Collector {name} already registered")
            return None
        finally:
            self.close()
    
    def add_training_record(self, collector_name, training_date, training_type='Initial Training',
                           trainer_name=None, topics=None, score=None, certification='Certified'):
        """Add training record for a collector"""
        conn = self.connect()
        cursor = conn.cursor()
        
        # Get collector_id
        cursor.execute("SELECT collector_id FROM field_collectors WHERE collector_name = ?", (collector_name,))
        result = cursor.fetchone()
        
        if not result:
            print(f"! Collector {collector_name} not found. Registering first...")
            self.close()
            collector_id = self.register_collector(collector_name)
            conn = self.connect()
            cursor = conn.cursor()
        else:
            collector_id = result[0]
        
        cursor.execute("""
        INSERT INTO training_records 
        (collector_id, training_date, training_type, trainer_name, topics_covered, 
         assessment_score, certification_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (collector_id, training_date, training_type, trainer_name, topics, score, certification))
        
        conn.commit()
        self.close()
        print(f"✓ Added training record for {collector_name}")
    
    def update_submission_logs_from_surveillance(self):
        """
        Extract submission data from surveillance table and populate submission logs
        This should be run after data processing pipeline
        """
        conn = self.connect()
        
        # Get submission data from surveillance table
        query = """
        SELECT 
            s.CollectorName as collector_name,
            DATE(s.SessionCollectionDate) as submission_date,
            s.SiteDistrict as district,
            s.SiteName as site,
            s.SessionCollectionMethod as collection_method,
            COUNT(DISTINCT s.SessionID) as num_houses,
            COUNT(sp.SpecimenID) as num_specimens
        FROM surveillance_sessions s
        LEFT JOIN specimens sp ON s.SessionID = sp.SessionID
        WHERE s.SessionCollectorName IS NOT NULL AND s.SessionCollectorName != ''
        GROUP BY s.SessionCollectorName, DATE(s.SessionCollectionDate), s.SiteDistrict, 
                 s.SiteName, s.SessionCollectionMethod
        """
        
        submissions = pd.read_sql_query(query, conn)
        
        # Clear old submission logs
        cursor = conn.cursor()
        cursor.execute("DELETE FROM submission_logs")
        
        # Insert new submission logs
        for _, row in submissions.iterrows():
            cursor.execute("""
            INSERT INTO submission_logs 
            (collector_name, submission_date, district, site, collection_method, 
             num_houses, num_specimens)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (row['collector_name'], row['submission_date'], row['district'], 
                  row['site'], row['collection_method'], row['num_houses'], row['num_specimens']))
        
        conn.commit()
        self.close()
        print(f"✓ Updated submission logs: {len(submissions)} records")
    
    def get_collector_summary(self):
        """Get summary of all collectors with their activity"""
        conn = self.connect()
        
        query = """
        SELECT 
            fc.collector_name,
            fc.district,
            fc.site,
            fc.role,
            fc.status,
            fc.date_registered,
            MAX(tr.training_date) as last_training_date,
            tr.training_type as last_training_type,
            MAX(sl.submission_date) as last_submission_date,
            COUNT(DISTINCT sl.submission_date) as total_submission_days,
            SUM(sl.num_houses) as total_houses_collected,
            SUM(sl.num_specimens) as total_specimens_collected
        FROM field_collectors fc
        LEFT JOIN training_records tr ON fc.collector_id = (
            SELECT collector_id FROM training_records 
            WHERE collector_id = fc.collector_id 
            ORDER BY training_date DESC LIMIT 1
        )
        LEFT JOIN submission_logs sl ON fc.collector_name = sl.collector_name
        GROUP BY fc.collector_id
        ORDER BY last_submission_date DESC
        """
        
        df = pd.read_sql_query(query, conn)
        self.close()
        
        # Add calculated fields
        today = pd.Timestamp.now()
        
        if not df.empty:
            df['last_submission_date'] = pd.to_datetime(df['last_submission_date'])
            df['last_training_date'] = pd.to_datetime(df['last_training_date'])
            
            df['days_since_last_submission'] = (today - df['last_submission_date']).dt.days
            df['days_since_training'] = (today - df['last_training_date']).dt.days
            
            # Activity status
            df['activity_status'] = df['days_since_last_submission'].apply(
                lambda x: 'Active (< 7 days)' if pd.notna(x) and x < 7 
                else 'Inactive (7-30 days)' if pd.notna(x) and x < 30
                else 'Dormant (> 30 days)' if pd.notna(x)
                else 'No Submissions'
            )
            
            # Training status
            df['training_status'] = df['days_since_training'].apply(
                lambda x: 'Recent (< 90 days)' if pd.notna(x) and x < 90
                else 'Due for Refresher (90-180 days)' if pd.notna(x) and x < 180
                else 'Needs Training (> 180 days)' if pd.notna(x)
                else 'No Training Record'
            )
        
        return df
    
    def get_collectors_needing_attention(self):
        """Get list of collectors who need follow-up"""
        df = self.get_collector_summary()
        
        needs_attention = df[
            (df['activity_status'].isin(['Inactive (7-30 days)', 'Dormant (> 30 days)', 'No Submissions'])) |
            (df['training_status'].isin(['Due for Refresher (90-180 days)', 'Needs Training (> 180 days)']))
        ].copy()
        
        return needs_attention
    
    def get_daily_submission_summary(self, start_date=None, end_date=None):
        """Get daily submission statistics"""
        conn = self.connect()
        
        query = """
        SELECT 
            submission_date,
            COUNT(DISTINCT collector_name) as num_collectors,
            COUNT(*) as num_submissions,
            SUM(num_houses) as total_houses,
            SUM(num_specimens) as total_specimens
        FROM submission_logs
        """
        
        if start_date:
            query += f" WHERE submission_date >= '{start_date}'"
        if end_date:
            query += f" AND submission_date <= '{end_date}'" if start_date else f" WHERE submission_date <= '{end_date}'"
        
        query += " GROUP BY submission_date ORDER BY submission_date"
        
        df = pd.read_sql_query(query, conn)
        self.close()
        
        if not df.empty:
            df['submission_date'] = pd.to_datetime(df['submission_date'])
        
        return df
    
    def auto_register_collectors_from_surveillance(self):
        """Automatically register all collectors found in surveillance data"""
        conn = self.connect()
        
        # Get unique collectors from surveillance data
        query = """
        SELECT DISTINCT 
            s.CollectorName as name,
            s.SiteDistrict as district,
            s.SiteName as site
        FROM surveillance_sessions s
        WHERE s.SessionCollectorName IS NOT NULL AND s.SessionCollectorName != ''
        """
        
        collectors = pd.read_sql_query(query, conn)
        self.close()
        
        registered_count = 0
        for _, row in collectors.iterrows():
            result = self.register_collector(
                name=row['name'],
                district=row['district'],
                site=row['site']
            )
            if result:
                registered_count += 1
        
        print(f"✓ Auto-registered {registered_count} new collectors")
        return registered_count


# Convenience functions for pipeline integration
def initialize_user_tracking():
    """Initialize user tracking system"""
    import config
    # ✅ FIX: Use the correct database path from config
    tracker = UserTracker(db_path=str(config.DB_PATH))
    tracker.create_user_tracking_tables()
    tracker.auto_register_collectors_from_surveillance()
    tracker.update_submission_logs_from_surveillance()
    return tracker

def update_user_logs():
    """Update user logs after data processing"""
    import config
    # ✅ FIX: Use the correct database path from config
    tracker = UserTracker(db_path=str(config.DB_PATH))
    tracker.create_user_tracking_tables()
    tracker.auto_register_collectors_from_surveillance()
    tracker.update_submission_logs_from_surveillance()
    print("✓ User logs updated")


if __name__ == "__main__":
    # Test the system
    print("Initializing user tracking system...")
    tracker = initialize_user_tracking()
    
    # Show summary
    summary = tracker.get_collector_summary()
    print(f"\nTotal collectors: {len(summary)}")
    print(summary[['collector_name', 'district', 'last_submission_date', 'activity_status']].head())
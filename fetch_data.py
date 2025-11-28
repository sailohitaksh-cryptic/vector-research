#!/usr/bin/env python3
"""
VectorCam Data Fetcher
Fetches data from VectorCam API and stores in SQLite database
Run this in your React repo: python fetch_data.py
"""

import os
import sqlite3
import requests
import pandas as pd
from datetime import datetime
from io import StringIO

# Configuration
VECTORCAM_API_KEY = os.getenv('VECTORCAM_API_KEY', '')  # Set your API key
SURVEILLANCE_URL = 'http://api.vectorcam.org/sessions/export/surveillance-forms/csv'
SPECIMENS_URL = 'http://api.vectorcam.org/specimens/export/csv'
DB_PATH = 'backend/data/vectorinsight.db'

def fetch_csv_data(url, name):
    """Fetch CSV data from VectorCam API"""
    print(f"\n📥 Fetching {name} data from VectorCam API...")
    
    headers = {
        'Authorization': f'Bearer {VECTORCAM_API_KEY}',
        'Accept': 'text/csv'
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        raise Exception(f"Failed to fetch {name}: HTTP {response.status_code}")
    
    df = pd.read_csv(StringIO(response.text))
    print(f"✅ Fetched {len(df)} {name} records")
    
    return df

def create_database(surveillance_df, specimens_df):
    """Create SQLite database with surveillance and specimens data"""
    print(f"\n💾 Creating database at {DB_PATH}...")
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    
    # Store surveillance data
    surveillance_df.to_sql('surveillance_sessions', conn, if_exists='replace', index=False)
    print(f"✅ Stored {len(surveillance_df)} surveillance records")
    
    # Store specimens data
    specimens_df.to_sql('specimens', conn, if_exists='replace', index=False)
    print(f"✅ Stored {len(specimens_df)} specimen records")
    
    # Create views for easier querying (matching backend expectations)
    conn.execute('DROP VIEW IF EXISTS Surveillance')
    conn.execute('''
        CREATE VIEW Surveillance AS
        SELECT * FROM surveillance_sessions
    ''')
    
    conn.execute('DROP VIEW IF EXISTS Specimens')
    conn.execute('''
        CREATE VIEW Specimens AS
        SELECT * FROM specimens
    ''')
    
    conn.commit()
    conn.close()
    
    print(f"✅ Database created successfully!")

def calculate_summary(surveillance_df, specimens_df):
    """Calculate and display summary statistics"""
    print("\n📊 Data Summary:")
    print(f"   Collections: {len(surveillance_df)}")
    print(f"   Specimens: {len(specimens_df)}")
    
    if 'SiteDistrict' in surveillance_df.columns:
        districts = surveillance_df['SiteDistrict'].nunique()
        print(f"   Districts: {districts}")
    
    if 'Species' in specimens_df.columns:
        species = specimens_df['Species'].value_counts().head(5)
        print(f"\n   Top 5 Species:")
        for sp, count in species.items():
            print(f"      {sp}: {count}")

def main():
    """Main execution function"""
    print("=" * 80)
    print("🦟 VectorCam Data Fetcher")
    print("=" * 80)
    
    # Check for API key
    if not VECTORCAM_API_KEY:
        print("\n⚠️  Warning: VECTORCAM_API_KEY not set!")
        print("Set it with: export VECTORCAM_API_KEY=your-api-key")
        print("Or create a .env file with: VECTORCAM_API_KEY=your-api-key")
        return
    
    try:
        # Fetch data
        surveillance_df = fetch_csv_data(SURVEILLANCE_URL, 'surveillance')
        specimens_df = fetch_csv_data(SPECIMENS_URL, 'specimens')
        
        # Create database
        create_database(surveillance_df, specimens_df)
        
        # Show summary
        calculate_summary(surveillance_df, specimens_df)
        
        print("\n" + "=" * 80)
        print("✅ SUCCESS! Data fetched and stored in database")
        print(f"   Database: {DB_PATH}")
        print("\n📝 Next steps:")
        print("   1. Start backend: cd backend && npm start")
        print("   2. Start frontend: cd frontend && npm run dev")
        print("   3. Open: http://localhost:3000")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nTroubleshooting:")
        print("   - Check your VECTORCAM_API_KEY is correct")
        print("   - Verify you have internet connection")
        print("   - Make sure pandas and requests are installed: pip install pandas requests")

if __name__ == '__main__':
    main()
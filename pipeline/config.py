"""
VectorInsight Configuration Module
Loads all configuration from environment variables
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Project Root (pipeline directory)
PROJECT_ROOT = Path(__file__).parent

# API Configuration
API_BASE_URL = os.getenv('API_BASE_URL', 'https://test.api.vectorcam.org')  # ✅ UPDATED to production
API_KEY = os.getenv('API_SECRET_KEY') or os.getenv('VECTORCAM_API_KEY')

# API Endpoints
SURVEILLANCE_ENDPOINT = f"{API_BASE_URL}/sessions/export/surveillance-forms/csv"
SPECIMENS_ENDPOINT = f"{API_BASE_URL}/specimens/export/csv"

# Database Configuration - POINTS TO BACKEND
DB_PATH = PROJECT_ROOT.parent / 'backend' / 'data' / 'vectorinsight.db'  # ✅ FIXED

# Data Storage - ALL EXPORTS GO TO BACKEND
EXPORTS_DIR = PROJECT_ROOT.parent / 'backend' / 'data' / 'exports'  # ✅ NEW
RAW_DATA_DIR = PROJECT_ROOT / os.getenv('RAW_DATA_DIR', 'data/raw')
LOGS_DIR = PROJECT_ROOT / os.getenv('LOGS_DIR', 'data/logs')

# Dashboard Configuration
DASHBOARD_TITLE = os.getenv('DASHBOARD_TITLE', 'VectorInsight Dashboard')
DASHBOARD_PORT = int(os.getenv('DASHBOARD_PORT', 8501))

# Create directories if they don't exist
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
LOGS_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)  # ✅ CREATE EXPORTS DIR
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


# Print paths for verification
print("="*60)
print("VectorInsight Configuration")
print("="*60)
print(f"API Base URL: {API_BASE_URL}")
print(f"Database Path: {DB_PATH}")
print(f"Exports Directory: {EXPORTS_DIR}")
print(f"Raw Data Directory: {RAW_DATA_DIR}")
print(f"Logs Directory: {LOGS_DIR}")
print("="*60)
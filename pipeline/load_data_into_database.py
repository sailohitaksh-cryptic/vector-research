"""
Load Data into Database
Loads CSV exports into SQLite database
"""
from pathlib import Path
import sqlite3
import pandas as pd

# ✅ FIXED: Use correct paths relative to pipeline directory
BASE_DIR = Path(__file__).resolve().parent
EXPORTS_DIR = BASE_DIR.parent / "backend" / "data" / "exports"  # backend/data/exports
DB_PATH = BASE_DIR.parent / "backend" / "data" / "vectorinsight.db"  # backend/data/vectorinsight.db

def _latest(pattern: str) -> Path:
    """Find the latest file matching pattern"""
    files = sorted(EXPORTS_DIR.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        raise FileNotFoundError(f"No files matched {pattern} under {EXPORTS_DIR}")
    return files[0]

def _drop_object(conn, name: str):
    """Safely drop table or view"""
    # Disable FKs to allow swapping the table safely
    conn.execute("PRAGMA foreign_keys=OFF;")
    # Drop either a table or a view with this name, plus any leftover indexes/triggers
    conn.execute(f"DROP TABLE IF EXISTS \"{name}\";")
    conn.execute(f"DROP VIEW  IF EXISTS \"{name}\";")
    # Clean up potential stray indexes/triggers created in earlier runs
    for obj_type in ("index", "trigger"):
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type=? AND tbl_name=?;",
            (obj_type, name)
        ).fetchall()
        for (obj_name,) in rows:
            conn.execute(f"DROP {obj_type.upper()} IF EXISTS \"{obj_name}\";")
    conn.execute("PRAGMA foreign_keys=ON;")

def load_data_to_database():
    """Load CSV exports into database"""
    print("="*60)
    print("MANUAL DATABASE LOADER")
    print("="*60)
    print(f"Exports directory: {EXPORTS_DIR}")
    print(f"Database path: {DB_PATH}")
    print("="*60)

    if not EXPORTS_DIR.exists():
        print(f"❌ Error: {EXPORTS_DIR} does not exist")
        print(f"   Run pipeline first to generate exports")
        return False

    csvs = list(EXPORTS_DIR.glob("*.csv"))
    if not csvs:
        print(f"❌ Error: No CSV files found in {EXPORTS_DIR}")
        print(f"   Run pipeline first: python pipeline.py")
        return False

    print(f"Found {len(csvs)} CSV files in exports directory")

    # Pick the latest of each logical export
    try:
        surv_csv = _latest("cleaned_surveillance_*.csv")
        spec_csv = _latest("cleaned_specimens_*.csv")
        print(f"✓ Latest surveillance CSV: {surv_csv.name}")
        print(f"✓ Latest specimens CSV: {spec_csv.name}")
    except FileNotFoundError as e:
        print(f"❌ Error: {e}")
        return False

    # Read CSVs
    print("\n📖 Reading CSV files...")
    surv_df = pd.read_csv(surv_csv)
    spec_df = pd.read_csv(spec_csv)
    print(f"✓ Surveillance records: {len(surv_df)}")
    print(f"✓ Specimens records: {len(spec_df)}")

    # Compute safe chunksizes for SQLite (max ~999 variables)
    MAX_SQL_VARS = 999
    def safe_chunksize(df, floor=100, ceil=1000, margin=10):
        ncols = max(1, df.shape[1])
        # leave a small margin so we don't sit exactly on the limit
        max_rows = max(1, (MAX_SQL_VARS - margin) // ncols)
        return max(floor, min(ceil, max_rows))

    surv_chunks = safe_chunksize(surv_df)
    spec_chunks = safe_chunksize(spec_df)

    with sqlite3.connect(DB_PATH) as conn:
        # slightly faster + safer for bulk loads
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA foreign_keys=OFF;")

        print("\n🧹 Dropping/clearing existing tables if present...")
        _drop_object(conn, "Surveillance")
        _drop_object(conn, "Specimens")

        print(f"\n💾 Writing to database (replace)... (surv_chunks={surv_chunks}, spec_chunks={spec_chunks})")
        surv_df.to_sql("Surveillance", conn, if_exists="replace", index=False,
                    method="multi", chunksize=surv_chunks)
        spec_df.to_sql("Specimens",   conn, if_exists="replace", index=False,
                    method="multi", chunksize=spec_chunks)

        conn.execute("PRAGMA foreign_keys=ON;")

        sc = conn.execute("SELECT COUNT(*) FROM Surveillance").fetchone()[0]
        pc = conn.execute("SELECT COUNT(*) FROM Specimens").fetchone()[0]
        print(f"✅ Verification: Surveillance={sc} rows, Specimens={pc} rows")

    print("\n🎉 Done. Next steps:")
    print("  1) python add_training_data.py (optional)")
    print("  2) cd ../backend && npm start")
    print("  3) cd ../frontend && npm run dev")
    return True

if __name__ == "__main__":
    ok = load_data_to_database()
    if not ok:
        print("\n❌ FAILED - Check error messages above")
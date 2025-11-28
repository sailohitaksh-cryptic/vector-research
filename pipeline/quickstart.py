"""
Quick Start Script for VectorInsight
Run this to set up and test your installation
"""
import sys
import subprocess
from pathlib import Path

def print_header(text):
    print("\n" + "="*80)
    print(text)
    print("="*80 + "\n")

def check_dependencies():
    """Check if required packages are installed"""
    print_header("Step 1: Checking Dependencies")
    
    required = [
        'pandas', 'numpy', 'sqlalchemy', 'requests', 
        'python-dotenv', 'streamlit', 'plotly'
    ]
    
    missing = []
    for package in required:
        try:
            __import__(package.replace('-', '_'))
            print(f"✓ {package}")
        except ImportError:
            print(f"✗ {package} - MISSING")
            missing.append(package)
    
    if missing:
        print(f"\n❌ Missing packages: {', '.join(missing)}")
        print(f"Install with: pip install {' '.join(missing)}")
        return False
    
    print("\n✅ All dependencies installed!")
    return True

def check_config():
    """Check if .env file exists"""
    print_header("Step 2: Checking Configuration")
    
    env_file = Path('.env')
    env_example = Path('.env.example')
    
    if env_file.exists():
        print("✓ .env file found")
        
        # Check if API key is set
        with open(env_file) as f:
            content = f.read()
            if 'your-secret-key-here' in content or 'API_SECRET_KEY=' not in content:
                print("⚠️  Warning: API_SECRET_KEY may not be configured")
                print("   Edit .env and add your actual API key")
            else:
                print("✓ API_SECRET_KEY appears to be configured")
        return True
    else:
        print("✗ .env file not found")
        if env_example.exists():
            print(f"\n📝 Creating .env from template...")
            import shutil
            shutil.copy(env_example, env_file)
            print(f"✓ Created .env file")
            print(f"⚠️  IMPORTANT: Edit .env and add your API_SECRET_KEY")
            return False
        else:
            print("❌ .env.example not found!")
            return False

def test_pipeline():
    """Test the pipeline with existing data"""
    print_header("Step 3: Testing Pipeline")
    
    try:
        sys.path.append(str(Path.cwd()))
        import pandas as pd
        from modules.data_processing import process_data
        from modules.database import VectorInsightDB
        
        print("Loading sample data...")
        
        # Check if uploaded files exist
        surv_path = Path('/mnt/user-data/uploads/surveillance.csv')
        spec_path = Path('/mnt/user-data/uploads/specimens.csv')
        
        if not surv_path.exists() or not spec_path.exists():
            print("⚠️  Sample data files not found")
            print("   You can run the pipeline when you have data")
            return True
        
        surv = pd.read_csv(surv_path)
        spec = pd.read_csv(spec_path)
        
        print(f"✓ Loaded {len(surv)} surveillance records")
        print(f"✓ Loaded {len(spec)} specimen records")
        
        print("\nProcessing data...")
        clean_surv, clean_spec, merged = process_data(surv, spec)
        print(f"✓ Processed successfully")
        
        print("\nInitializing database...")
        db = VectorInsightDB()
        db.create_tables()
        print(f"✓ Database initialized at: {db.db_path}")
        
        print("\nStoring data...")
        db.insert_surveillance_data(clean_surv)
        db.insert_specimens_data(clean_spec)
        print(f"✓ Data stored successfully")
        
        print("\n✅ Pipeline test passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ Pipeline test failed: {str(e)}")
        return False

def show_next_steps():
    """Show next steps to user"""
    print_header("Next Steps")
    
    print("🎉 Setup complete! Here's what to do next:\n")
    
    print("1️⃣  Configure your API key (if not done yet):")
    print("   • Edit .env file")
    print("   • Add your API_SECRET_KEY\n")
    
    print("2️⃣  Run the pipeline to fetch data:")
    print("   • python pipeline.py\n")
    
    print("3️⃣  Launch the dashboard:")
    print("   • streamlit run dashboard/app.py\n")
    
    print("4️⃣  Optional - Test with existing data:")
    print("   • python pipeline.py --skip-extraction\n")
    
    print("📚 For more information, see README.md\n")

def main():
    print("""
    ╔══════════════════════════════════════════════════════════╗
    ║                                                          ║
    ║           🦟 VectorInsight Quick Start 🦟               ║
    ║                                                          ║
    ║    Automated Mosquito Surveillance Dashboard Setup      ║
    ║                                                          ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    # Run checks
    deps_ok = check_dependencies()
    config_ok = check_config()
    
    if not deps_ok:
        print("\n❌ Please install missing dependencies first")
        print("Run: pip install -r requirements.txt")
        return
    
    if not config_ok:
        print("\n⚠️  Configuration incomplete")
        print("Please edit .env file and add your API key")
    
    # Test pipeline
    test_ok = test_pipeline()
    
    # Show next steps
    show_next_steps()
    
    if deps_ok and test_ok:
        print("✅ Everything looks good! You're ready to go!")
    else:
        print("⚠️  Some issues found. Please fix them before proceeding.")

if __name__ == "__main__":
    main()

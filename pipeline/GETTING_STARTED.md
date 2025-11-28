# 🚀 Getting Started with VectorInsight

Welcome! This guide will help you get VectorInsight up and running in minutes.

## 📦 What You Have

You now have a complete data pipeline and dashboard system that:
- ✅ Pulls data from VectorCam API
- ✅ Processes and cleans mosquito surveillance data
- ✅ Calculates 50+ entomological metrics
- ✅ Displays interactive visualizations
- ✅ Filters by date, location, method, and species
- ✅ Is ready for AWS migration

## ⚡ Quick Start (5 Steps)

### Step 1: Extract the Project
```bash
# Navigate to where you downloaded the project
cd vectorinsight_pipeline
```

### Step 2: Install Dependencies
```bash
pip install -r requirements.txt
```

This installs: pandas, streamlit, plotly, sqlalchemy, and other required packages.

### Step 3: Configure Your API Key
```bash
# Copy the example config file
cp .env.example .env

# Edit .env and add your API key
# Change this line:
#   API_SECRET_KEY=your-secret-key-here
# To:
#   API_SECRET_KEY=your-actual-key
```

### Step 4: Run the Data Pipeline
```bash
# Option A: Pull fresh data from API (recommended)
python pipeline.py

# Option B: Use existing test data (for testing)
python pipeline.py --skip-extraction
```

The pipeline will:
- Extract data from API
- Clean and process it
- Calculate metrics
- Store in database
- Generate summary report

### Step 5: Launch the Dashboard
```bash
streamlit run dashboard/app.py
```

Your browser will open automatically at `http://localhost:8501`

## 🎉 You're Done!

Explore the dashboard:
- Try different filters in the sidebar
- Click through the 6 tabs
- Hover over charts for details
- Adjust date ranges

## 📖 File Guide

### Essential Files
- `pipeline.py` - Run this to update data
- `dashboard/app.py` - The interactive dashboard
- `.env` - Your configuration (API keys)
- `requirements.txt` - Python dependencies

### Documentation
- `README.md` - Complete documentation
- `PROJECT_SUMMARY.md` - Project overview
- `GETTING_STARTED.md` - This file

### Modules (Don't Edit Unless Needed)
- `modules/data_extraction.py` - API calls
- `modules/data_processing.py` - Data cleaning
- `modules/metrics_calculator.py` - Calculations
- `modules/database.py` - Database operations

### Data Storage
- `data/raw/` - Monthly Parquet snapshots
- `data/logs/` - Execution logs
- `data/vectorinsight.db` - SQLite database

## 🔧 Common Commands

### Update Data (Monthly)
```bash
python pipeline.py
```

### View Dashboard
```bash
streamlit run dashboard/app.py
```

### Test Without API
```bash
python pipeline.py --skip-extraction
```

### Run Setup Check
```bash
python quickstart.py
```

## 🎯 What's in the Dashboard?

### Top Metrics (Always Visible)
- Total collections
- Total specimens
- Anopheles count
- Unique sites
- Avg specimens per collection

### Tab 1: Temporal Trends 📈
- Collections over time
- Specimens by month
- Seasonal patterns

### Tab 2: Species Composition 🦟
- Species pie chart
- Top 15 species bar chart
- Anopheles breakdown

### Tab 3: Indoor Density 🏠
- Mosquitoes per house (PSC)
- Anopheles per house
- Density trends

### Tab 4: Interventions 🛡️
- IRS coverage
- LLIN usage rates
- Net types distribution

### Tab 5: Collection Methods 🔬
- Methods comparison
- Efficiency analysis
- Specimens per collection

### Tab 6: Geographic Distribution 📍
- Collections by district
- Specimens by location
- Regional comparisons

### Sidebar Filters 🔍
- Date range
- Districts
- Collection methods
- Species

All filters work together!

## 🆘 Troubleshooting

### "ModuleNotFoundError"
**Problem:** Missing Python packages  
**Solution:** `pip install -r requirements.txt`

### "API_SECRET_KEY not configured"
**Problem:** API key not set  
**Solution:** Edit `.env` file and add your key

### "No data available" in dashboard
**Problem:** Database empty  
**Solution:** Run `python pipeline.py` first

### Dashboard won't start
**Problem:** Port 8501 in use  
**Solution:** `streamlit run dashboard/app.py --server.port 8502`

### Pipeline fails
**Problem:** Various issues  
**Solution:** Check logs in `data/logs/` directory

## 📚 Learn More

### Documentation
- **README.md** - Full documentation with examples
- **PROJECT_SUMMARY.md** - Technical overview
- Code comments - Every module is well-documented

### Need Help?
1. Check the logs: `data/logs/pipeline_*.log`
2. Run diagnostics: `python quickstart.py`
3. Review troubleshooting section in README.md

## 🎓 Understanding the Workflow

```
┌─────────────┐
│   You Run   │
│ pipeline.py │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│   API Fetches    │
│  surveillance &  │
│   specimens.csv  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Data Cleaning   │
│  & Processing    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Calculate 50+    │
│     Metrics      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Store in DB &   │
│  Parquet Files   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   You Launch     │
│  Dashboard       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Interactive     │
│  Visualizations  │
└──────────────────┘
```

## ⏰ Scheduling (Future)

### Manual (Current)
```bash
# Run when needed
python pipeline.py
```

### Automated (To Setup Later)
**Linux/Mac (cron):**
```bash
# Edit crontab
crontab -e

# Run on 1st of each month at 1 AM
0 1 1 * * cd /path/to/vectorinsight_pipeline && python pipeline.py
```

**Windows (Task Scheduler):**
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Monthly
4. Action: Start a Program
5. Program: `python`
6. Arguments: `C:\path\to\pipeline.py`

## 🚀 AWS Migration (Future)

When ready to move to AWS:

### Current (Local)
```
Your Computer
├── Python script
├── SQLite
└── Files
```

### Future (Cloud)
```
AWS
├── Lambda (pipeline)
├── RDS (database)
├── S3 (files)
├── Fargate (dashboard)
└── EventBridge (schedule)
```

The code is designed to make this transition smooth!

## 📝 Before Your Meeting Tomorrow

1. ✅ Test the dashboard
2. ✅ Review available metrics
3. ✅ Think about which metrics should be default
4. ✅ Note any missing calculations
5. ✅ Prepare questions about definitions

## ✨ Pro Tips

### Speed Up Dashboard Loading
- Use date range filters
- Select specific districts
- Filter to key species

### Data Quality
- Check the Data Quality tab
- Review logs regularly
- Monitor completeness metrics

### Best Practices
- Run pipeline monthly
- Keep raw data backups
- Review summary reports
- Test before production deployment

## 🎊 Congratulations!

You now have a fully functional mosquito surveillance dashboard. The foundation is solid and ready for:
- ✅ PRISM integration
- ✅ LLM query interface  
- ✅ AWS deployment
- ✅ Team collaboration
- ✅ Advanced analytics

Good luck with your meeting tomorrow! 🚀

---

**Questions?** Check README.md or review the code comments.  
**Issues?** Run `python quickstart.py` for diagnostics.  
**Ready?** Run `python pipeline.py` and `streamlit run dashboard/app.py`!

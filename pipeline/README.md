# VectorInsight Dashboard

Automated data pipeline and interactive dashboard for mosquito surveillance and vector control analytics.

## 📋 Overview

VectorInsight pulls data from the VectorCam API, processes entomological surveillance data, calculates key metrics, and presents them in an interactive web-based dashboard for public health decision-making.

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  VectorCam API  │────▶│  Data Pipeline   │────▶│   Dashboard     │
│  (surveillance  │     │  • Extract       │     │  (Streamlit)    │
│   & specimens)  │     │  • Clean         │     │  • Interactive  │
└─────────────────┘     │  • Calculate     │     │  • Filterable   │
                        │  • Store         │     │  • Exportable   │
                        └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │  Data Storage    │
                        │  • Parquet       │
                        │  • SQLite        │
                        └──────────────────┘
```

## 📁 Project Structure

```
vectorinsight_pipeline/
├── config.py                     # Configuration management
├── pipeline.py                   # Main orchestration script
├── requirements.txt              # Python dependencies
├── .env.example                  # Environment variables template
├── modules/
│   ├── data_extraction.py        # API data fetching
│   ├── data_processing.py        # Data cleaning & transformation
│   ├── metrics_calculator.py     # Metric calculations
│   └── database.py               # SQLite operations
├── dashboard/
│   ├── app.py                    # Streamlit dashboard
│   └── components/               # Dashboard components (future)
└── data/
    ├── raw/                      # Monthly Parquet snapshots
    ├── logs/                     # Pipeline execution logs
    └── vectorinsight.db          # SQLite database
```

## 🚀 Quick Start

### 1. Installation

```bash
# Clone or navigate to the project directory
cd vectorinsight_pipeline

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Edit `.env` and add your API credentials:

```
API_SECRET_KEY=your-actual-api-key-here
```

### 3. Run the Pipeline

```bash
# Run pipeline (pulls data from API)
python pipeline.py

# Or run with existing data (skip API call)
python pipeline.py --skip-extraction
```

### 4. Launch Dashboard

```bash
# Start the dashboard
streamlit run dashboard/app.py
```

The dashboard will open in your browser at `http://localhost:8501`

## 📊 Dashboard Features

### Default Metrics (Always Visible)
1. **Collections Timeline** - Temporal trends of field collections
2. **Species Composition** - Pie and bar charts of mosquito species
3. **Indoor Resting Density** - Mosquitoes per house from PSC data
4. **Blood-Feeding Rates** - Fed vs unfed mosquitoes
5. **LLIN Usage** - Bed net coverage and usage rates
6. **IRS Coverage** - Indoor residual spraying coverage

### Interactive Filters
- **Date Range** - Select custom time periods
- **Geographic** - Filter by district/site
- **Collection Method** - PSC, HLC, CDC Light Trap, etc.
- **Species** - Focus on specific mosquito species

### Tabs & Visualizations
- 📈 **Temporal Trends** - Time series of collections and specimens
- 🦟 **Species Composition** - Detailed species breakdowns
- 🏠 **Indoor Density** - PSC-based resting density metrics
- 🛡️ **Interventions** - LLIN and IRS coverage analysis
- 🔬 **Collection Methods** - Method comparison and efficiency
- 📍 **Geographic Distribution** - Site/district comparisons

## 📈 Key Metrics Calculated

### Temporal Metrics
- Collections by month/quarter/year
- Specimens by month/quarter/year
- Seasonal trends

### Species Metrics
- Total specimens by species
- Anopheles vs other mosquitoes
- Species groups (gambiae complex, funestus group, etc.)
- Sex ratios
- Species by collection method

### Collection Method Metrics
- Collections by method
- Specimens per collection by method
- Method efficiency comparison

### Intervention Metrics
- IRS coverage rate (% of households)
- LLIN availability per household
- LLIN usage rate (% of people sleeping under nets)
- LLIN types distribution (Pyrethroid, PBO, Chlorfenapyr)

### Blood-Feeding Metrics
- Feeding status (Fed, Unfed, Half Gravid, Gravid)
- Feeding rates by species
- Blood-feeding patterns over time

### Indoor Resting Density (PSC)
- Average mosquitoes per house
- Average Anopheles per house
- Density trends over time
- Density by district

### Geographic Metrics
- Collections by district/site
- Species distribution by location
- Intervention coverage by location

## 🗄️ Data Storage

### Parquet Files (Raw Data Archive)
- `data/raw/surveillance_YYYY_MM.parquet` - Monthly snapshots
- `data/raw/specimens_YYYY_MM.parquet` - Monthly snapshots
- Timestamped backups for audit trail

### SQLite Database (Processed Data)
- `surveillance_sessions` - Collection session details
- `specimens` - Individual mosquito specimens
- `monthly_metrics` - Pre-calculated aggregations

### Benefits of Hybrid Approach
✅ Historical tracking with monthly snapshots  
✅ Fast queries with indexed database  
✅ Easy migration to AWS (S3 + RDS/Athena)  
✅ Audit trail with timestamped backups  

## 🔧 Pipeline Operations

### Manual Execution
```bash
# Full pipeline with API pull
python pipeline.py

# Use existing data (testing/development)
python pipeline.py --skip-extraction
```

### Scheduled Execution (Future)
```bash
# Using cron (Linux/Mac)
0 1 1 * * cd /path/to/vectorinsight_pipeline && python pipeline.py

# Using Task Scheduler (Windows)
# Create task to run pipeline.py on 1st of each month
```

### Pipeline Steps
1. **Extract** - Pull data from VectorCam API
2. **Clean** - Handle missing values, standardize formats
3. **Transform** - Add derived fields, categorize data
4. **Store** - Save to Parquet and SQLite
5. **Calculate** - Compute all metrics
6. **Report** - Generate summary report

## 📝 Logging

Logs are saved in `data/logs/`:
- `pipeline_YYYYMMDD_HHMMSS.log` - Pipeline execution logs
- `summary_report_YYYYMMDD_HHMMSS.txt` - Summary statistics

## 🔐 Security & Configuration

### Environment Variables
Store sensitive data in `.env` file (NOT in git):
- `API_SECRET_KEY` - VectorCam API authentication
- `DB_PATH` - Database file location
- `RAW_DATA_DIR` - Raw data storage location

### Data Security
- API key stored securely in `.env`
- Add `.env` to `.gitignore`
- Consider encrypting sensitive data at rest

## 🚀 AWS Migration Path

### Current (Local)
```
Local Machine
├── Python Scripts
├── SQLite Database
└── Parquet Files
```

### Future (AWS)
```
AWS Cloud
├── Lambda/ECS (Pipeline)
├── RDS/Aurora (Database)
├── S3 (Data Lake)
├── Fargate/EC2 (Dashboard)
└── EventBridge (Scheduling)
```

### Migration Steps
1. **Data Storage**: SQLite → RDS PostgreSQL
2. **Files**: Local Parquet → S3 buckets
3. **Pipeline**: Python script → Lambda/ECS Task
4. **Scheduling**: Manual → EventBridge
5. **Dashboard**: Local Streamlit → Fargate/EC2
6. **Access**: Single user → Load Balancer + Auth

## 🔮 Future Enhancements

### Phase 1 (Current)
✅ Data extraction from API  
✅ Data cleaning and processing  
✅ Metrics calculation  
✅ Interactive dashboard  
✅ Filtering and exploration  

### Phase 2 (Near-term)
- [ ] PRISM integration (epi, climate data)
- [ ] Automated scheduling
- [ ] Email notifications
- [ ] Data quality alerts
- [ ] Export to Excel/PDF

### Phase 3 (Future)
- [ ] Natural language query interface (LLM)
- [ ] Predictive analytics
- [ ] Insecticide resistance module
- [ ] Mobile-responsive design
- [ ] Multi-user access control

## 🐛 Troubleshooting

### "API_SECRET_KEY not configured"
**Solution**: Create `.env` file with your API key

### "No data available" in dashboard
**Solution**: Run `python pipeline.py` first to populate database

### "Database locked" error
**Solution**: Close dashboard before running pipeline, or use PostgreSQL for concurrent access

### Slow dashboard loading
**Solution**: Reduce date range filter or limit data returned

### Import errors
**Solution**: Install all dependencies: `pip install -r requirements.txt`

## 📞 Support

For questions about:
- **Backend/API**: Contact backend team
- **Metrics/Public Health**: Contact public health team
- **Technical Issues**: Check logs in `data/logs/`

## 📄 License

[Your License Here]

## 👥 Contributors

- Data Pipeline Development: [Your Name]
- Public Health Requirements: Neil & Team
- Backend API: Backend Team

---

**Last Updated**: October 2025  
**Version**: 1.0.0

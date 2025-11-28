# 🚀 Quick Start Guide - VectorResearch Dashboard

## 📦 What's Been Built

### ✅ Complete Backend Foundation
- **VectorCam API Integration** - Fetches surveillance & specimens data
- **AWS S3 Storage** - Automatically uploads CSVs to your bucket
- **SQLite Database** - Stores all processed data
- **Data Processing Pipeline** - Exact conversion of your Python logic
- **Completeness Metric** - NEW: District-level data completeness tracking
- **Logging System** - Professional Winston-based logging

### 🎯 New Completeness Feature

The completeness metric calculates:
- **Submission Rate**: Percentage of active houses that submitted data
- **Completeness Rate**: Percentage of houses with complete data
- **District-Level Breakdown**: Separate metrics for each district
- **Field-Level Tracking**: Shows which specific fields are missing
- **Configurable**: Easy to update when MEL metrics are finalized

## 🏃 How to Get Started

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Environment

```bash
# Copy the template
cp .env.example .env

# Edit .env and add your credentials:
# - VectorCam API email & password
# - AWS S3 credentials and bucket name
```

### Step 3: Test the Setup

```bash
# Start the development server
npm run dev

# Server will run on http://localhost:3001
```

### Step 4: Test Data Fetching (when credentials are ready)

```bash
# Manually trigger data fetch
npm run fetch-data

# This will:
# 1. Authenticate with VectorCam API
# 2. Fetch surveillance & specimens data
# 3. Clean and process the data
# 4. Upload to S3
# 5. Store in database
# 6. Calculate metrics including completeness
```

## 📊 What Happens When Data is Fetched

```
1. VectorCam API Call
   └─> Authenticate
   └─> Fetch surveillance.csv
   └─> Fetch specimens.csv

2. Data Processing
   └─> Clean surveillance data
   └─> Clean specimens data
   └─> Add derived columns (year, month, etc.)
   └─> Calculate LLIN usage rates
   └─> Flag data quality issues

3. Storage
   └─> Upload raw CSVs to S3 (raw/ folder)
   └─> Upload processed CSVs to S3 (processed/ folder)
   └─> Upload report CSV to S3 (reports/ folder)
   └─> Store in local SQLite database

4. Metrics Calculation
   └─> Species composition
   └─> Indoor density
   └─> Interventions coverage
   └─> **Completeness by district** (NEW!)
   └─> Field team performance
```

## 🎨 Frontend (Next Steps)

The frontend will be built with Next.js and will include:

### Dashboard Tabs (Exact Streamlit Replica)
1. **📈 Temporal Trends** - Collections and specimens over time
2. **🦟 Species Composition** - Species distribution with pie and bar charts
3. **🏠 Indoor Density** - PSC collection analysis
4. **🛡️ Interventions** - LLIN & IRS coverage
5. **🔬 Collection Methods** - Method comparison
6. **🗺️ Geographic** - District-level distributions
7. **👥 Field Team Activity** - Collector performance tracking
8. **✅ Completeness** (NEW!) - Data quality dashboard

### Features
- Interactive charts (Plotly.js)
- Filters (date, district, method, species)
- CSV downloads
- Real-time data updates
- Responsive design

## 🔧 Completeness Metric Configuration

Current settings in `backend/src/config/index.js`:

```javascript
completeness: {
  requiredFields: {
    session: [
      'collectorName',
      'collectionDate',
      'collectionMethod'
    ],
    surveillance: [
      'numPeopleSleptInHouse',
      'wasIrsConducted',
      'numLlinsAvailable'
    ],
    specimens: {
      minCount: 0,  // Can be updated later
      requireImages: false  // Can be updated later
    }
  }
}
```

**To update when MEL metrics are finalized:**
1. Edit `backend/src/config/index.js`
2. Add/remove required fields
3. Set minimum specimen count
4. Enable image requirements if needed

## 📝 API Endpoints (To Be Built)

Once we add the API routes, you'll have:

```
GET  /api/surveillance         - Get surveillance data
GET  /api/specimens            - Get specimens data
GET  /api/metrics              - Get calculated metrics
GET  /api/completeness/:month  - Get completeness for a month
GET  /api/collectors           - Get field team summary
POST /api/data/fetch           - Trigger data fetch
GET  /api/exports/report       - Download VectorCam report
```

## 🚀 Deployment to Vercel

Once complete, deployment will be simple:

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git push

# 2. Deploy to Vercel
# - Connect GitHub repo
# - Add environment variables
# - Deploy!

# 3. Cron job will run daily at 2 AM UTC
# - Fetches new data automatically
# - Updates dashboard
# - No manual intervention needed
```

## 📋 Next Options

### Option 1: Provide Credentials Now
**I can complete everything end-to-end:**
- Test data fetching
- Build remaining backend (metrics calculator, user tracking, API routes)
- Build complete frontend
- Set up deployment

**Provide:**
- VectorCam API email & password
- AWS S3 access key, secret key, bucket name

### Option 2: Continue Without Credentials
**I'll build everything, you test later:**
- Complete backend (all services & routes)
- Build entire frontend
- Provide deployment instructions
- You add credentials and test when ready

### Option 3: Focus on Specific Part
**Tell me what to prioritize:**
- Just finish backend?
- Just build frontend?
- Just deployment setup?

## 🆘 Troubleshooting

### "Module not found" errors
```bash
cd backend
npm install
```

### Database errors
```bash
# Ensure data directory exists
mkdir -p backend/data
```

### AWS S3 errors
- Check credentials in .env
- Verify bucket exists
- Check region matches

### VectorCam API errors
- Verify email/password
- Check API endpoint URL
- Test credentials manually

## 📞 Questions?

Reply with:
1. Which option you want (1, 2, or 3)
2. Any credentials you're ready to share
3. Any clarifications on completeness metric

I'm ready to continue! 🚀

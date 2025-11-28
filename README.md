# VectorResearch Dashboard

Modern React + Node.js dashboard for mosquito surveillance data analysis.

## 🏗️ Architecture

- **Frontend**: Next.js (React) hosted on Vercel
- **Backend**: Node.js API (serverless functions on Vercel)
- **Storage**: AWS S3 for raw and processed CSVs
- **Database**: SQLite (can migrate to AWS RDS later)
- **Scheduled Jobs**: Vercel Cron (daily data pulls)

## 📁 Project Structure

```
vector-research-dashboard/
├── backend/              # Node.js API & data processing
│   ├── src/
│   │   ├── services/     # VectorCam API, S3, Database
│   │   ├── processors/   # Data processing & metrics
│   │   ├── utils/        # Helper functions
│   │   └── config/       # Configuration
│   ├── package.json
│   └── README.md
├── frontend/             # Next.js React dashboard
│   ├── src/
│   │   ├── app/          # Next.js app router
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities
│   ├── package.json
│   └── README.md
├── .env.example          # Environment variables template
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- AWS account with S3 access
- VectorCam API credentials

### 1. Clone and Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

Create `.env` files in both `backend` and `frontend` directories:

**backend/.env**:
```env
# VectorCam API
VECTORCAM_API_URL=https://test.api.vectorcam.org
VECTORCAM_API_EMAIL=your-email@example.com
VECTORCAM_API_PASSWORD=your-password

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name

# Database
DATABASE_PATH=./data/vectorinsight.db

# Optional
NODE_ENV=development
```

**frontend/.env.local**:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Run Development Servers

**Backend** (Terminal 1):
```bash
cd backend
npm run dev
# Runs on http://localhost:3001
```

**Frontend** (Terminal 2):
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### 4. Initial Data Pull

```bash
cd backend
npm run fetch-data
```

## 📊 Features

### Current Features (Converted from Streamlit)
- ✅ **7 Dashboard Tabs**:
  1. Temporal Trends
  2. Species Composition
  3. Indoor Resting Density
  4. Interventions (LLIN & IRS)
  5. Collection Methods
  6. Geographic Distribution
  7. Field Team Activity Tracking

- ✅ **Data Processing**:
  - Automated daily data pulls from VectorCam API
  - Data cleaning and validation
  - Metric calculations
  - CSV export functionality

- ✅ **User Tracking**:
  - Field collector activity monitoring
  - Training status tracking
  - Performance metrics

### New Features
- ✅ **Completeness Metric**:
  - District-level data completeness tracking
  - Configurable field requirements
  - Visual completeness indicators

## 🔄 Deployment

### Deploy to Vercel

1. **Push to GitHub**:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

2. **Deploy Frontend**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Set root directory to `frontend`
   - Add environment variables
   - Deploy!

3. **Deploy Backend** (as Vercel serverless functions):
   - Vercel will automatically detect and deploy API routes from `frontend/pages/api`

4. **Configure Cron Job**:
   - Add `vercel.json` configuration (already included)
   - Cron will run daily at 2 AM UTC

## 📦 Scripts

### Backend
```bash
npm run dev          # Start development server
npm run fetch-data   # Manually trigger data fetch
npm run process-data # Process existing data
npm test            # Run tests
```

### Frontend
```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run ESLint
```

## 🗄️ Database Schema

See `backend/src/services/database.js` for complete schema.

Key tables:
- `surveillance_sessions` - Collection sessions
- `specimens` - Individual mosquito specimens
- `field_collectors` - Field team members
- `training_records` - Training history
- `submission_logs` - Activity logs
- `monthly_metrics` - Pre-calculated metrics

## 🔧 Configuration

### Completeness Metric Configuration

Edit `backend/src/processors/completenessMetric.js` to configure:
- Required fields
- Calculation method
- Thresholds

### Custom Metrics

Add new metrics in `backend/src/processors/metricsCalculator.js`

## 📝 API Endpoints

### Data Endpoints
- `GET /api/surveillance` - Get surveillance data
- `GET /api/specimens` - Get specimens data
- `GET /api/metrics` - Get calculated metrics

### User Tracking
- `GET /api/collectors` - Get field collector summary
- `GET /api/collectors/:id` - Get specific collector

### Data Operations
- `POST /api/fetch-data` - Trigger data fetch from VectorCam
- `POST /api/process-data` - Trigger data processing
- `GET /api/exports/report` - Download CSV report

## 🐛 Troubleshooting

### Common Issues

**1. API Connection Failed**
- Check VectorCam credentials in `.env`
- Verify API endpoint URLs
- Check network connectivity

**2. S3 Upload Failed**
- Verify AWS credentials
- Check bucket permissions
- Ensure bucket exists in specified region

**3. Database Errors**
- Check file permissions on `data/` directory
- Verify SQLite is installed
- Check disk space

## 📚 Documentation

- [Backend API Documentation](./backend/README.md)
- [Frontend Component Guide](./frontend/README.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

Proprietary - All rights reserved

## 👥 Team

Developed for Uganda malaria vector control public health teams.

---

**Questions?** Contact the development team.

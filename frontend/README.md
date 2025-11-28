# VectorResearch Dashboard Frontend

React/Next.js dashboard for mosquito surveillance data visualization.

## 🚀 Quick Start

```bash
cd frontend
npm install
npm run dev
# Visit http://localhost:3000
```

## 📋 Prerequisites

- Node.js 18+ (you already have v20)
- Backend running on port 3001

## 🏗️ Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

###

 2. Configure Environment
Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
npm start
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Dashboard home
│   │   └── globals.css         # Global styles
│   ├── components/             # React components
│   │   ├── Layout/
│   │   │   ├── Header.tsx      # Top navigation
│   │   │   ├── Sidebar.tsx     # Tab navigation
│   │   │   └── Footer.tsx      # Footer
│   │   ├── Dashboard/
│   │   │   ├── TemporalTrends.tsx        # Tab 1
│   │   │   ├── SpeciesComposition.tsx    # Tab 2
│   │   │   ├── IndoorResting.tsx         # Tab 3
│   │   │   ├── Interventions.tsx         # Tab 4
│   │   │   ├── CollectionMethods.tsx     # Tab 5
│   │   │   ├── Geographic.tsx            # Tab 6
│   │   │   ├── FieldTeam.tsx             # Tab 7
│   │   │   └── Completeness.tsx          # Tab 8 (NEW)
│   │   ├── Charts/
│   │   │   ├── LineChart.tsx
│   │   │   ├── BarChart.tsx
│   │   │   ├── PieChart.tsx
│   │   │   └── HeatMap.tsx
│   │   └── Filters/
│   │       ├── DateFilter.tsx
│   │       ├── DistrictFilter.tsx
│   │       └── MethodFilter.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAPI.ts           # API fetching hook
│   │   ├── useMetrics.ts       # Metrics hook
│   │   └── useFilters.ts       # Filter state management
│   ├── lib/                    # Utilities
│   │   ├── api.ts              # API client
│   │   └── utils.ts            # Helper functions
│   └── types/                  # TypeScript types
│       └── index.ts            # Type definitions
├── public/                     # Static assets
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## 🎨 Dashboard Tabs (8 Total)

### 1. Temporal Trends
- Line charts: Collections & specimens over time
- Monthly/quarterly aggregation
- Date range filters

### 2. Species Composition
- Pie chart: Species distribution
- Bar chart: Anopheles species breakdown
- Sex ratio visualization

### 3. Indoor Resting Density
- PSC collection analysis
- Mosquitoes per house metrics
- By district comparison

### 4. Interventions
- LLIN coverage rates
- IRS coverage trends
- Net types and brands
- Usage rates over time

### 5. Collection Methods
- Method comparison charts
- Specimens per collection by method
- Method effectiveness

### 6. Geographic Distribution
- District-level heatmap
- Collection density by location
- Interactive district selector

### 7. Field Team Activity
- Collector performance metrics
- Submission frequency
- Training status
- Activity timeline

### 8. Completeness Dashboard (NEW)
- District-level completeness table
- Field-level completion rates
- Incomplete sites list with missing fields
- Trend over time

## 🔌 API Integration

The frontend connects to your backend API:

```typescript
// Example API calls
const surveillance = await fetch('http://localhost:3001/api/surveillance')
const metrics = await fetch('http://localhost:3001/api/metrics/live')
const completeness = await fetch('http://localhost:3001/api/metrics/completeness/2024-11')
const collectors = await fetch('http://localhost:3001/api/collectors')
```

## 📊 Key Features

### Interactive Charts (Plotly.js)
- Zoom, pan, hover tooltips
- Export as PNG/SVG
- Responsive design

### Filters
- Date range picker
- District multi-select
- Collection method filter
- Species filter

### Data Export
- Download filtered data as CSV
- Export charts as images
- Generate PDF reports

### Responsive Design
- Mobile-friendly
- Tablet optimized
- Desktop full-featured

## 🎯 Implementation Priority

**Phase 1: Core Setup** (Do this first)
1. ✅ Install dependencies
2. ✅ Create basic layout
3. ✅ Set up API connection
4. ✅ Build navigation

**Phase 2: Essential Tabs**
5. Build Temporal Trends tab
6. Build Species Composition tab
7. Build Completeness tab (most important)

**Phase 3: Remaining Tabs**
8. Build other 5 tabs
9. Add filters
10. Polish UI/UX

## 📦 Dependencies Explained

### Core
- `next@14`: React framework with App Router
- `react`, `react-dom`: React library
- `typescript`: Type safety

### Charts
- `plotly.js`: Interactive charts
- `react-plotly.js`: React wrapper for Plotly

### Utils
- `axios`: HTTP client
- `date-fns`: Date manipulation
- `lodash`: Utility functions
- `react-icons`: Icon library

### Styling
- `tailwindcss`: Utility-first CSS
- `clsx`: Conditional classNames

## 🔧 Configuration Files

### next.config.js
- API URL configuration
- Plotly.js webpack config
- Build optimization

### tailwind.config.js
- Custom color scheme
- Responsive breakpoints
- Component paths

### tsconfig.json
- TypeScript compiler options
- Path aliases (@/components)
- Next.js integration

## 🚀 Deployment (Vercel)

### 1. Connect to Vercel
```bash
npm install -g vercel
vercel login
vercel
```

### 2. Set Environment Variables
In Vercel dashboard:
- `NEXT_PUBLIC_API_URL`: Your backend API URL

### 3. Deploy
```bash
vercel --prod
```

## 📝 Development Tips

### Hot Reload
Changes auto-refresh in dev mode

### TypeScript
All components use TypeScript for type safety

### API Mocking
For development without backend:
```typescript
// lib/api.ts
const MOCK_MODE = false; // Set to true for mock data
```

### Debugging
- React DevTools: Component inspection
- Network tab: API call monitoring
- Console: Check for errors

## 🎨 Styling Guidelines

### Tailwind Classes
```tsx
// Button example
<button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
  Click Me
</button>

// Card example
<div className="bg-white shadow-md rounded-lg p-6">
  Content here
</div>
```

### Responsive Design
```tsx
// Mobile-first approach
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Plotly Not Loading
```bash
# Reinstall Plotly
npm uninstall plotly.js react-plotly.js
npm install plotly.js@2.27.1 react-plotly.js@2.6.0
```

### API Connection Failed
- Check backend is running on port 3001
- Verify CORS is enabled in backend
- Check `.env.local` has correct API_URL

### Build Errors
```bash
# Clean install
rm -rf node_modules .next
npm install
npm run dev
```

## 📊 Sample Component

```typescript
// components/Dashboard/TemporalTrends.tsx
'use client';

import { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { useMetrics } from '@/hooks/useMetrics';

export default function TemporalTrends() {
  const { metrics, loading } = useMetrics();

  if (loading) return <div>Loading...</div>;

  const data = [{
    x: Object.keys(metrics.temporal.collectionsByMonth),
    y: Object.values(metrics.temporal.collectionsByMonth),
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Collections'
  }];

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Collections Over Time</h2>
      <Plot
        data={data}
        layout={{
          title: 'Monthly Collections',
          xaxis: { title: 'Month' },
          yaxis: { title: 'Count' }
        }}
        config={{ responsive: true }}
      />
    </div>
  );
}
```

## 🎯 Next Steps

1. Run `npm install` in frontend directory
2. Create basic layout and navigation
3. Implement API hooks
4. Build Completeness tab first (most important)
5. Add remaining tabs
6. Test with real backend data
7. Deploy to Vercel

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Plotly.js Docs](https://plotly.com/javascript/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Icons](https://react-icons.github.io/react-icons/)

## ✅ Checklist

Backend:
- [x] API running on port 3001
- [x] Data fetching works
- [x] All endpoints functional

Frontend:
- [ ] Dependencies installed
- [ ] Environment configured
- [ ] Dev server running
- [ ] API connected
- [ ] Layout created
- [ ] Tabs implemented
- [ ] Charts working
- [ ] Filters functional
- [ ] Ready for deployment

---

**Ready to build! Start with `npm install` and let me know if you need help with specific components.** 🚀

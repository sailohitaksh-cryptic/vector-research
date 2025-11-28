# Frontend Implementation Guide

## Setup Steps

### 1. Install Dependencies
```bash
cd frontend
npm install
cp .env.local.example .env.local
```

### 2. File Structure to Create

You need to create these files in `src/`:

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── Dashboard.tsx
├── hooks/
│   └── useAPI.ts
├── lib/
│   └── api.ts
└── types/
    └── index.ts
```

## Complete File Contents

### src/app/globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50;
}
```

### src/types/index.ts
```typescript
export interface SurveillanceData {
  SessionID: number;
  SessionCollectorName: string;
  SessionCollectionDate: string;
  SiteDistrict: string;
  SessionCollectionMethod: string;
  NumPeopleSleptInHouse: number;
  NumLlinsAvailable: number;
}

export interface SpecimenData {
  SpecimenID: string;
  SessionID: number;
  Species: string;
  Sex: string;
  AbdomenStatus: string;
}

export interface Metrics {
  temporal: {
    collectionsByMonth: Record<string, number>;
    specimensByMonth: Record<string, number>;
  };
  species: {
    speciesCounts: Record<string, number>;
    anophelesBreakdown: Record<string, number>;
  };
  collectors: Array<{
    collector_name: string;
    total_submissions: number;
    activity_status: string;
  }>;
}

export interface CompletenessData {
  district: string;
  totalHouses: number;
  housesWithData: number;
  housesWithCompleteData: number;
  submissionRate: number;
  completenessRate: number;
}
```

### src/lib/api.ts
```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchSurveillance = async (filters = {}) => {
  const response = await api.get('/api/surveillance', { params: filters });
  return response.data;
};

export const fetchSpecimens = async (filters = {}) => {
  const response = await api.get('/api/specimens', { params: filters });
  return response.data;
};

export const fetchMetrics = async () => {
  const response = await api.get('/api/metrics/live');
  return response.data;
};

export const fetchCompleteness = async (yearMonth: string) => {
  const response = await api.get(`/api/metrics/completeness/${yearMonth}`);
  return response.data;
};

export const fetchCollectors = async () => {
  const response = await api.get('/api/collectors');
  return response.data;
};

export default api;
```

### src/hooks/useAPI.ts
```typescript
import { useState, useEffect } from 'react';

export function useAPI<T>(fetchFn: () => Promise<any>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await fetchFn();
        setData(result.data || result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return { data, loading, error };
}
```

### src/app/layout.tsx
```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VectorResearch Dashboard',
  description: 'Mosquito surveillance data visualization',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <h1 className="text-3xl font-bold text-gray-900">
                🦟 VectorResearch Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Mosquito Surveillance Data Analysis
              </p>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
```

### src/components/Dashboard.tsx
```typescript
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAPI } from '@/hooks/useAPI';
import { fetchMetrics, fetchCompleteness, fetchCollectors } from '@/lib/api';

// Dynamic import for Plotly (client-side only)
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const tabs = [
  'Temporal Trends',
  'Species Composition',
  'Indoor Resting',
  'Interventions',
  'Collection Methods',
  'Geographic',
  'Field Team',
  'Completeness',
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const { data: metrics, loading: metricsLoading } = useAPI(fetchMetrics);
  const { data: completeness } = useAPI(() => fetchCompleteness('2024-11'));
  const { data: collectors } = useAPI(fetchCollectors);

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                onClick={() => setActiveTab(index)}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === index
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 0 && (
            <TemporalTrends metrics={metrics} />
          )}
          {activeTab === 1 && (
            <SpeciesComposition metrics={metrics} />
          )}
          {activeTab === 7 && (
            <Completeness data={completeness} />
          )}
          {activeTab >= 2 && activeTab <= 6 && (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg">{tabs[activeTab]} - Coming soon</p>
              <p className="text-sm mt-2">Implement based on requirements</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Temporal Trends Component
function TemporalTrends({ metrics }: any) {
  if (!metrics?.temporal) return null;

  const months = Object.keys(metrics.temporal.collectionsByMonth);
  const collections = Object.values(metrics.temporal.collectionsByMonth);
  const specimens = Object.values(metrics.temporal.specimensByMonth);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Collections Over Time</h2>
      <Plot
        data={[
          {
            x: months,
            y: collections,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Collections',
            line: { color: '#0ea5e9' },
          },
          {
            x: months,
            y: specimens,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Specimens',
            line: { color: '#10b981' },
            yaxis: 'y2',
          },
        ]}
        layout={{
          title: 'Monthly Collections and Specimens',
          xaxis: { title: 'Month' },
          yaxis: { title: 'Collections' },
          yaxis2: {
            title: 'Specimens',
            overlaying: 'y',
            side: 'right',
          },
          hovermode: 'x unified',
        }}
        config={{ responsive: true }}
        className="w-full"
        style={{ width: '100%', height: '500px' }}
      />
    </div>
  );
}

// Species Composition Component
function SpeciesComposition({ metrics }: any) {
  if (!metrics?.species) return null;

  const species = Object.keys(metrics.species.speciesCounts);
  const counts = Object.values(metrics.species.speciesCounts);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Species Distribution</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Plot
          data={[
            {
              labels: species,
              values: counts,
              type: 'pie',
              hole: 0.4,
            },
          ]}
          layout={{
            title: 'Species Composition',
          }}
          config={{ responsive: true }}
          style={{ width: '100%', height: '400px' }}
        />
        <Plot
          data={[
            {
              x: species,
              y: counts,
              type: 'bar',
              marker: { color: '#0ea5e9' },
            },
          ]}
          layout={{
            title: 'Species Counts',
            xaxis: { title: 'Species' },
            yaxis: { title: 'Count' },
          }}
          config={{ responsive: true }}
          style={{ width: '100%', height: '400px' }}
        />
      </div>
    </div>
  );
}

// Completeness Component
function Completeness({ data }: any) {
  if (!data?.data) return null;

  const districts = data.data;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Data Completeness</h2>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                District
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Houses
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                With Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Submission Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completeness
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {districts.map((d: any, i: number) => (
              <tr key={i}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {d.district}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {d.totalHouses}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {d.housesWithData}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    d.submissionRate >= 80 ? 'bg-green-100 text-green-800' :
                    d.submissionRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {d.submissionRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    d.completenessRate >= 80 ? 'bg-green-100 text-green-800' :
                    d.completenessRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {d.completenessRate.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### src/app/page.tsx
```typescript
import Dashboard from '@/components/Dashboard';

export default function Home() {
  return <Dashboard />;
}
```

## Running the Frontend

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Start development server
npm run dev

# Visit http://localhost:3000
```

## Next Steps

1. ✅ Backend running on port 3001
2. Create all files listed above
3. Run `npm install`
4. Run `npm run dev`
5. Open http://localhost:3000
6. Implement remaining tabs as needed

## Adding More Tabs

To add remaining tabs, create components in Dashboard.tsx:

```typescript
function IndoorResting({ metrics }: any) {
  // PSC analysis charts
}

function Interventions({ metrics }: any) {
  // LLIN & IRS coverage
}

function CollectionMethods({ metrics }: any) {
  // Method comparison
}

function Geographic({ metrics }: any) {
  // District heatmap
}

function FieldTeam({ collectors }: any) {
  // Collector performance
}
```

Then update the tab content rendering in Dashboard component.

## Deployment to Vercel

```bash
npm install -g vercel
vercel login
vercel

# Set environment variables in Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://your-backend-url.com

vercel --prod
```

---

**All files are ready! Follow the steps above to get the frontend running.** 🚀

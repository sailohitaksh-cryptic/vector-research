import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface CompletenessData {
  yearMonth: string;
  totalSessions: number;
  completeSessions: number;
  incompleteSessions: number;
  completenessRate: number;
  districts: Array<{
    district: string;
    totalSessions: number;
    completeSessions: number;
    incompleteSessions: number;
    completenessRate: number;
  }>;
  incompleteSummary: Array<{
    sessionId: number;
    district: string;
    collectorName: string;
    date: string;
    completenessPercent: number;
    missingFields: string[];
  }>;
  calculatedAt?: string;
  message?: string;
}

interface CompletenessTabProps {
  currentYearMonth?: string;
}

export default function CompletenessTab({ currentYearMonth }: CompletenessTabProps) {
  const [data, setData] = useState<CompletenessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth || getCurrentYearMonth());

  // Get current year-month in YYYY-MM format
  function getCurrentYearMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  // Generate last 6 months for dropdown
  function getMonthOptions() {
    const options = [];
    const now = new Date();
    
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value: yearMonth, label });
    }
    
    return options;
  }

  useEffect(() => {
    fetchCompleteness(selectedMonth);
  }, [selectedMonth]);

  async function fetchCompleteness(yearMonth: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:5001/api/metrics/completeness/${yearMonth}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Completeness data not available for this month');
          setData(null);
        } else {
          throw new Error('Failed to fetch completeness data');
        }
        return;
      }

      const result = await response.json();
      setData(result.completeness || result);
    } catch (err) {
      console.error('Error fetching completeness:', err);
      setError('Failed to load completeness data. The endpoint may not be available yet.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // Get color based on completeness rate
  function getCompletenessColor(rate: number) {
    if (rate >= 90) return '#10b981'; // Green
    if (rate >= 70) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading completeness data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          Data Completeness (Coming Soon)
        </h3>
        <p className="text-yellow-700">
          {error}
        </p>
        <p className="text-sm text-yellow-600 mt-2">
          This feature will track field data collection completeness and help identify sites needing follow-up.
        </p>
      </div>
    );
  }

  if (!data || data.totalSessions === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          No Data Available
        </h3>
        <p className="text-gray-600">
          {data?.message || 'No surveillance data available for the selected month.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Month Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Data Completeness</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {getMonthOptions().map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overall Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600">Total Sessions</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">{data.totalSessions}</div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm font-medium text-green-600">Complete</div>
          <div className="text-3xl font-bold text-green-900 mt-2">{data.completeSessions}</div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm font-medium text-red-600">Incomplete</div>
          <div className="text-3xl font-bold text-red-900 mt-2">{data.incompleteSessions}</div>
        </div>
        
        <div className={`border rounded-lg p-4 ${
          data.completenessRate >= 90 ? 'bg-green-50 border-green-200' :
          data.completenessRate >= 70 ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className={`text-sm font-medium ${
            data.completenessRate >= 90 ? 'text-green-600' :
            data.completenessRate >= 70 ? 'text-yellow-600' :
            'text-red-600'
          }`}>Completeness Rate</div>
          <div className={`text-3xl font-bold mt-2 ${
            data.completenessRate >= 90 ? 'text-green-900' :
            data.completenessRate >= 70 ? 'text-yellow-900' :
            'text-red-900'
          }`}>{data.completenessRate}%</div>
        </div>
      </div>

      {/* District-Level Completeness Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Completeness by District</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.districts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="district" type="category" width={100} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                        <div className="font-semibold text-gray-900">{data.district}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Completeness: {data.completenessRate}%
                        </div>
                        <div className="text-sm text-gray-600">
                          Complete: {data.completeSessions}/{data.totalSessions}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="completenessRate" name="Completeness %" radius={[0, 4, 4, 0]}>
                {data.districts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getCompletenessColor(entry.completenessRate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* District Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">District Summary</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">District</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Complete</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Incomplete</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.districts.map((district, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{district.district}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{district.totalSessions}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{district.completeSessions}</td>
                  <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">{district.incompleteSessions}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      district.completenessRate >= 90 ? 'bg-green-100 text-green-800' :
                      district.completenessRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {district.completenessRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incomplete Sessions Needing Follow-up */}
      {data.incompleteSummary && data.incompleteSummary.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Sessions Needing Follow-up <span className="text-sm font-normal text-gray-500">(Top 20 Most Incomplete)</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">District</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collector</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Missing Fields</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Completeness</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.incompleteSummary.map((session, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm text-gray-900">{session.sessionId}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{session.district}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{session.collectorName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(session.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex flex-wrap gap-1">
                        {session.missingFields.slice(0, 3).map((field, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
                            {field}
                          </span>
                        ))}
                        {session.missingFields.length > 3 && (
                          <span className="text-xs text-gray-500">+{session.missingFields.length - 3} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className="text-red-600 font-medium">{session.completenessPercent}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">About Data Completeness</h4>
        <p className="text-sm text-blue-800">
          A session is considered <strong>complete</strong> when it has: collector name, collection date, method, district, 
          household size, LLIN count, and at least 1 specimen recorded. Use this to identify sites needing follow-up 
          or additional data collection.
        </p>
      </div>
    </div>
  );
}
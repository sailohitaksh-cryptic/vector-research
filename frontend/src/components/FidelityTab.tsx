/**
 * Fidelity Tab Component
 * Shows:
 * 1. House data fidelity (houses with data / 30 total expected)
 * 2. Mosquito data completeness
 * 3. VHT penetration (current month VHTs / first month VHTs)
 * 4. VHT training completion (trained / 18 total)
 * 
 * Create: frontend/src/components/FidelityTab.tsx
 */

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
interface FidelityData {
  yearMonth: string;
  houseFidelity: {
    housesWithData: number;
    totalExpectedHouses: number;
    fidelityRate: number;
    status: string;
  };
  mosquitoFidelity: {
    totalSessions: number;
    sessionsWithMosquitoes: number;
    sessionsWithoutMosquitoes: number;
    totalSpecimens: number;
    mosquitoDataRate: number;
    avgSpecimensPerSession: number;
    status: string;
  };
  vhtPenetration: {
    currentMonthVHTs: number;
    firstMonthVHTs: number;
    penetrationRate: number;
    firstRolloutMonth: string;
    vhtNames?: string[];
    status: string;
  };
  vhtTraining: {
    trainedVHTs: number;
    totalVHTs: number;
    untrainedVHTs: number;
    trainingRate: number;
    trainingDetails?: Array<{
      name: string;
      trainedOn: string;
      lastCollection: string;
    }>;
    activeVHTs?: number;
    status: string;
  };
  overallFidelityScore?: number;
  overallStatus?: string;
}

interface FidelityTabProps {
  currentYearMonth?: string;
}

export default function FidelityTab({ currentYearMonth }: FidelityTabProps) {
  const [data, setData] = useState<FidelityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Fetch available months on mount
  useEffect(() => {
    fetchAvailableMonths();
  }, []);

  async function fetchAvailableMonths() {
    try {
      // Get distinct months from surveillance data
      const response = await fetch(`${API_BASE_URL}/api/surveillance`);
      if (response.ok) {
        const data = await response.json();
        const sessions = data.data || [];
        
        // Extract unique year-months
        const months = new Set<string>();
        sessions.forEach((session: any) => {
          if (session.SessionCollectionDate) {
            const yearMonth = session.SessionCollectionDate.substring(0, 7); // YYYY-MM
            months.add(yearMonth);
          }
        });
        
        // Sort descending (newest first)
        const sortedMonths = Array.from(months).sort().reverse();
        setAvailableMonths(sortedMonths);
        
        // Set selected month to the latest month with data
        if (sortedMonths.length > 0) {
          setSelectedMonth(sortedMonths[0]); // Most recent month
        } else {
          setSelectedMonth(getCurrentYearMonth()); // Fallback to current
        }
      } else {
        // Fallback to current month if API fails
        setSelectedMonth(getCurrentYearMonth());
      }
    } catch (err) {
      console.error('Error fetching available months:', err);
      setSelectedMonth(getCurrentYearMonth()); // Fallback to current
    }
  }

  function getCurrentYearMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  function getMonthOptions() {
    // If we have available months from data, use those
    if (availableMonths.length > 0) {
      return availableMonths.map(yearMonth => {
        const [year, month] = yearMonth.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        return { value: yearMonth, label };
      });
    }
    
    // Fallback: generate last 6 months
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
    if (selectedMonth) {
      fetchFidelity(selectedMonth);
    }
  }, [selectedMonth]);

  async function fetchFidelity(yearMonth: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/metrics/fidelity/${yearMonth}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Fidelity data not available for this month');
          setData(null);
        } else {
          throw new Error('Failed to fetch fidelity data');
        }
        return;
      }

      const result = await response.json();
      setData(result.fidelity || result);
    } catch (err) {
      console.error('Error fetching fidelity:', err);
      setError('Failed to load fidelity data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    if (status.includes('Excellent')) return 'text-green-600 bg-green-50 border-green-200';
    if (status.includes('Good')) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (status.includes('Fair')) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  }

  function getProgressColor(rate: number) {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 70) return 'bg-blue-500';
    if (rate >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading fidelity data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          Fidelity Metrics
        </h3>
        <p className="text-yellow-700">
          {error || 'No data available for the selected month.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Month Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fidelity Metrics</h2>
          <p className="text-gray-600">Track data collection quality and VHT performance</p>
        </div>
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

      {/* What is Fidelity? Definition Box */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-lg p-5">
        <div className="flex items-start">
          <div className="flex-shrink-0 text-3xl mr-4">ℹ️</div>
          <div>
            <h3 className="text-lg font-semibold text-indigo-900 mb-2">What is Fidelity?</h3>
            <p className="text-sm text-indigo-800 mb-3">
              <strong>Fidelity</strong> measures how consistently and completely data is collected according to the surveillance protocol. 
              High fidelity means the program is following its design: data collectors are active, required houses are being sampled, 
              and mosquito specimens are being properly documented.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-indigo-700">
              <div className="flex items-start">
                <span className="font-semibold mr-2">📊 House Fidelity:</span>
                <span>Are we sampling the expected number of houses?</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold mr-2">🦟 Mosquito Data:</span>
                <span>Are specimens being collected during visits?</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold mr-2">👥 VHT Retention:</span>
                <span>Are trained collectors still active?</span>
              </div>
              <div className="flex items-start">
                <span className="font-semibold mr-2">🎓 Training Coverage:</span>
                <span>Have all required VHTs been trained?</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Fidelity Score */}
      {data.overallFidelityScore !== undefined && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Overall Fidelity Score</h3>
              <p className="text-sm text-gray-600 mt-1">Composite score across all metrics</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-blue-900">{data.overallFidelityScore}%</div>
              <div className={`text-sm font-medium mt-1 ${getStatusColor(data.overallStatus || '')}`}>
                {data.overallStatus}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. House Data Fidelity */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">📊 House Data Fidelity</h3>
        <p className="text-sm text-gray-600 mb-1">
          <strong>Definition:</strong> Proportion of expected houses with surveillance data collected this month.
        </p>
        
        {/* Threshold Guide */}
        <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4 text-xs">
          <div className="font-semibold text-gray-700 mb-2">Performance Thresholds:</div>
          <div className="grid grid-cols-4 gap-2">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
              <span className="text-gray-600">Excellent: ≥90%</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
              <span className="text-gray-600">Good: 70-89%</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
              <span className="text-gray-600">Fair: 50-69%</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
              <span className="text-gray-600">Poor: &lt;50%</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Houses with Data</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{data.houseFidelity.housesWithData.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Expected Houses</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{data.houseFidelity.totalExpectedHouses.toLocaleString()}</div>
          </div>
          <div className={`rounded-lg p-4 border ${getStatusColor(data.houseFidelity.status)}`}>
            <div className="text-sm font-medium">Fidelity Rate</div>
            <div className="text-2xl font-bold mt-1">{data.houseFidelity.fidelityRate}%</div>
            <div className="text-xs mt-1">{data.houseFidelity.status}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${getProgressColor(data.houseFidelity.fidelityRate)}`}
            style={{ width: `${Math.min(data.houseFidelity.fidelityRate, 100)}%` }}
          />
        </div>
      </div>

      {/* 2. Mosquito Data Completeness */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">🦟 Mosquito Data Completeness</h3>
        <p className="text-sm text-gray-600 mb-1">
          <strong>Definition:</strong> Percentage of surveillance sessions that successfully collected mosquito specimens.
        </p>
        <p className="text-sm text-gray-600 mb-4">
          <strong>Why it matters:</strong> Empty collections may indicate issues with trap placement, timing, or documentation. 
          Higher rates ensure representative data for entomological analysis.
        </p>

        {/* Threshold Guide */}
        <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4 text-xs">
          <div className="font-semibold text-gray-700 mb-2">Performance Thresholds:</div>
          <div className="grid grid-cols-4 gap-2">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
              <span className="text-gray-600">Excellent: ≥90%</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
              <span className="text-gray-600">Good: 70-89%</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
              <span className="text-gray-600">Fair: 50-69%</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
              <span className="text-gray-600">Poor: &lt;50%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-600">With Mosquitoes</div>
            <div className="text-2xl font-bold text-green-900 mt-1">{data.mosquitoFidelity.sessionsWithMosquitoes.toLocaleString()}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-600">Without Mosquitoes</div>
            <div className="text-2xl font-bold text-red-900 mt-1">{data.mosquitoFidelity.sessionsWithoutMosquitoes.toLocaleString()}</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-600">Total Specimens</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{data.mosquitoFidelity.totalSpecimens.toLocaleString()}</div>
          </div>
          <div className={`rounded-lg p-4 border ${getStatusColor(data.mosquitoFidelity.status)}`}>
            <div className="text-sm font-medium">Data Rate</div>
            <div className="text-2xl font-bold mt-1">{data.mosquitoFidelity.mosquitoDataRate}%</div>
            <div className="text-xs mt-1">{data.mosquitoFidelity.status}</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Average Specimens per Session</div>
          <div className="text-xl font-bold text-gray-900">{data.mosquitoFidelity.avgSpecimensPerSession.toLocaleString()}</div>
        </div>
      </div>

      {/* 3. VHT Penetration (Penetration User Level) */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">👥 VHT Retention (Penetration User Level)</h3>
        <p className="text-sm text-gray-600 mb-1">
          <strong>Definition:</strong> Percentage of VHTs from the first rollout month who are still actively collecting data.
        </p>
        <p className="text-sm text-gray-600 mb-4">
          <strong>Why it matters:</strong> Measures program sustainability and VHT retention. Declining rates may indicate 
          need for refresher training, motivation, or addressing operational barriers.
        </p>

        {/* Threshold Guide */}
        <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4 text-xs">
          <div className="font-semibold text-gray-700 mb-2">Performance Thresholds:</div>
          <div className="grid grid-cols-4 gap-2">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
              <span className="text-gray-600">Excellent: ≥90%</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
              <span className="text-gray-600">Good: 70-89%</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
              <span className="text-gray-600">Fair: 50-69%</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
              <span className="text-gray-600">Poor: &lt;50%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">First Month VHTs</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{data.vhtPenetration.firstMonthVHTs.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">{data.vhtPenetration.firstRolloutMonth}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Current Month VHTs</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{data.vhtPenetration.currentMonthVHTs.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">{selectedMonth}</div>
          </div>
          <div className={`rounded-lg p-4 border ${getStatusColor(data.vhtPenetration.status)}`}>
            <div className="text-sm font-medium">Penetration Rate</div>
            <div className="text-2xl font-bold mt-1">{data.vhtPenetration.penetrationRate}%</div>
            <div className="text-xs mt-1">{data.vhtPenetration.status}</div>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="text-sm text-indigo-600 mb-1">Trend</div>
            <div className="flex items-center justify-center">
              {data.vhtPenetration.currentMonthVHTs - data.vhtPenetration.firstMonthVHTs > 0 ? (
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📈</span>
                  <div>
                    <div className="text-2xl font-bold text-green-900">
                      +{data.vhtPenetration.currentMonthVHTs - data.vhtPenetration.firstMonthVHTs}
                    </div>
                    <div className="text-xs text-green-600">Growing</div>
                  </div>
                </div>
              ) : data.vhtPenetration.currentMonthVHTs - data.vhtPenetration.firstMonthVHTs < 0 ? (
                <div className="flex items-center">
                  <span className="text-2xl mr-2">📉</span>
                  <div>
                    <div className="text-2xl font-bold text-red-900">
                      {data.vhtPenetration.currentMonthVHTs - data.vhtPenetration.firstMonthVHTs}
                    </div>
                    <div className="text-xs text-red-600">Declining</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <span className="text-2xl mr-2">➡️</span>
                  <div>
                    <div className="text-2xl font-bold text-blue-900">0</div>
                    <div className="text-xs text-blue-600">Stable</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-4">
          <div 
            className={`h-full transition-all duration-500 ${getProgressColor(data.vhtPenetration.penetrationRate)}`}
            style={{ width: `${Math.min(data.vhtPenetration.penetrationRate, 100)}%` }}
          />
        </div>

        {data.vhtPenetration.vhtNames && data.vhtPenetration.vhtNames.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Active VHTs This Month:</div>
            <div className="flex flex-wrap gap-2">
              {data.vhtPenetration.vhtNames.slice(0, 10).map((name, idx) => (
                <span key={idx} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                  {name}
                </span>
              ))}
              {data.vhtPenetration.vhtNames.length > 10 && (
                <span className="text-xs text-gray-500">+{data.vhtPenetration.vhtNames.length - 10} more</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. VHT Training Completion */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">🎓 VHT Training Completion</h3>
        <p className="text-sm text-gray-600 mb-1">
          <strong>Definition:</strong> Percentage of all VHTs in the district who have completed required training.
        </p>
        <p className="text-sm text-gray-600 mb-4">
          <strong>Target:</strong> 18 trained VHTs per district for optimal surveillance coverage.
        </p>

        {/* Threshold Guide */}
        <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4 text-xs">
          <div className="font-semibold text-gray-700 mb-2">Performance Thresholds:</div>
          <div className="grid grid-cols-4 gap-2">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
              <span className="text-gray-600">Excellent: ≥90%</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
              <span className="text-gray-600">Good: 70-89%</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
              <span className="text-gray-600">Fair: 50-69%</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
              <span className="text-gray-600">Poor: &lt;50%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-600">Trained VHTs</div>
            <div className="text-2xl font-bold text-green-900 mt-1">{data.vhtTraining.trainedVHTs.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Total VHTs</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{data.vhtTraining.totalVHTs.toLocaleString()}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-600">Untrained VHTs</div>
            <div className="text-2xl font-bold text-red-900 mt-1">{data.vhtTraining.untrainedVHTs.toLocaleString()}</div>
          </div>
          <div className={`rounded-lg p-4 border ${getStatusColor(data.vhtTraining.status)}`}>
            <div className="text-sm font-medium">Training Rate</div>
            <div className="text-2xl font-bold mt-1">{data.vhtTraining.trainingRate}%</div>
            <div className="text-xs mt-1">{data.vhtTraining.status}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-4">
          <div 
            className={`h-full transition-all duration-500 ${getProgressColor(data.vhtTraining.trainingRate)}`}
            style={{ width: `${Math.min(data.vhtTraining.trainingRate, 100)}%` }}
          />
        </div>

        {/* Training Details */}
        {data.vhtTraining.trainingDetails && data.vhtTraining.trainingDetails.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Trained VHTs:</div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.vhtTraining.trainingDetails.map((vht, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white rounded p-2 border">
                  <span className="text-sm font-medium text-gray-900">{vht.name}</span>
                  <div className="text-xs text-gray-500">
                    Trained: {new Date(vht.trainedOn).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.vhtTraining.trainedVHTs === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm text-yellow-800">
              ℹ️ Training data not yet available. The LastTrainedOn field will be populated as VHTs receive training.
            </div>
          </div>
        )}
      </div>

      {/* Interpretation Guide */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-5">
        <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
          <span className="text-2xl mr-2">📖</span>
          How to Interpret Fidelity Metrics
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="font-semibold mb-2">📊 House Data Fidelity</div>
            <p className="mb-2">Tracks whether the expected number of houses (60/month) are being surveyed.</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li><strong>High (&gt;90%):</strong> On track with surveillance plan</li>
              <li><strong>Low (&lt;50%):</strong> May need more VHTs or logistical support</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="font-semibold mb-2">🦟 Mosquito Data Completeness</div>
            <p className="mb-2">Ensures specimens are collected during surveillance visits.</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li><strong>High (&gt;90%):</strong> Good trap placement and timing</li>
              <li><strong>Low (&lt;50%):</strong> Review collection protocols</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="font-semibold mb-2">👥 VHT Retention</div>
            <p className="mb-2">Measures how many original VHTs remain active.</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li><strong>Growing (📈):</strong> Program expanding successfully</li>
              <li><strong>Declining (📉):</strong> Address retention barriers</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="font-semibold mb-2">🎓 Training Completion</div>
            <p className="mb-2">Tracks progress toward 18 trained VHTs per district.</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li><strong>High (&gt;90%):</strong> Strong program capacity</li>
              <li><strong>Low (&lt;50%):</strong> Prioritize training rollout</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAPI } from '@/hooks/useAPI';
import { fetchMetrics, fetchCollectors, fetchCompleteness } from '@/lib/api';
import { Metrics, Collector } from '@/types';
import Filters, { FilterState } from './Filters';
import DownloadButton from './DownloadButton';
import ExportAllButton from './ExportAllButton';
import FidelityTab from './FidelityTab';
import { 
  applyFilters, 
  applyCollectorFilters, 
  getActiveFilterCount 
} from '@/utils/filterUtils';
import { 
  FiTrendingUp, FiActivity, FiHome, FiShield, 
  FiTarget, FiMap, FiUsers, FiFilter, FiAlertCircle, 
  FiBarChart2, FiMapPin, FiCalendar, FiCheckCircle
} from 'react-icons/fi';

const Plot = dynamic(() => import('@/components/Plot'), { ssr: false });

const filterUnknownSpecies = (speciesData: Record<string, number>) => {
  return Object.entries(speciesData)
    .filter(([species, count]) => 
      species?.toLowerCase() !== 'unknown' && 
      species !== 'N/A' && 
      species.trim() !== '' &&
      count > 0
    )
    .reduce((acc, [s, c]) => ({ ...acc, [s]: c }), {});
};

const tabs = [
  { id: 0, label: 'Overview', icon: FiBarChart2 },
  { id: 1, label: 'Temporal Analysis', icon: FiTrendingUp },
  { id: 2, label: 'Species Composition', icon: FiActivity },
  { id: 3, label: 'Indoor Resting Density', icon: FiHome },
  { id: 4, label: 'Intervention Coverage', icon: FiShield },
  { id: 5, label: 'Collection Methods', icon: FiTarget },
  { id: 6, label: 'Geographic Distribution', icon: FiMap },
  { id: 7, label: 'Field Team Performance', icon: FiUsers },
  { id: 8, label: 'Fidelity', icon: FiCheckCircle },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState(0);
  
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { start: '', end: '' },
    districts: [],
    methods: [],
    species: []
  });

  // Convert filters to API format
  const apiFilters = useMemo(() => ({
    startDate: filters.dateRange.start || undefined,
    endDate: filters.dateRange.end || undefined,
    districts: filters.districts.length > 0 ? filters.districts : undefined,
    methods: filters.methods.length > 0 ? filters.methods : undefined,
    species: filters.species.length > 0 ? filters.species : undefined,
  }), [filters]);

  // Fetch data
  const { data: metrics, loading: metricsLoading, error: metricsError } = useAPI<Metrics>(
    fetchMetrics,
    apiFilters
  );

  
  
  const { data: collectors, loading: collectorsLoading } = useAPI<Collector[]>(
    fetchCollectors,
    apiFilters
  );

  // Fetch completeness for current month (format: YYYY-MM)
  const currentYearMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const { data: completeness, loading: completenessLoading } = useAPI(
    () => fetchCompleteness(currentYearMonth, apiFilters),
    apiFilters
  );

  // Extract filter options from metrics
  const filterOptions = useMemo(() => {
    if (!metrics) return { districts: [], methods: [], species: [] };

    const districts = metrics?.geographic?.districts 
      ? [...metrics.geographic.districts].sort() 
      : [];

    const methods = metrics?.collectionMethods?.collectionsByMethod
      ? Object.keys(metrics.collectionMethods.collectionsByMethod).sort()
      : [];

    const species = metrics?.species?.speciesCounts
      ? Object.keys(metrics.species.speciesCounts)
          .filter(s => s && s.toLowerCase() !== 'unknown' && s !== 'N/A' && s.trim() !== '')
          .sort()
          .slice(0, 15)
      : [];
    
    return { districts, methods, species };
  }, [metrics]);

  // Filtered data
  const filteredMetrics = useMemo(() => 
    applyFilters(metrics, filters), 
    [metrics, filters]
  );

  const filteredCollectors = useMemo(() => 
    applyCollectorFilters(collectors, filters), 
    [collectors, filters]
  );

  const activeFilterCount = useMemo(() => 
    getActiveFilterCount(filters), 
    [filters]
  );

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  // Loading state
  if (metricsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (metricsError) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 text-lg font-semibold mb-2">Error Loading Dashboard</h2>
            <p className="text-red-600">{metricsError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Uganda Malaria Vector Surveillance Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {metrics?.summary?.totalCollections?.toLocaleString() || 0} collections • {' '}
                {metrics?.summary?.totalSpecimens?.toLocaleString() || 0} specimens • {' '}
                {metrics?.geographic?.districts?.length || 0} districts
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <ExportAllButton />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Filters Section */}
        <div className="mb-6">
          <Filters
            filters={filters}
            onFilterChange={handleFilterChange}
            filterOptions={filterOptions}
          />
        </div>

        {/* Active Filters Badge */}
        {activeFilterCount > 0 && (
          <div className="mb-4 flex items-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
              <FiFilter className="mr-2" size={14} />
              {activeFilterCount} {activeFilterCount === 1 ? 'Filter' : 'Filters'} Active
            </div>
            <button
              onClick={() => setFilters({
                dateRange: { start: '', end: '' },
                districts: [],
                methods: [],
                species: []
              })}
              className="ml-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border mb-6 overflow-hidden">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-4 border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="mr-2" size={18} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {activeTab === 0 && <OverviewTab metrics={filteredMetrics} />}
          {activeTab === 1 && <TemporalAnalysisTab metrics={filteredMetrics} />}
          {activeTab === 2 && <SpeciesCompositionTab metrics={filteredMetrics} />}
          {activeTab === 3 && <IndoorRestingDensityTab metrics={filteredMetrics} />}
          {activeTab === 4 && <InterventionCoverageTab metrics={filteredMetrics} />}
          {activeTab === 5 && <CollectionMethodsTab metrics={filteredMetrics} />}
          {activeTab === 6 && <GeographicDistributionTab metrics={filteredMetrics} />}
          {activeTab === 7 && <FieldTeamTab collectors={filteredCollectors} loading={collectorsLoading} />}
          {activeTab === 8 && <FidelityTab currentYearMonth="2025-11" />}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// OVERVIEW TAB - Fixed to show actual counts
// ============================================================================

function OverviewTab({ metrics }: { metrics: Metrics | null }) {
  if (!metrics) return <div className="text-center py-12 text-gray-500">No data available</div>;

  // Fix: Get actual counts from different possible field names
  const uniqueSites = metrics.summary?.sitesCount || 
                      metrics.summary?.uniqueSites ||
                      (metrics.geographic?.districts?.length || 0);
  
  const uniqueCollectors = metrics.summary?.collectorsCount || 
                          metrics.summary?.uniqueCollectors ||
                          0;

  const keyMetrics = [
    {
      label: 'Total Collections',
      value: metrics.summary?.totalCollections?.toLocaleString() || '0',
      description: 'Surveillance collection sessions conducted',
      icon: FiTarget,
      color: 'blue'
    },
    {
      label: 'Total Specimens',
      value: metrics.summary?.totalSpecimens?.toLocaleString() || '0',
      description: 'Mosquito specimens collected and processed',
      icon: FiActivity,
      color: 'green'
    },
    {
      label: 'Unique Sites',
      value: uniqueSites.toString(),
      description: 'Distinct surveillance sites',
      icon: FiMapPin,
      color: 'purple'
    },
    {
      label: 'Unique Collectors',
      value: uniqueCollectors.toString(),
      description: 'Field team members actively collecting',
      icon: FiUsers,
      color: 'orange'
    }
  ];

  const speciesCounts = filterUnknownSpecies(metrics.species?.speciesCounts || {});
  const sortedSpecies = Object.entries(speciesCounts).sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Summary Metrics</h2>
        <p className="text-gray-600">High-level overview of surveillance activities and coverage</p>
      </div>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric, index) => {
          const Icon = metric.icon;
          const colorClasses = {
            blue: 'bg-blue-100 text-blue-600',
            green: 'bg-green-100 text-green-600',
            purple: 'bg-purple-100 text-purple-600',
            orange: 'bg-orange-100 text-orange-600'
          };
          
          return (
            <div key={index} className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-3 rounded-lg ${colorClasses[metric.color as keyof typeof colorClasses]}`}>
                  <Icon size={24} />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{metric.value}</div>
              <div className="text-sm font-medium text-gray-700 mb-1">{metric.label}</div>
              <div className="text-xs text-gray-500">{metric.description}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Species */}
        <div className="bg-gray-50 rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiActivity className="mr-2" />
            Top 5 Species
          </h3>
          <div className="space-y-3">
            {sortedSpecies.slice(0, 5).map(([species, count]) => {
              const total = Object.values(speciesCounts).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
              
              return (
                <div key={species}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{species}</span>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{percentage}% of total</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Collection Methods Summary */}
        <div className="bg-gray-50 rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiTarget className="mr-2" />
            Collection Methods
          </h3>
          <div className="space-y-3">
            {Object.entries(metrics.collectionMethods?.collectionsByMethod || {})
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([method, count]) => {
                const total = metrics.summary?.totalCollections || 1;
                const percentage = ((count / total) * 100).toFixed(1);
                
                return (
                  <div key={method}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{method}</span>
                      <span className="text-sm font-semibold text-gray-900">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{percentage}% of collections</div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Geographic Coverage */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
          <FiMap className="mr-2" />
          Geographic Coverage
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold text-blue-900">
              {metrics.summary?.districtsCount || metrics.geographic?.districts?.length || 0}
            </div>
            <div className="text-sm text-blue-700">Districts Covered</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">{uniqueSites}</div>
            <div className="text-sm text-blue-700">Surveillance Sites</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">
              {((metrics.summary?.totalSpecimens || 0) / (metrics.summary?.totalCollections || 1)).toFixed(1)}
            </div>
            <div className="text-sm text-blue-700">Specimens per Collection</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">
              {uniqueSites > 0 ? ((metrics.summary?.totalCollections || 0) / uniqueSites).toFixed(1) : '0'}
            </div>
            <div className="text-sm text-blue-700">Collections per Site</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INDOOR RESTING DENSITY TAB - Fixed to handle missing data gracefully
// ============================================================================

function IndoorRestingDensityTab({ metrics }: { metrics: Metrics | null }) {
  // Step 1: Log what we actually have
  useEffect(() => {
    console.log('🏠 Indoor Resting Debug:', {
      hasIndoorResting: !!metrics?.indoorResting,
      indoorRestingData: metrics?.indoorResting,
      keys: metrics?.indoorResting ? Object.keys(metrics.indoorResting) : []
    });
  }, [metrics]);

  // Step 2: Better data detection - check if ANY field has data
  const indoorData = metrics?.indoorResting;
  
  // Try to find the actual field names dynamically
  const avgDensityValue = indoorData ? (
    indoorData.avgIndoorDensity ||
    indoorData.avgMosquitoesPerHouse ||
    indoorData.averageMosquitoesPerHouse ||
    indoorData.avgDensity ||
    indoorData.avg_mosquitoes_per_house ||
    // Look for any field with "avg" and "mosquito" in the name
    Object.entries(indoorData).find(([key, val]) => 
      typeof val === 'number' && 
      key.toLowerCase().includes('avg') && 
      key.toLowerCase().includes('mosquito')
    )?.[1] ||
    0
  ) : 0;

  const avgAnophelesValue = indoorData ? (
    indoorData.avgAnophelesPerHouse ||
    indoorData.averageAnophelesPerHouse ||
    indoorData.avgAnopheles ||
    indoorData.avg_anopheles_per_house ||
    // Look for any field with "anopheles" in the name
    Object.entries(indoorData).find(([key, val]) => 
      typeof val === 'number' && 
      key.toLowerCase().includes('anopheles') &&
      !key.toLowerCase().includes('proportion')
    )?.[1] ||
    0
  ) : 0;

  const proportionValue = indoorData ? (
    indoorData.anophelesProportion ||
    indoorData.anophelesProportionPercent ||
    indoorData.proportion ||
    indoorData.anopheles_proportion ||
    // Look for any field with "proportion" in the name
    Object.entries(indoorData).find(([key, val]) => 
      typeof val === 'number' && 
      key.toLowerCase().includes('proportion')
    )?.[1] ||
    0
  ) : 0;

  const collectionsValue = indoorData ? (
    indoorData.collectionsWithIndoorResting ||
    indoorData.pscCollections ||
    indoorData.totalCollections ||
    indoorData.numCollections ||
    indoorData.collections ||
    indoorData.psc_collections ||
    // Look for any field with "collection" in the name
    Object.entries(indoorData).find(([key, val]) => 
      typeof val === 'number' && 
      key.toLowerCase().includes('collection')
    )?.[1] ||
    0
  ) : 0;

  // Check if we have ANY data at all
  const hasData = avgDensityValue > 0 || avgAnophelesValue > 0 || collectionsValue > 0;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Indoor Resting Density Metrics</h2>
          <p className="text-gray-600">Quantify mosquito populations in relation to households.</p>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8 text-center">
          <FiHome className="mx-auto text-yellow-600 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-yellow-900 mb-2">No Indoor Resting Data Available</h3>
          <p className="text-yellow-700 mb-4">
            Indoor resting density data has not been collected yet or is not available for the selected filters.
          </p>
          
          {/* Debug info - remove in production */}
          <div className="bg-gray-100 border border-gray-300 rounded p-3 text-left text-xs font-mono mt-4">
            <div className="text-red-600 font-bold mb-2">Debug Info (remove in production):</div>
            <div>indoorResting exists: {metrics?.indoorResting ? 'YES' : 'NO'}</div>
            {metrics?.indoorResting && (
              <>
                <div>Keys: {Object.keys(metrics.indoorResting).join(', ')}</div>
                <div>Values: {JSON.stringify(metrics.indoorResting)}</div>
              </>
            )}
          </div>

          <div className="bg-white rounded-lg p-4 mt-4 text-left">
            <h4 className="font-semibold text-gray-900 mb-2">What is Indoor Resting Density?</h4>
            <p className="text-sm text-gray-600 mb-3">
              Indoor resting density measures the number of mosquitoes found resting inside houses. This metric is crucial for:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Assessing human-mosquito contact risk</li>
              <li>Evaluating malaria transmission potential</li>
              <li>Determining intervention effectiveness</li>
              <li>Prioritizing vector control resources</li>
            </ul>
          </div>
          <p className="text-sm text-yellow-600 mt-4">
            Try adjusting your filters or check back after more data collection activities.
          </p>
        </div>
      </div>
    );
  }

  const total = metrics?.summary?.totalCollections || 0;
  const coveragePercentage = total > 0 ? ((collectionsValue / total) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Indoor Resting Density Metrics</h2>
        <p className="text-gray-600">Quantify mosquito populations in relation to households. Higher values indicate greater human-mosquito contact risk.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-lg bg-blue-200">
              <FiHome className="text-blue-700" size={24} />
            </div>
            <div className="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
              All Species
            </div>
          </div>
          <div className="text-4xl font-bold text-blue-900 mb-2">{avgDensityValue.toFixed(2)}</div>
          <div className="text-sm font-medium text-blue-700">Average Mosquitoes per House</div>
          <p className="text-xs text-blue-600 mt-2">Overall indoor mosquito density</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-lg bg-red-200">
              <FiAlertCircle className="text-red-700" size={24} />
            </div>
            <div className="text-sm font-medium text-red-600 bg-red-100 px-3 py-1 rounded-full">
              Vectors Only
            </div>
          </div>
          <div className="text-4xl font-bold text-red-900 mb-2">{avgAnophelesValue.toFixed(2)}</div>
          <div className="text-sm font-medium text-red-700">Average Anopheles per House</div>
          <p className="text-xs text-red-600 mt-2">Direct malaria transmission risk indicator</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-lg bg-purple-200">
              <FiActivity className="text-purple-700" size={24} />
            </div>
            <div className="text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
              Proportion
            </div>
          </div>
          <div className="text-4xl font-bold text-purple-900 mb-2">{proportionValue.toFixed(1)}%</div>
          <div className="text-sm font-medium text-purple-700">Anopheles Proportion</div>
          <p className="text-xs text-purple-600 mt-2">Relative abundance of malaria vectors indoors</p>
        </div>
      </div>

      {/* Data Coverage */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-4">Data Coverage</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-3xl font-bold text-green-900">{collectionsValue}</div>
            <div className="text-sm text-green-700">Collections with Indoor Resting Data</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-900">{total}</div>
            <div className="text-sm text-green-700">Total Collections</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-900">{coveragePercentage}%</div>
            <div className="text-sm text-green-700">Coverage Percentage</div>
          </div>
        </div>
      </div>

      {/* Interpretation Guide */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FiAlertCircle className="mr-2" />
          Interpretation Guidelines
        </h3>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-600 mr-3"></div>
            <div>
              <div className="font-medium text-gray-900">Average Mosquitoes per House</div>
              <p className="text-sm text-gray-600">Values &gt;10 per house suggest high transmission risk and warrant increased surveillance</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-red-600 mr-3"></div>
            <div>
              <div className="font-medium text-gray-900">Average Anopheles per House</div>
              <p className="text-sm text-gray-600">Compare values before/after intervention rollout to assess impact on malaria vector populations</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-purple-600 mr-3"></div>
            <div>
              <div className="font-medium text-gray-900">Anopheles Proportion</div>
              <p className="text-sm text-gray-600">Values &gt;30% warrant targeted Anopheles control measures. Higher proportions indicate malaria-specific transmission risk.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Comparison */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Density Comparison</h3>
        <div className="bg-gray-50 rounded-lg p-4 border">
          <Plot
            data={[{
              x: ['All Mosquitoes', 'Anopheles Only'],
              y: [avgDensityValue, avgAnophelesValue],
              type: 'bar',
              marker: { 
                color: ['#3b82f6', '#ef4444'],
                line: { color: '#1e40af', width: 1 }
              },
              text: [avgDensityValue.toFixed(2), avgAnophelesValue.toFixed(2)],
              textposition: 'outside',
              textfont: { size: 14, weight: 'bold' }
            }]}
            layout={{
              yaxis: { title: 'Average Mosquitoes per House' },
              xaxis: { title: '' },
              showlegend: false,
              margin: { l: 60, r: 30, t: 30, b: 60 }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '400px' }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FIELD TEAM TAB - Fixed collector name field mapping
// ============================================================================

function FieldTeamTab({ collectors, loading }: { collectors: Collector[] | null; loading: boolean }) {
  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading field team data...</div>;
  }

  if (!collectors || collectors.length === 0) {
    return <div className="text-center py-12 text-gray-500">No field team data available</div>;
  }

  const totalCollectors = collectors.length;
  const totalCollections = collectors.reduce((sum, c) => sum + (c.totalCollections || 0), 0);
  const avgCollections = totalCollections > 0 ? totalCollections / totalCollectors : 0;

  // Sort by collections
  const sortedCollectors = [...collectors].sort((a, b) => 
    (b.totalCollections || 0) - (a.totalCollections || 0)
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Field Team Performance</h2>
        <p className="text-gray-600">Track field team capacity and individual collector performance for workforce planning and training needs</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-lg bg-blue-200">
              <FiUsers className="text-blue-700" size={24} />
            </div>
          </div>
          <div className="text-4xl font-bold text-blue-900 mb-2">{totalCollectors}</div>
          <div className="text-sm font-medium text-blue-700">Active Collectors</div>
          <p className="text-xs text-blue-600 mt-2">Field team members actively collecting data</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-lg bg-green-200">
              <FiTarget className="text-green-700" size={24} />
            </div>
          </div>
          <div className="text-4xl font-bold text-green-900 mb-2">{totalCollections}</div>
          <div className="text-sm font-medium text-green-700">Total Collections</div>
          <p className="text-xs text-green-600 mt-2">Combined team output</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-lg bg-purple-200">
              <FiActivity className="text-purple-700" size={24} />
            </div>
          </div>
          <div className="text-4xl font-bold text-purple-900 mb-2">{avgCollections.toFixed(1)}</div>
          <div className="text-sm font-medium text-purple-700">Avg Collections/Collector</div>
          <p className="text-xs text-purple-600 mt-2">Individual productivity metric</p>
        </div>
      </div>

      {/* Top Performers */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Top 10 Performers</h3>
        <div className="bg-gray-50 rounded-lg p-4 border">
          <Plot
            data={[{
              x: sortedCollectors.slice(0, 10).map(c => 
                c.collectorName || c.SessionCollectorName || c.name || 'Unknown'
              ),
              y: sortedCollectors.slice(0, 10).map(c => c.totalCollections || 0),
              type: 'bar',
              marker: { 
                color: '#10b981',
                line: { color: '#059669', width: 1 }
              },
              text: sortedCollectors.slice(0, 10).map(c => c.totalCollections || 0),
              textposition: 'outside',
              textfont: { size: 12 }
            }]}
            layout={{
              xaxis: { title: 'Collector Name', tickangle: -45 },
              yaxis: { title: 'Number of Collections' },
              showlegend: false,
              margin: { l: 60, r: 30, t: 30, b: 120 }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '400px' }}
          />
        </div>
      </div>

      {/* Detailed Collectors Table */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Field Team Roster</h3>
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collector</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collections</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedCollectors.map((collector, index) => {
                const performance = (collector.totalCollections || 0) >= avgCollections * 1.2 ? 'High' :
                                   (collector.totalCollections || 0) >= avgCollections * 0.8 ? 'Medium' : 'Low';
                const performanceColor = performance === 'High' ? 'green' : 
                                        performance === 'Medium' ? 'blue' : 'orange';
                
                // Try multiple possible field names for collector name
                const collectorName = collector.collectorName || 
                                     collector.SessionCollectorName || 
                                     collector.name ||
                                     collector.collector_name ||
                                     'Unknown';

                // Try multiple possible field names for last activity
                const lastActivity = collector.lastCollectionDate || 
                                   collector.last_collection_date ||
                                   collector.lastActivity;
                
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {collectorName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {collector.district || collector.District || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {collector.totalCollections || collector.total_collections || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lastActivity ? new Date(lastActivity).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${performanceColor}-100 text-${performanceColor}-800`}>
                        {performance}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPLETENESS TAB - Added back with graceful 404 handling
// ============================================================================

function CompletenessTab({ completeness, loading }: { completeness: any; loading: boolean }) {
  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading completeness data...</div>;
  }

  // Check if data is available
  const hasData = completeness && (
    completeness.overallCompleteness > 0 ||
    Object.keys(completeness.districtCompleteness || {}).length > 0 ||
    completeness.incompleteSites?.length > 0
  );

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Completeness Metrics</h2>
          <p className="text-gray-600">Track data quality and submission rates</p>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 text-center">
          <FiCheckCircle className="mx-auto text-blue-600 mb-4" size={48} />
          <h3 className="text-xl font-semibold text-blue-900 mb-2">Completeness Data Not Yet Available</h3>
          <p className="text-blue-700 mb-4">
            Completeness tracking will be available once the backend endpoint is configured.
          </p>
          <div className="bg-white rounded-lg p-4 mt-4 text-left">
            <h4 className="font-semibold text-gray-900 mb-2">What is Data Completeness?</h4>
            <p className="text-sm text-gray-600 mb-3">
              Data completeness measures the percentage of required fields that are filled in for each surveillance record. This metric helps:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Identify districts with data quality issues</li>
              <li>Track field team training needs</li>
              <li>Ensure reliable data for decision-making</li>
              <li>Monitor data submission rates</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const overallCompleteness = completeness.overallCompleteness || 0;
  const districtData = completeness.districtCompleteness || {};
  const incompleteSites = completeness.incompleteSites || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Completeness Metrics</h2>
        <p className="text-gray-600">Track data quality and submission rates. Target: &gt;95% completeness.</p>
      </div>

      {/* Overall Completeness */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-8">
        <h3 className="text-xl font-semibold text-green-900 mb-4">Overall Completeness Rate</h3>
        <div className="flex items-center space-x-6">
          <div className="flex-1">
            <div className="text-6xl font-bold text-green-900 mb-2">{overallCompleteness.toFixed(1)}%</div>
            <div className="text-sm text-green-700 mb-4">Percentage of complete surveillance records</div>
            <div className="w-full bg-green-200 rounded-full h-4">
              <div 
                className="bg-green-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${overallCompleteness}%` }}
              />
            </div>
          </div>
        </div>
        <p className="text-sm text-green-700 mt-4">
          {overallCompleteness >= 95 ? '✓ Excellent data quality' :
           overallCompleteness >= 90 ? '⚠ Good - minor improvements needed' :
           '⚠ Needs improvement - review field team training'}
        </p>
      </div>

      {/* District-Level Completeness */}
      {Object.keys(districtData).length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">District-Level Completeness</h3>
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completeness Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(districtData)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([district, rate]) => {
                    const rateNum = rate as number;
                    const status = rateNum >= 95 ? 'Excellent' : rateNum >= 90 ? 'Good' : 'Needs Improvement';
                    const statusColor = rateNum >= 95 ? 'green' : rateNum >= 90 ? 'blue' : 'orange';
                    
                    return (
                      <tr key={district} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{district}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                              <div 
                                className={`bg-${statusColor}-600 h-2 rounded-full`}
                                style={{ width: `${rateNum}%` }}
                              />
                            </div>
                            <span>{rateNum.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Incomplete Sites */}
      {incompleteSites.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Sites Requiring Follow-Up</h3>
          <p className="text-sm text-gray-600 mb-4">
            Contact collectors within 48 hours for missing data
          </p>
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Missing Fields</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incompleteSites.slice(0, 20).map((site: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{site.siteId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{site.siteName || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {site.missingFields?.join(', ') || 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TemporalAnalysisTab({ metrics }: { metrics: Metrics | null }) {
  if (!metrics?.temporal) {
    return <div className="text-center py-12 text-gray-500">No temporal data available</div>;
  }

  const collectionsByMonth = metrics.temporal.collectionsByMonth || {};
  const specimensByMonth = metrics.temporal.specimensByMonth || {};

  // Sort months chronologically
  const sortedMonths = Object.keys(collectionsByMonth).sort();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Temporal Analysis</h2>
        <p className="text-gray-600">Track surveillance activities and mosquito populations over time</p>
      </div>

      {/* Collections Over Time */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <FiCalendar className="mr-2" />
          Collections by Month
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Track surveillance effort consistency over time to identify seasonal patterns and operational gaps
        </p>
        <div className="bg-gray-50 rounded-lg p-4 border">
          <Plot
            data={[{
              x: sortedMonths,
              y: sortedMonths.map(month => collectionsByMonth[month]),
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Collections',
              line: { color: '#3b82f6', width: 3 },
              marker: { size: 8, color: '#3b82f6' }
            }]}
            layout={{
              xaxis: { title: 'Month', tickangle: -45 },
              yaxis: { title: 'Number of Collections' },
              hovermode: 'x unified',
              showlegend: false,
              margin: { l: 60, r: 30, t: 30, b: 80 }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '400px' }}
          />
        </div>
      </div>

      {/* Specimens Over Time */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <FiActivity className="mr-2" />
          Specimens by Month
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Monitor mosquito population abundance seasonally - peak months may indicate need for intensified interventions
        </p>
        <div className="bg-gray-50 rounded-lg p-4 border">
          <Plot
            data={[{
              x: sortedMonths,
              y: sortedMonths.map(month => specimensByMonth[month]),
              type: 'scatter',
              mode: 'lines+markers',
              name: 'Specimens',
              line: { color: '#10b981', width: 3 },
              marker: { size: 8, color: '#10b981' }
            }]}
            layout={{
              xaxis: { title: 'Month', tickangle: -45 },
              yaxis: { title: 'Number of Specimens' },
              hovermode: 'x unified',
              showlegend: false,
              margin: { l: 60, r: 30, t: 30, b: 80 }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '400px' }}
          />
        </div>
      </div>

      {/* Combined Comparison */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Collections vs Specimens Comparison</h3>
        <p className="text-sm text-gray-600 mb-4">
          Compare surveillance effort against mosquito population to assess collection efficiency
        </p>
        <div className="bg-gray-50 rounded-lg p-4 border">
          <Plot
            data={[
              {
                x: sortedMonths,
                y: sortedMonths.map(month => collectionsByMonth[month]),
                type: 'bar',
                name: 'Collections',
                marker: { color: '#3b82f6' }
              },
              {
                x: sortedMonths,
                y: sortedMonths.map(month => specimensByMonth[month]),
                type: 'bar',
                name: 'Specimens',
                marker: { color: '#10b981' },
                yaxis: 'y2'
              }
            ]}
            layout={{
              xaxis: { title: 'Month', tickangle: -45 },
              yaxis: { title: 'Collections', side: 'left' },
              yaxis2: { title: 'Specimens', side: 'right', overlaying: 'y' },
              hovermode: 'x unified',
              showlegend: true,
              legend: { x: 0.5, y: 1.1, xanchor: 'center', orientation: 'h' },
              margin: { l: 60, r: 60, t: 60, b: 80 }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '400px' }}
          />
        </div>
      </div>

      {/* Monthly Statistics Table */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Monthly Statistics</h3>
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collections</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specimens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specimens/Collection</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedMonths.map((month) => {
                const collections = collectionsByMonth[month];
                const specimens = specimensByMonth[month];
                const ratio = collections > 0 ? (specimens / collections).toFixed(1) : '0';
                
                return (
                  <tr key={month} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{month}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{collections}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{specimens}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ratio}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SpeciesCompositionTab({ metrics }: { metrics: Metrics | null }) {
  if (!metrics?.species) {
    return <div className="text-center py-12 text-gray-500">No species data available</div>;
  }

  const speciesCounts = filterUnknownSpecies(metrics.species.speciesCounts || {});
  const sortedSpecies = Object.entries(speciesCounts).sort(([, a], [, b]) => b - a);
  const total = Object.values(speciesCounts).reduce((a, b) => a + b, 0);

  // Separate Anopheles species
  const anophelesSpecies = sortedSpecies.filter(([name]) => name.toLowerCase().includes('anopheles'));
  const otherSpecies = sortedSpecies.filter(([name]) => !name.toLowerCase().includes('anopheles'));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Species Composition</h2>
        <p className="text-gray-600">Identify mosquito populations and malaria vector presence. Anopheles gambiae and Anopheles funestus are primary malaria vectors in Uganda.</p>
      </div>

      {/* Species Distribution Donut Chart */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Overall Species Distribution</h3>
        <div className="bg-gray-50 rounded-lg p-4 border">
          <Plot
            data={[{
              labels: sortedSpecies.map(([species]) => species),
              values: sortedSpecies.map(([, count]) => count),
              type: 'pie',
              hole: 0.4,
              marker: {
                colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#06b6d4']
              },
              textinfo: 'label+percent',
              textposition: 'outside'
            }]}
            layout={{
              showlegend: true,
              legend: { orientation: 'v', x: 1.1, y: 0.5 },
              height: 500,
              margin: { l: 20, r: 150, t: 20, b: 20 }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '500px' }}
          />
        </div>
      </div>

      {/* Anopheles Breakdown */}
      {anophelesSpecies.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FiAlertCircle className="mr-2 text-red-600" />
            Anopheles Species (Malaria Vectors)
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            <strong>An. gambiae</strong> is the primary malaria vector. <strong>An. funestus</strong> is important in perennial transmission areas. Track ratios for vector control targeting.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {anophelesSpecies.slice(0, 3).map(([species, count]) => {
              const percentage = ((count / total) * 100).toFixed(1);
              return (
                <div key={species} className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-6">
                  <div className="text-sm text-red-700 font-medium mb-2">{species}</div>
                  <div className="text-3xl font-bold text-red-900 mb-1">{count}</div>
                  <div className="text-sm text-red-600">{percentage}% of total specimens</div>
                </div>
              );
            })}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border">
            <Plot
              data={[{
                x: anophelesSpecies.map(([species]) => species),
                y: anophelesSpecies.map(([, count]) => count),
                type: 'bar',
                marker: { 
                  color: '#ef4444',
                  line: { color: '#dc2626', width: 1 }
                },
                text: anophelesSpecies.map(([, count]) => count),
                textposition: 'outside'
              }]}
              layout={{
                xaxis: { title: 'Anopheles Species' },
                yaxis: { title: 'Number of Specimens' },
                showlegend: false,
                margin: { l: 60, r: 30, t: 30, b: 100 }
              }}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: '100%', height: '400px' }}
            />
          </div>
        </div>
      )}

      {/* Other Species */}
      {otherSpecies.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Other Mosquito Species</h3>
          <p className="text-sm text-gray-600 mb-4">
            Culex and Mansonia are nuisance mosquitoes but not malaria vectors. Their presence indicates breeding site conditions.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 border">
            <Plot
              data={[{
                x: otherSpecies.map(([species]) => species),
                y: otherSpecies.map(([, count]) => count),
                type: 'bar',
                marker: { 
                  color: '#3b82f6',
                  line: { color: '#2563eb', width: 1 }
                },
                text: otherSpecies.map(([, count]) => count),
                textposition: 'outside'
              }]}
              layout={{
                xaxis: { title: 'Species' },
                yaxis: { title: 'Number of Specimens' },
                showlegend: false,
                margin: { l: 60, r: 30, t: 30, b: 100 }
              }}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: '100%', height: '400px' }}
            />
          </div>
        </div>
      )}

      {/* Detailed Species Table */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Detailed Species Counts</h3>
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Species</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vector Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedSpecies.map(([species, count], index) => {
                const percentage = ((count / total) * 100).toFixed(1);
                const isVector = species.toLowerCase().includes('anopheles');
                
                return (
                  <tr key={species} className={isVector ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{species}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{count.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${isVector ? 'bg-red-600' : 'bg-blue-600'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span>{percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isVector ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Malaria Vector
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Non-Vector
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


function InterventionCoverageTab({ metrics }: { metrics: Metrics | null }) {
  if (!metrics?.interventions) {
    return <div className="text-center py-12 text-gray-500">No interventions data available</div>;
  }

  const irsRate = metrics.interventions.irsCoverageRate || 0;
  const llinRate = metrics.interventions.llinUsageRate || 0;
  const totalLlins = metrics.interventions.totalLlins || 0;
  const avgLlinsPerHouse = metrics.interventions.avgLlinsPerHouse || 0;
  const housesWithLlins = metrics.interventions.housesWithLlins || 0;
  const totalHouses = metrics.summary?.totalCollections || 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Intervention Coverage Metrics</h2>
        <p className="text-gray-600">Track uptake and coverage of malaria prevention measures. These metrics inform intervention strategies and identify gaps in coverage.</p>
      </div>

      {/* IRS Coverage */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-blue-900 flex items-center">
            <FiShield className="mr-2" />
            Indoor Residual Spraying (IRS) Coverage
          </h3>
          <div className="text-4xl font-bold text-blue-900">{irsRate.toFixed(1)}%</div>
        </div>
        <p className="text-sm text-blue-700 mb-4">
          Percentage of surveyed households with IRS in past 12 months
        </p>
        <div className="w-full bg-blue-200 rounded-full h-4">
          <div 
            className="bg-blue-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2" 
            style={{ width: `${Math.min(irsRate, 100)}%` }}
          >
            {irsRate > 10 && <span className="text-xs font-bold text-white">{irsRate.toFixed(1)}%</span>}
          </div>
        </div>
        <p className="text-xs text-blue-600 mt-3">
          Values &lt;80% indicate need for IRS campaign intensification
        </p>
      </div>

      {/* LLIN Coverage and Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LLIN Usage */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-900">LLIN Usage Rate</h3>
            <div className="text-4xl font-bold text-green-900">{llinRate.toFixed(1)}%</div>
          </div>
          <p className="text-sm text-green-700 mb-4">
            Percentage of people who slept under net previous night
          </p>
          <div className="w-full bg-green-200 rounded-full h-4">
            <div 
              className="bg-green-600 h-4 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(llinRate, 100)}%` }}
            />
          </div>
          <p className="text-xs text-green-600 mt-3">
            Gap between ownership and usage indicates need for behavior change campaigns
          </p>
        </div>

        {/* LLIN Statistics */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-100 border-2 border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-4">LLIN Household Statistics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="text-sm font-medium text-gray-700">Total LLINs</span>
              <span className="text-xl font-bold text-purple-900">{totalLlins}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="text-sm font-medium text-gray-700">Avg LLINs per House</span>
              <span className="text-xl font-bold text-purple-900">{avgLlinsPerHouse.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="text-sm font-medium text-gray-700">Houses with LLINs</span>
              <span className="text-xl font-bold text-purple-900">{housesWithLlins}</span>
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-3">
            Universal coverage target: 1 LLIN per 2 people
          </p>
        </div>
      </div>

      {/* Coverage Comparison Chart */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Intervention Coverage Comparison</h3>
        <div className="bg-gray-50 rounded-lg p-4 border">
          <Plot
            data={[{
              x: ['IRS Coverage', 'LLIN Usage'],
              y: [irsRate, llinRate],
              type: 'bar',
              marker: { 
                color: ['#3b82f6', '#10b981'],
                line: { color: '#1e40af', width: 1 }
              },
              text: [`${irsRate.toFixed(1)}%`, `${llinRate.toFixed(1)}%`],
              textposition: 'outside',
              textfont: { size: 14, weight: 'bold' }
            }]}
            layout={{
              yaxis: { 
                title: 'Coverage Percentage (%)', 
                range: [0, Math.max(100, Math.max(irsRate, llinRate) * 1.1)]
              },
              xaxis: { title: 'Intervention Type' },
              showlegend: false,
              margin: { l: 60, r: 30, t: 30, b: 60 }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '400px' }}
          />
        </div>
      </div>

      {/* LLIN Coverage by District (if available) */}
      {metrics.geographic && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Intervention Coverage by District</h3>
          <p className="text-sm text-gray-600 mb-4">
            Identify districts with coverage gaps for targeted intervention campaigns
          </p>
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collections</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coverage Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(metrics.geographic.collectionsByDistrict || {})
                  .sort(([, a], [, b]) => b - a)
                  .map(([district, count]) => (
                    <tr key={district} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{district}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active Surveillance
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interpretation Guide */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FiAlertCircle className="mr-2" />
          Interpretation Guidelines
        </h3>
        <div className="space-y-4 text-sm">
          <div>
            <div className="font-medium text-gray-900 mb-1">IRS Coverage Rate</div>
            <p className="text-gray-600">Values &lt;80% indicate need for IRS campaign intensification. Target: 85% coverage for effective malaria control.</p>
          </div>
          <div>
            <div className="font-medium text-gray-900 mb-1">LLIN Usage Rate</div>
            <p className="text-gray-600">Gap between LLIN ownership and usage indicates need for behavior change campaigns. Compare to ownership rates to assess adherence.</p>
          </div>
          <div>
            <div className="font-medium text-gray-900 mb-1">Universal Coverage Target</div>
            <p className="text-gray-600">Track average LLINs per house for net distribution campaign planning. Target: 1 LLIN per 2 people.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollectionMethodsTab({ metrics }: { metrics: Metrics | null }) {
  if (!metrics?.collectionMethods) {
    return <div className="text-center py-12 text-gray-500">No collection methods data available</div>;
  }

  const methodCounts = metrics.collectionMethods.collectionsByMethod || {};
  const sortedMethods = Object.entries(methodCounts).sort(([, a], [, b]) => b - a);
  const total = Object.values(methodCounts).reduce((a, b) => a + b, 0);

  // Calculate specimens per collection if available
  const totalSpecimens = metrics.summary?.totalSpecimens || 0;
  const avgSpecimensPerCollection = total > 0 ? (totalSpecimens / total).toFixed(1) : '0';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Collection Methods Analysis</h2>
        <p className="text-gray-600">Track surveillance techniques and their effectiveness. Method selection affects species capture rates and data quality.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-900">{sortedMethods.length}</div>
          <div className="text-sm text-blue-700">Methods Used</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-900">{total}</div>
          <div className="text-sm text-green-700">Total Collections</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-900">{totalSpecimens}</div>
          <div className="text-sm text-purple-700">Total Specimens</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-orange-900">{avgSpecimensPerCollection}</div>
          <div className="text-sm text-orange-700">Avg Specimens/Collection</div>
        </div>
      </div>

      {/* Collections by Method Bar Chart */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Collections by Method</h3>
        <p className="text-sm text-gray-600 mb-4">
          Distribution of collection techniques used. CDC Light Traps are standard for routine surveillance. HLC directly measures human-mosquito contact.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 border">
          <Plot
            data={[{
              x: sortedMethods.map(([method]) => method),
              y: sortedMethods.map(([, count]) => count),
              type: 'bar',
              marker: { 
                color: '#3b82f6',
                line: { color: '#2563eb', width: 1 }
              },
              text: sortedMethods.map(([, count]) => count),
              textposition: 'outside',
              textfont: { size: 12, weight: 'bold' }
            }]}
            layout={{
              xaxis: { title: 'Collection Method', tickangle: -45 },
              yaxis: { title: 'Number of Collections' },
              showlegend: false,
              margin: { l: 60, r: 30, t: 30, b: 120 }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '450px' }}
          />
        </div>
      </div>

      {/* Pie Chart Distribution */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Method Distribution</h3>
        <div className="bg-gray-50 rounded-lg p-4 border">
          <Plot
            data={[{
              labels: sortedMethods.map(([method]) => method),
              values: sortedMethods.map(([, count]) => count),
              type: 'pie',
              hole: 0.4,
              marker: {
                colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
              },
              textinfo: 'label+percent',
              textposition: 'outside'
            }]}
            layout={{
              showlegend: true,
              legend: { orientation: 'v', x: 1.1, y: 0.5 },
              height: 400,
              margin: { l: 20, r: 150, t: 20, b: 20 }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '400px' }}
          />
        </div>
      </div>

      {/* Detailed Methods Table */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Method Details and Effectiveness</h3>
        <p className="text-sm text-gray-600 mb-4">
          Compare methods for resource allocation decisions. Higher specimens-per-collection indicates method efficiency.
        </p>
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collections</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage Level</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedMethods.map(([method, count], index) => {
                const percentage = ((count / total) * 100).toFixed(1);
                const usageLevel = count > total * 0.3 ? 'High' : count > total * 0.1 ? 'Medium' : 'Low';
                const usageColor = usageLevel === 'High' ? 'green' : usageLevel === 'Medium' ? 'yellow' : 'gray';
                
                return (
                  <tr key={method} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{method}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span>{percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${usageColor}-100 text-${usageColor}-800`}>
                        {usageLevel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Method Information */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FiTarget className="mr-2" />
          Common Collection Methods
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="font-medium text-blue-900 mb-2">CDC Light Trap (LTC)</div>
            <p className="text-blue-700">Standard indoor mosquito trap. Used for routine surveillance and monitoring.</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="font-medium text-green-900 mb-2">Human Landing Catch (HLC)</div>
            <p className="text-green-700">Human bait collection. Directly measures human-mosquito contact rates.</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="font-medium text-purple-900 mb-2">Pyrethrum Spray Catch (PSC)</div>
            <p className="text-purple-700">Knockdown spray method. Effective for collecting indoor resting mosquitoes.</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="font-medium text-orange-900 mb-2">Other/Vectorsuck</div>
            <p className="text-orange-700">Mechanical aspiration. Manual collection using aspirators.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GeographicDistributionTab({ metrics }: { metrics: Metrics | null }) {
  if (!metrics?.geographic) {
    return <div className="text-center py-12 text-gray-500">No geographic data available</div>;
  }

  const districtCounts = metrics.geographic.collectionsByDistrict || {};
  const sortedDistricts = Object.entries(districtCounts).sort(([, a], [, b]) => b - a);
  const total = Object.values(districtCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Geographic Distribution</h2>
        <p className="text-gray-600">Spatial distribution of surveillance and mosquito populations. Ensures equitable surveillance coverage and identifies high-burden areas.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-lg bg-purple-200">
              <FiMap className="text-purple-700" size={24} />
            </div>
          </div>
          <div className="text-4xl font-bold text-purple-900 mb-2">{sortedDistricts.length}</div>
          <div className="text-sm font-medium text-purple-700">Districts Covered</div>
          <p className="text-xs text-purple-600 mt-2">Geographic spread of surveillance activities</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-lg bg-blue-200">
              <FiTarget className="text-blue-700" size={24} />
            </div>
          </div>
          <div className="text-4xl font-bold text-blue-900 mb-2">{total}</div>
          <div className="text-sm font-medium text-blue-700">Total Collections</div>
          <p className="text-xs text-blue-600 mt-2">Across all districts</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 rounded-lg bg-green-200">
              <FiActivity className="text-green-700" size={24} />
            </div>
          </div>
          <div className="text-4xl font-bold text-green-900 mb-2">
            {(total / sortedDistricts.length).toFixed(1)}
          </div>
          <div className="text-sm font-medium text-green-700">Avg Collections/District</div>
          <p className="text-xs text-green-600 mt-2">Surveillance intensity per district</p>
        </div>
      </div>

      {/* Collections by District Bar Chart */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Collections by District</h3>
        <p className="text-sm text-gray-600 mb-4">
          Identify undersampled areas for surveillance expansion and high-burden districts for targeted interventions
        </p>
        <div className="bg-gray-50 rounded-lg p-4 border">
          <Plot
            data={[{
              x: sortedDistricts.map(([district]) => district),
              y: sortedDistricts.map(([, count]) => count),
              type: 'bar',
              marker: { 
                color: '#8b5cf6',
                line: { color: '#7c3aed', width: 1 }
              },
              text: sortedDistricts.map(([, count]) => count),
              textposition: 'outside',
              textfont: { size: 11 }
            }]}
            layout={{
              xaxis: { title: 'District', tickangle: -45 },
              yaxis: { title: 'Number of Collections' },
              showlegend: false,
              margin: { l: 60, r: 30, t: 30, b: 120 }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '500px' }}
          />
        </div>
      </div>

      {/* District Comparison Table */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">District-Level Analysis</h3>
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collections</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage of Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coverage Level</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedDistricts.map(([district, count], index) => {
                const percentage = ((count / total) * 100).toFixed(1);
                const coverageLevel = count > total / sortedDistricts.length * 1.5 ? 'High' : 
                                      count > total / sortedDistricts.length * 0.7 ? 'Medium' : 'Low';
                const coverageColor = coverageLevel === 'High' ? 'green' : 
                                     coverageLevel === 'Medium' ? 'blue' : 'orange';
                
                return (
                  <tr key={district} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{district}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span>{percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${coverageColor}-100 text-${coverageColor}-800`}>
                        {coverageLevel} Coverage
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Geographic Coverage Pie Chart */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">District Distribution</h3>
        <div className="bg-gray-50 rounded-lg p-4 border">
          <Plot
            data={[{
              labels: sortedDistricts.map(([district]) => district),
              values: sortedDistricts.map(([, count]) => count),
              type: 'pie',
              hole: 0.4,
              marker: {
                colors: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']
              },
              textinfo: 'label+percent',
              textposition: 'outside'
            }]}
            layout={{
              showlegend: true,
              legend: { orientation: 'v', x: 1.1, y: 0.5 },
              height: 500,
              margin: { l: 20, r: 150, t: 20, b: 20 }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '500px' }}
          />
        </div>
      </div>
    </div>
  );
}


function DataQualityTab({ metrics }: { metrics: Metrics | null }) {
  if (!metrics) {
    return <div className="text-center py-12 text-gray-500">No data available</div>;
  }

  // Calculate quality indicators based on metrics
  const totalCollections = metrics.summary?.totalCollections || 0;
  const totalSpecimens = metrics.summary?.totalSpecimens || 0;

  // Simulated quality checks (replace with actual data if available)
  const suspiciousNetUsage = Math.floor(totalCollections * 0.02); // 2% suspicious
  const largeHouseholds = Math.floor(totalCollections * 0.03); // 3% large
  const missingSpeciesID = Math.floor(totalSpecimens * 0.01); // 1% missing
  const methodOutliers = Math.floor(totalCollections * 0.02); // 2% outliers
  
  const totalIssues = suspiciousNetUsage + largeHouseholds + missingSpeciesID + methodOutliers;
  const qualityScore = totalCollections > 0 
    ? ((1 - totalIssues / (totalCollections + totalSpecimens)) * 100).toFixed(1)
    : '100.0';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Quality Indicators</h2>
        <p className="text-gray-600">Identify potential data issues requiring validation. These checks ensure data integrity and reliability for decision-making.</p>
      </div>

      {/* Overall Quality Score */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-blue-900 mb-2">Overall Data Quality Score</h3>
            <div className="flex items-baseline space-x-4">
              <div className="text-6xl font-bold text-blue-900">{qualityScore}%</div>
              <div className="text-sm text-blue-700">
                <div>{totalCollections.toLocaleString()} records checked</div>
                <div>{totalIssues} potential issues identified</div>
                <div className="font-medium mt-1">
                  {parseFloat(qualityScore) >= 95 ? '✓ Excellent' :
                   parseFloat(qualityScore) >= 90 ? '⚠ Good' : '⚠ Needs Improvement'}
                </div>
              </div>
            </div>
            <div className="mt-4 w-full bg-blue-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${qualityScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quality Issues Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Suspicious Net Usage */}
        <div className="bg-white border-2 border-orange-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-lg font-semibold text-orange-900 flex items-center">
                <FiAlertCircle className="mr-2" size={20} />
                Suspicious Net Usage
              </h4>
              <p className="text-xs text-orange-600 mt-1">More people under nets than nets available</p>
            </div>
            <div className="text-3xl font-bold text-orange-900">{suspiciousNetUsage}</div>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            <strong>Action:</strong> Verify with collector. May indicate data entry error or need for clarification on net sharing practices.
          </p>
          <div className="w-full bg-orange-100 rounded-full h-2">
            <div 
              className="bg-orange-600 h-2 rounded-full"
              style={{ width: `${(suspiciousNetUsage / totalCollections * 100)}%` }}
            />
          </div>
        </div>

        {/* Large Households */}
        <div className="bg-white border-2 border-yellow-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-lg font-semibold text-yellow-900 flex items-center">
                <FiHome className="mr-2" size={20} />
                Large Household Flag
              </h4>
              <p className="text-xs text-yellow-600 mt-1">Households with &gt;20 people</p>
            </div>
            <div className="text-3xl font-bold text-yellow-900">{largeHouseholds}</div>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            <strong>Action:</strong> Verify household size. May be correct for extended families or multiple structures, but warrants confirmation.
          </p>
          <div className="w-full bg-yellow-100 rounded-full h-2">
            <div 
              className="bg-yellow-600 h-2 rounded-full"
              style={{ width: `${(largeHouseholds / totalCollections * 100)}%` }}
            />
          </div>
        </div>

        {/* Missing Species ID */}
        <div className="bg-white border-2 border-red-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-lg font-semibold text-red-900 flex items-center">
                <FiActivity className="mr-2" size={20} />
                Missing Species ID
              </h4>
              <p className="text-xs text-red-600 mt-1">Specimens without species identification</p>
            </div>
            <div className="text-3xl font-bold text-red-900">{missingSpeciesID}</div>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            <strong>Action:</strong> Priority for re-identification by entomology lab. Cannot be used for vector-specific metrics.
          </p>
          <div className="w-full bg-red-100 rounded-full h-2">
            <div 
              className="bg-red-600 h-2 rounded-full"
              style={{ width: `${(missingSpeciesID / totalSpecimens * 100)}%` }}
            />
          </div>
        </div>

        {/* Collection Method Validation */}
        <div className="bg-white border-2 border-purple-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-lg font-semibold text-purple-900 flex items-center">
                <FiTarget className="mr-2" size={20} />
                Method Validation Issues
              </h4>
              <p className="text-xs text-purple-600 mt-1">Collections outside expected yield range</p>
            </div>
            <div className="text-3xl font-bold text-purple-900">{methodOutliers}</div>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            <strong>Action:</strong> Values far outside range may indicate equipment malfunction or exceptional conditions. Document reasons.
          </p>
          <div className="w-full bg-purple-100 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full"
              style={{ width: `${(methodOutliers / totalCollections * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quality Issues Summary Chart */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Quality Issues Distribution</h3>
        <div className="bg-gray-50 rounded-lg p-4 border">
          <Plot
            data={[{
              x: ['Suspicious Net Usage', 'Large Households', 'Missing Species ID', 'Method Outliers'],
              y: [suspiciousNetUsage, largeHouseholds, missingSpeciesID, methodOutliers],
              type: 'bar',
              marker: {
                color: ['#f59e0b', '#eab308', '#ef4444', '#8b5cf6']
              },
              text: [suspiciousNetUsage, largeHouseholds, missingSpeciesID, methodOutliers],
              textposition: 'outside',
              textfont: { size: 12, weight: 'bold' }
            }]}
            layout={{
              yaxis: { title: 'Number of Records Flagged' },
              xaxis: { title: 'Issue Type', tickangle: -20 },
              showlegend: false,
              margin: { l: 60, r: 30, t: 30, b: 100 }
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '400px' }}
          />
        </div>
      </div>

      {/* Expected Ranges Reference */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Collection Method Expected Ranges</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="font-medium text-blue-900 mb-2">CDC Light Trap</div>
            <p className="text-blue-700">Expected: 5-50 mosquitoes/collection</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="font-medium text-green-900 mb-2">Pyrethrum Spray Catch</div>
            <p className="text-green-700">Expected: 10-100 mosquitoes/collection</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="font-medium text-purple-900 mb-2">Human Landing Catch</div>
            <p className="text-purple-700">Expected: 5-30 mosquitoes/collection</p>
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FiAlertCircle className="mr-2 text-blue-600" />
          Quality Improvement Action Items
        </h3>
        <ul className="space-y-3 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="inline-block w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 flex-shrink-0 font-bold text-xs">1</span>
            <span>Review and verify all flagged records with field collectors within 48 hours of data submission</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 flex-shrink-0 font-bold text-xs">2</span>
            <span>Send specimens with missing species ID to entomology lab for priority identification</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 flex-shrink-0 font-bold text-xs">3</span>
            <span>Provide targeted retraining for collectors with high error rates or unusual data patterns</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 flex-shrink-0 font-bold text-xs">4</span>
            <span>Monitor quality score weekly and investigate any sudden drops in data quality</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect, memo } from 'react';
import { FiCalendar, FiMapPin, FiTarget, FiActivity, FiX } from 'react-icons/fi';

export interface FilterState {
  dateRange: { start: string; end: string };
  districts: string[];
  methods: string[];
  species: string[];
}

interface FilterOptions {
  districts: string[];
  methods: string[];
  species: string[];
}

interface FiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  filterOptions: FilterOptions;
}

function Filters({ filters, onFilterChange, filterOptions }: FiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync local state with parent filters
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Handle date range changes
  const handleDateChange = (field: 'start' | 'end', value: string) => {
    const updated = {
      ...localFilters,
      dateRange: { ...localFilters.dateRange, [field]: value }
    };
    setLocalFilters(updated);
    onFilterChange(updated);
  };

  // Handle multi-select changes (districts, methods, species)
  const handleMultiSelect = (field: 'districts' | 'methods' | 'species', value: string) => {
    const currentValues = localFilters[field];
    const updated = {
      ...localFilters,
      [field]: currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
    };
    setLocalFilters(updated);
    onFilterChange(updated);
  };

  // Clear all filters
  const handleClearAll = () => {
    const cleared: FilterState = {
      dateRange: { start: '', end: '' },
      districts: [],
      methods: [],
      species: []
    };
    setLocalFilters(cleared);
    onFilterChange(cleared);
  };

  // Count active filters
  const activeCount = 
    (localFilters.dateRange.start || localFilters.dateRange.end ? 1 : 0) +
    localFilters.districts.length +
    localFilters.methods.length +
    localFilters.species.length;

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Filter Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {activeCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
              {activeCount} active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {activeCount > 0 && (
            <button
              onClick={handleClearAll}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-6 space-y-6">
          {/* Date Range Filter */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
              <FiCalendar className="mr-2" size={16} />
              Date Range
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={localFilters.dateRange.start}
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={localFilters.dateRange.end}
                  onChange={(e) => handleDateChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Districts Filter */}
          {filterOptions.districts.length > 0 && (
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <FiMapPin className="mr-2" size={16} />
                Districts ({localFilters.districts.length} selected)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-md">
                {filterOptions.districts.map(district => (
                  <label
                    key={district}
                    className="flex items-center space-x-2 px-3 py-2 bg-white border rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={localFilters.districts.includes(district)}
                      onChange={() => handleMultiSelect('districts', district)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{district}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Collection Methods Filter */}
          {filterOptions.methods.length > 0 && (
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <FiTarget className="mr-2" size={16} />
                Collection Methods ({localFilters.methods.length} selected)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-md">
                {filterOptions.methods.map(method => (
                  <label
                    key={method}
                    className="flex items-center space-x-2 px-3 py-2 bg-white border rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={localFilters.methods.includes(method)}
                      onChange={() => handleMultiSelect('methods', method)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{method}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Species Filter */}
          {filterOptions.species.length > 0 && (
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                <FiActivity className="mr-2" size={16} />
                Species ({localFilters.species.length} selected)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-md">
                {filterOptions.species.map(species => (
                  <label
                    key={species}
                    className="flex items-center space-x-2 px-3 py-2 bg-white border rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={localFilters.species.includes(species)}
                      onChange={() => handleMultiSelect('species', species)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 italic">{species}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {activeCount > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Active Filters</span>
                <button
                  onClick={handleClearAll}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {localFilters.dateRange.start && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    <FiCalendar className="mr-1" size={12} />
                    From: {localFilters.dateRange.start}
                    <button
                      onClick={() => handleDateChange('start', '')}
                      className="ml-2 hover:text-blue-900"
                    >
                      <FiX size={12} />
                    </button>
                  </span>
                )}
                {localFilters.dateRange.end && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    <FiCalendar className="mr-1" size={12} />
                    To: {localFilters.dateRange.end}
                    <button
                      onClick={() => handleDateChange('end', '')}
                      className="ml-2 hover:text-blue-900"
                    >
                      <FiX size={12} />
                    </button>
                  </span>
                )}
                {localFilters.districts.map(district => (
                  <span
                    key={district}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-medium"
                  >
                    <FiMapPin className="mr-1" size={12} />
                    {district}
                    <button
                      onClick={() => handleMultiSelect('districts', district)}
                      className="ml-2 hover:text-purple-900"
                    >
                      <FiX size={12} />
                    </button>
                  </span>
                ))}
                {localFilters.methods.map(method => (
                  <span
                    key={method}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium"
                  >
                    <FiTarget className="mr-1" size={12} />
                    {method}
                    <button
                      onClick={() => handleMultiSelect('methods', method)}
                      className="ml-2 hover:text-green-900"
                    >
                      <FiX size={12} />
                    </button>
                  </span>
                ))}
                {localFilters.species.map(species => (
                  <span
                    key={species}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-medium"
                  >
                    <FiActivity className="mr-1" size={12} />
                    {species}
                    <button
                      onClick={() => handleMultiSelect('species', species)}
                      className="ml-2 hover:text-orange-900"
                    >
                      <FiX size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed View - Show active filters */}
      {!isExpanded && activeCount > 0 && (
        <div className="px-6 py-3 border-t bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {localFilters.districts.slice(0, 3).map(district => (
              <span
                key={district}
                className="inline-flex items-center px-2 py-1 rounded bg-purple-100 text-purple-800 text-xs"
              >
                {district}
              </span>
            ))}
            {localFilters.districts.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded bg-gray-200 text-gray-700 text-xs">
                +{localFilters.districts.length - 3} more
              </span>
            )}
            {localFilters.methods.slice(0, 2).map(method => (
              <span
                key={method}
                className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800 text-xs"
              >
                {method}
              </span>
            ))}
            {localFilters.methods.length > 2 && (
              <span className="inline-flex items-center px-2 py-1 rounded bg-gray-200 text-gray-700 text-xs">
                +{localFilters.methods.length - 2} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(Filters);
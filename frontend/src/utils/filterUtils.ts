/**
 * Filter Utilities - COMPLETE VERSION
 * File: frontend/src/utils/filterUtils.ts
 * Exports all functions needed by Dashboard.tsx
 */

import { Metrics, Collector } from '@/types';

/**
 * Apply filters to metrics data
 * Note: Backend handles actual filtering, so this just returns metrics as-is
 */
export function applyFilters(
  metrics: Metrics | null,
  filters: {
    startDate?: string;
    endDate?: string;
    districts?: string[];
    methods?: string[];
    species?: string[];
  }
): Metrics | null {
  // Backend handles filtering via API parameters
  // This function exists for compatibility but doesn't modify data
  return metrics;
}

/**
 * Alias for applyFilters (for consistency)
 */
export function applyFiltersToMetrics(
  metrics: Metrics,
  filters: {
    startDate?: string;
    endDate?: string;
    districts?: string[];
    methods?: string[];
    species?: string[];
  }
): Metrics {
  return metrics;
}

/**
 * Apply filters to collectors data
 */
export function applyCollectorFilters(
  collectors: Collector[] | any,
  filters: {
    startDate?: string;
    endDate?: string;
    districts?: string[];
  }
): Collector[] {
  // ✅ FIX: Ensure collectors is an array
  if (!collectors) {
    return [];
  }

  // Handle if collectors is returned as object instead of array
  let collectorsArray: Collector[];
  if (Array.isArray(collectors)) {
    collectorsArray = collectors;
  } else if (typeof collectors === 'object') {
    // If it's an object, try to convert to array
    collectorsArray = Object.values(collectors);
  } else {
    return [];
  }

  // Check if there are any filters to apply
  const hasDistrictFilter = filters.districts && filters.districts.length > 0;
  const hasDateFilter = filters.startDate || filters.endDate;

  // If no filters, return all collectors
  if (!hasDistrictFilter && !hasDateFilter) {
    return collectorsArray;
  }

  // Apply filters
  let filtered = [...collectorsArray];

  // Filter by district
  if (hasDistrictFilter && filters.districts) {
    filtered = filtered.filter(c => 
      c.district && filters.districts!.includes(c.district)
    );
  }

  return filtered;
}

/**
 * Alias for applyCollectorFilters
 */
export function applyFiltersToCollectors(
  collectors: Collector[] | any,
  filters: {
    startDate?: string;
    endDate?: string;
    districts?: string[];
  }
): Collector[] {
  return applyCollectorFilters(collectors, filters);
}

/**
 * Apply filters to completeness data
 */
export function applyCompletenessFilters(
  completenessData: any,
  filters: {
    districts?: string[];
  }
): any {
  // Backend handles filtering
  return completenessData;
}

/**
 * Get count of active filters
 */
export function getActiveFilterCount(filters: {
  startDate?: string;
  endDate?: string;
  districts?: string[];
  methods?: string[];
  species?: string[];
}): number {
  let count = 0;
  
  if (filters.startDate || filters.endDate) count++;
  if (filters.districts && filters.districts.length > 0) count++;
  if (filters.methods && filters.methods.length > 0) count++;
  if (filters.species && filters.species.length > 0) count++;
  
  return count;
}

/**
 * Filter out Unknown species from species data
 */
export function filterSpeciesData(speciesData: Record<string, number>): Record<string, number> {
  const filtered: Record<string, number> = {};
  
  Object.entries(speciesData).forEach(([species, count]) => {
    // ✅ FIX: Filter out Unknown, N/A, and empty species
    if (
      species && 
      species.toLowerCase() !== 'unknown' && 
      species !== 'N/A' &&
      species.trim() !== ''
    ) {
      filtered[species] = count;
    }
  });

  return filtered;
}

/**
 * Get available filter options from metrics
 */
export function getFilterOptions(metrics: Metrics) {
  const districts = new Set<string>();
  const methods = new Set<string>();
  const species = new Set<string>();

  // Extract districts from geographic data
  if (metrics.geographic?.collectionsByDistrict) {
    Object.keys(metrics.geographic.collectionsByDistrict).forEach(d => districts.add(d));
  }

  // Extract methods from collection methods data
  if (metrics.collectionMethods?.collectionsByMethod) {
    Object.keys(metrics.collectionMethods.collectionsByMethod).forEach(m => methods.add(m));
  }

  // Extract species from species data (excluding Unknown)
  if (metrics.species?.speciesCounts) {
    Object.keys(metrics.species.speciesCounts).forEach(s => {
      if (s && s.toLowerCase() !== 'unknown' && s !== 'N/A') {
        species.add(s);
      }
    });
  }

  return {
    districts: Array.from(districts).sort(),
    methods: Array.from(methods).sort(),
    species: Array.from(species).sort()
  };
}

/**
 * Build query string for API calls
 */
export function buildQueryString(filters: {
  startDate?: string;
  endDate?: string;
  districts?: string[];
  methods?: string[];
  species?: string[];
}): string {
  const params = new URLSearchParams();

  if (filters.startDate) {
    params.set('start_date', filters.startDate);
  }
  if (filters.endDate) {
    params.set('end_date', filters.endDate);
  }
  if (filters.districts && filters.districts.length > 0) {
    params.set('districts', filters.districts.join(','));
  }
  if (filters.methods && filters.methods.length > 0) {
    params.set('methods', filters.methods.join(','));
  }
  if (filters.species && filters.species.length > 0) {
    params.set('species', filters.species.join(','));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: {
  startDate?: string;
  endDate?: string;
  districts?: string[];
  methods?: string[];
  species?: string[];
}): boolean {
  return getActiveFilterCount(filters) > 0;
}

/**
 * Clear all filters
 */
export function clearFilters() {
  return {
    startDate: undefined,
    endDate: undefined,
    districts: [],
    methods: [],
    species: []
  };
}

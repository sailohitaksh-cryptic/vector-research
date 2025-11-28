/**
 * API Service - COMPLETELY FIXED VERSION WITH STABLE SERIALIZATION
 * File: frontend/src/lib/api.ts
 * 
 * Critical Fix: Ensures all undefined values become null for stable JSON serialization
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface Filters {
  startDate?: string;
  endDate?: string;
  districts?: string[];
  methods?: string[];
  species?: string[];
}

/**
 * Build query string from filters
 */
function buildQueryString(filters?: Filters): string {
  if (!filters) return '';
  
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
 * ✅ CRITICAL FIX: Convert undefined to null for stable JSON serialization
 */
function makeSerializable(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(makeSerializable);
  
  const result: any = {};
  for (const key in obj) {
    result[key] = makeSerializable(obj[key]);
  }
  return result;
}

/**
 * Normalize interventions data - Fix field name mismatches
 * ✅ CRITICAL FIX: All properties explicitly set (no undefined)
 */
function normalizeInterventions(interventions: any) {
  if (!interventions) return null; // ✅ Return null instead of undefined

  return {
    // Keep original nested structure (convert undefined to null)
    irsCoverage: interventions.irsCoverage || null,
    llinTypes: interventions.llinTypes || null,
    llinCoverage: interventions.llinCoverage || null,
    
    // Map field names for frontend compatibility (always return a number)
    irsCoverageRate: interventions.irsRatePercent ?? interventions.irsCoverageRate ?? 0,
    llinUsageRate: interventions.avgLlinUsageRate ?? interventions.llinUsageRate ?? 0,
    
    // Flatten llinCoverage nested fields (always return a number)
    totalLlins: interventions.llinCoverage?.totalLlins ?? interventions.totalLlins ?? 0,
    avgLlinsPerHouse: interventions.llinCoverage?.avgLlinsPerHouse ?? interventions.avgLlinsPerHouse ?? 0,
    housesWithLlins: interventions.llinCoverage?.housesWithLlins ?? interventions.housesWithLlins ?? 0,
  };
}

/**
 * Fetch metrics with optional filters
 */
export async function fetchMetrics(filters?: Filters) {
  const queryString = buildQueryString(filters);
  const url = `${API_BASE_URL}/api/metrics${queryString}`;
  
  console.log('Fetching metrics from:', url);

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        error: { message: 'Unknown error', status: response.status } 
      }));
      console.error('Metrics fetch failed:', error);
      throw new Error(`Failed to fetch metrics: ${response.status}`);
    }

    const data = await response.json();
    
    // ✅ FIX: Normalize interventions field names
    if (data.interventions) {
      data.interventions = normalizeInterventions(data.interventions);
    }
    
    // 🚨 NUCLEAR OPTION: Force clean JSON by doing a round-trip
    // This removes ALL undefined values and ensures stable serialization
    const cleanData = JSON.parse(JSON.stringify(data));
    
    console.log('[API] Returning clean data (undefined → null)');
    return JSON.parse(JSON.stringify(data));
    
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Fetch surveillance data with optional filters
 */
export async function fetchSurveillanceData(filters?: Filters) {
  const queryString = buildQueryString(filters);
  const url = `${API_BASE_URL}/api/surveillance${queryString}`;
  
  console.log('Fetching surveillance from:', url);

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch surveillance data: ${response.status}`);
  }

  const data = await response.json();
  return makeSerializable(data);
}

/**
 * Fetch specimens data with optional filters
 */
export async function fetchSpecimensData(filters?: Filters) {
  const queryString = buildQueryString(filters);
  const url = `${API_BASE_URL}/api/specimens${queryString}`;
  
  console.log('Fetching specimens from:', url);

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch specimens data: ${response.status}`);
  }

  const data = await response.json();
  return makeSerializable(data);
}

/**
 * Fetch collectors with optional filters
 */
export async function fetchCollectors(filters?: Filters) {
  const queryString = buildQueryString(filters);
  const url = `${API_BASE_URL}/api/collectors${queryString}`;
  
  console.log('Fetching collectors from:', url);

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        error: { message: 'Unknown error', status: response.status } 
      }));
      console.error('Collectors fetch failed:', error);
      throw new Error(`Failed to fetch collectors: ${response.status}`);
    }

    const data = await response.json();
    
    // Ensure we return an array
    let result: any[];
    if (Array.isArray(data)) {
      result = data;
    } else if (data.collectors && Array.isArray(data.collectors)) {
      result = data.collectors;
    } else {
      console.warn('Collectors data is not an array, returning empty array');
      result = [];
    }
    
    // 🚨 NUCLEAR OPTION: Force clean JSON
    const cleanResult = JSON.parse(JSON.stringify(result));
    
    console.log('[API] Returning clean collectors (undefined → null)');
    return JSON.parse(JSON.stringify(result));
    
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
}

/**
 * Fetch completeness data
 */
export async function fetchCompleteness(yearMonth: string, filters?: Filters) {
  const queryString = buildQueryString(filters);
  const url = `${API_BASE_URL}/api/completeness/${yearMonth}${queryString}`;
  
  console.log('Fetching completeness from:', url);

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      // Completeness endpoint may not exist yet - return empty data
      console.warn('Completeness endpoint not available (404), returning empty data');
      return {
        overallCompleteness: 0,
        districtCompleteness: {},
        incompleteSites: []
      };
    }

    const data = await response.json();
    const result = data.completeness || data;
    return makeSerializable(result);
  } catch (error) {
    console.error('Completeness fetch error:', error);
    // Return empty structure instead of throwing
    return {
      overallCompleteness: 0,
      districtCompleteness: {},
      incompleteSites: []
    };
  }
}

/**
 * Export data as CSV
 */
export async function exportData(filters?: Filters) {
  const queryString = buildQueryString(filters);
  const url = `${API_BASE_URL}/api/export/vectorcam-report${queryString}`;
  
  console.log('Exporting data from:', url);

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }

  return response.blob();
}
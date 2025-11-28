import { NextRequest, NextResponse } from 'next/server';

const VECTORCAM_API_KEY = process.env.VECTORCAM_API_KEY || '';
const SURVEILLANCE_ENDPOINT = 'http://api.vectorcam.org/sessions/export/surveillance-forms/csv';
const SPECIMENS_ENDPOINT = 'http://api.vectorcam.org/specimens/export/csv';

interface FilterParams {
  startDate?: string;
  endDate?: string;
  districts?: string[];
  methods?: string[];
  species?: string[];
}

// Helper to parse CSV
function parseCSV(text: string): any[] {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj: any = {};
    headers.forEach((header, i) => {
      obj[header] = values[i]?.trim() || '';
    });
    return obj;
  });
}

// Fetch data from VectorCam API
async function fetchVectorCamData() {
  try {
    const headers = {
      'Authorization': `Bearer ${VECTORCAM_API_KEY}`,
      'Accept': 'text/csv'
    };

    console.log('Fetching data from VectorCam API...');

    const [survResponse, specResponse] = await Promise.all([
      fetch(SURVEILLANCE_ENDPOINT, { headers, cache: 'no-store' }),
      fetch(SPECIMENS_ENDPOINT, { headers, cache: 'no-store' })
    ]);

    if (!survResponse.ok || !specResponse.ok) {
      throw new Error(`Failed to fetch data: ${survResponse.status}, ${specResponse.status}`);
    }

    const survText = await survResponse.text();
    const specText = await specResponse.text();

    const surveillance = parseCSV(survText);
    const specimens = parseCSV(specText);

    console.log(`Fetched ${surveillance.length} surveillance records, ${specimens.length} specimens`);

    return { surveillance, specimens };
  } catch (error) {
    console.error('Error fetching VectorCam data:', error);
    throw error;
  }
}

// Apply filters to data
function applyFilters(surveillance: any[], specimens: any[], filters: FilterParams) {
  let filteredSurv = [...surveillance];
  let filteredSpec = [...specimens];

  // Date filter (day-level)
  if (filters.startDate || filters.endDate) {
    filteredSurv = filteredSurv.filter(row => {
      if (!row.SessionCollectionDate) return false;
      const date = new Date(row.SessionCollectionDate);
      const afterStart = !filters.startDate || date >= new Date(filters.startDate);
      const beforeEnd = !filters.endDate || date <= new Date(filters.endDate);
      return afterStart && beforeEnd;
    });
  }

  // District filter
  if (filters.districts && filters.districts.length > 0) {
    filteredSurv = filteredSurv.filter(row => 
      filters.districts!.includes(row.SiteDistrict)
    );
  }

  // Method filter
  if (filters.methods && filters.methods.length > 0) {
    filteredSurv = filteredSurv.filter(row =>
      filters.methods!.includes(row.SessionCollectionMethod)
    );
  }

  // Filter specimens based on filtered surveillance SessionIDs
  const sessionIds = new Set(filteredSurv.map(row => row.SessionID));
  filteredSpec = filteredSpec.filter(row => sessionIds.has(row.SessionID));

  // Species filter
  if (filters.species && filters.species.length > 0) {
    filteredSpec = filteredSpec.filter(row =>
      filters.species!.includes(row.Species)
    );
  }

  return { filteredSurv, filteredSpec };
}

// Calculate metrics
function calculateMetrics(surveillance: any[], specimens: any[]) {
  // Summary
  const totalCollections = surveillance.length;
  const totalSpecimens = specimens.length;
  
  // Temporal - Group by month
  const collectionsByMonth: { [key: string]: number } = {};
  const specimensByMonth: { [key: string]: number } = {};
  
  surveillance.forEach(row => {
    if (row.SessionCollectionDate) {
      const date = new Date(row.SessionCollectionDate);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      collectionsByMonth[month] = (collectionsByMonth[month] || 0) + 1;
    }
  });

  specimens.forEach(row => {
    const survRow = surveillance.find(s => s.SessionID === row.SessionID);
    if (survRow && survRow.SessionCollectionDate) {
      const date = new Date(survRow.SessionCollectionDate);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      specimensByMonth[month] = (specimensByMonth[month] || 0) + 1;
    }
  });

  // Species counts
  const speciesCounts: { [key: string]: number } = {};
  specimens.forEach(row => {
    if (row.Species) {
      speciesCounts[row.Species] = (speciesCounts[row.Species] || 0) + 1;
    }
  });

  // Anopheles
  const anophelesCounts: { [key: string]: number } = {};
  let totalAnopheles = 0;
  Object.keys(speciesCounts).forEach(species => {
    if (species.toLowerCase().includes('anopheles')) {
      anophelesCounts[species] = speciesCounts[species];
      totalAnopheles += speciesCounts[species];
    }
  });

  const anophelesPercentage = totalSpecimens > 0 ? (totalAnopheles / totalSpecimens) * 100 : 0;

  // Geographic
  const collectionsByDistrict: { [key: string]: number } = {};
  const specimensByDistrict: { [key: string]: number } = {};
  const districts: string[] = [];

  surveillance.forEach(row => {
    const district = row.SiteDistrict || 'Unknown';
    if (!districts.includes(district)) districts.push(district);
    collectionsByDistrict[district] = (collectionsByDistrict[district] || 0) + 1;
  });

  specimens.forEach(row => {
    const survRow = surveillance.find(s => s.SessionID === row.SessionID);
    if (survRow) {
      const district = survRow.SiteDistrict || 'Unknown';
      specimensByDistrict[district] = (specimensByDistrict[district] || 0) + 1;
    }
  });

  // Collection Methods
  const collectionsByMethod: { [key: string]: number } = {};
  const specimensByMethod: { [key: string]: number } = {};
  
  surveillance.forEach(row => {
    const method = row.SessionCollectionMethod || 'Unknown';
    collectionsByMethod[method] = (collectionsByMethod[method] || 0) + 1;
  });

  specimens.forEach(row => {
    const survRow = surveillance.find(s => s.SessionID === row.SessionID);
    if (survRow) {
      const method = survRow.SessionCollectionMethod || 'Unknown';
      specimensByMethod[method] = (specimensByMethod[method] || 0) + 1;
    }
  });

  const specimensPerCollection: { [key: string]: number } = {};
  Object.keys(collectionsByMethod).forEach(method => {
    specimensPerCollection[method] = collectionsByMethod[method] > 0 
      ? specimensByMethod[method] / collectionsByMethod[method] 
      : 0;
  });

  // Indoor Density (PSC only)
  const pscCollections = surveillance.filter(row => 
    row.SessionCollectionMethod?.toLowerCase().includes('psc') ||
    row.SessionCollectionMethod?.toLowerCase().includes('pyrethrum')
  );
  
  const totalPscCollections = pscCollections.length;
  const pscSpecimens = specimens.filter(row => {
    const survRow = surveillance.find(s => s.SessionID === row.SessionID);
    return survRow && (
      survRow.SessionCollectionMethod?.toLowerCase().includes('psc') ||
      survRow.SessionCollectionMethod?.toLowerCase().includes('pyrethrum')
    );
  });

  const avgMosquitoesPerHouse = totalPscCollections > 0 ? pscSpecimens.length / totalPscCollections : 0;
  const pscAnopheles = pscSpecimens.filter(row => row.Species?.toLowerCase().includes('anopheles'));
  const avgAnophelesPerHouse = totalPscCollections > 0 ? pscAnopheles.length / totalPscCollections : 0;

  // Interventions
  const housesWithIrs = surveillance.filter(row => 
    row.WasIrsConducted === 'Yes' || row.WasIrsConducted === '1' || row.WasIrsConducted === 'true'
  ).length;
  const irsRatePercent = totalCollections > 0 ? (housesWithIrs / totalCollections) * 100 : 0;

  const totalPeopleSlept = surveillance.reduce((sum, row) => sum + (parseInt(row.NumPeopleSleptInHouse) || 0), 0);
  const totalPeopleUnderLlin = surveillance.reduce((sum, row) => sum + (parseInt(row.NumPeopleSleptUnderLlin) || 0), 0);
  const avgLlinUsageRate = totalPeopleSlept > 0 ? (totalPeopleUnderLlin / totalPeopleSlept) * 100 : 0;

  const totalLlins = surveillance.reduce((sum, row) => sum + (parseInt(row.NumLlinsAvailable) || 0), 0);
  const housesWithLlins = surveillance.filter(row => parseInt(row.NumLlinsAvailable) > 0).length;
  const avgLlinsPerHouse = totalCollections > 0 ? totalLlins / totalCollections : 0;

  // LLIN Types
  const llinTypes: { [key: string]: number } = {};
  surveillance.forEach(row => {
    const type = row.LlinType || 'Unknown';
    if (type !== 'Unknown' && type !== '' && type !== 'null') {
      llinTypes[type] = (llinTypes[type] || 0) + 1;
    }
  });

  return {
    summary: {
      totalCollections,
      totalSpecimens,
      totalDistricts: districts.length,
      totalCollectors: new Set(surveillance.map(r => r.SessionCollectorName)).size
    },
    temporal: {
      collectionsByMonth,
      specimensByMonth,
      totalMonths: Object.keys(collectionsByMonth).length
    },
    species: {
      speciesCounts,
      anophelesCounts,
      totalAnopheles,
      anophelesPercentage
    },
    geographic: {
      collectionsByDistrict,
      specimensByDistrict,
      districts
    },
    collectionMethods: {
      collectionsByMethod,
      specimensByMethod,
      specimensPerCollection
    },
    indoorDensity: {
      totalPscCollections,
      avgMosquitoesPerHouse,
      avgAnophelesPerHouse
    },
    interventions: {
      irsRatePercent,
      avgLlinUsageRate,
      llinCoverage: {
        totalLlins,
        avgLlinsPerHouse,
        housesWithLlins
      },
      llinTypes
    }
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log('API /metrics called');
    
    // Get filter params from URL
    const searchParams = request.nextUrl.searchParams;
    const filters: FilterParams = {
      startDate: searchParams.get('start_date') || undefined,
      endDate: searchParams.get('end_date') || undefined,
      districts: searchParams.get('districts')?.split(',').filter(Boolean),
      methods: searchParams.get('methods')?.split(',').filter(Boolean),
      species: searchParams.get('species')?.split(',').filter(Boolean)
    };

    console.log('Filters:', filters);

    // Fetch data from VectorCam API
    const { surveillance, specimens } = await fetchVectorCamData();

    // Apply filters
    const { filteredSurv, filteredSpec } = applyFilters(surveillance, specimens, filters);

    console.log(`After filtering: ${filteredSurv.length} surveillance, ${filteredSpec.length} specimens`);

    // Calculate metrics
    const metrics = calculateMetrics(filteredSurv, filteredSpec);

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
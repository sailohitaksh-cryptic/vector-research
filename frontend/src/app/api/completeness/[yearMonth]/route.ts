import { NextRequest, NextResponse } from 'next/server';

const VECTORCAM_API_KEY = process.env.VECTORCAM_API_KEY || '';
const SURVEILLANCE_ENDPOINT = 'http://api.vectorcam.org/sessions/export/surveillance-forms/csv';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { yearMonth: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const districts = searchParams.get('districts')?.split(',').filter(Boolean);

    console.log(`Fetching completeness data for ${params.yearMonth}...`);

    // Fetch surveillance data
    const response = await fetch(SURVEILLANCE_ENDPOINT, {
      headers: {
        'Authorization': `Bearer ${VECTORCAM_API_KEY}`,
        'Accept': 'text/csv'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }

    const text = await response.text();
    let data = parseCSV(text);

    console.log(`Fetched ${data.length} surveillance records`);

    // Calculate completeness by district
    const districtMap = new Map();

    data.forEach(row => {
      const district = row.SiteDistrict || 'Unknown';
      
      if (!districtMap.has(district)) {
        districtMap.set(district, {
          district,
          totalHouses: 0,
          housesWithData: 0
        });
      }

      const districtData = districtMap.get(district);
      districtData.totalHouses++;
      if (row.SessionCollectionDate) {
        districtData.housesWithData++;
      }
    });

    // Calculate rates
    let districtList = Array.from(districtMap.values()).map(d => ({
      district: d.district,
      totalHouses: d.totalHouses,
      housesWithData: d.housesWithData,
      submissionRate: d.totalHouses > 0 ? (d.housesWithData / d.totalHouses) * 100 : 0,
      completenessRate: d.totalHouses > 0 ? (d.housesWithData / d.totalHouses) * 100 : 0
    }));

    // Filter by districts if provided
    if (districts && districts.length > 0) {
      districtList = districtList.filter(d => districts.includes(d.district));
    }

    console.log(`Processed completeness for ${districtList.length} districts`);

    return NextResponse.json({
      year_month: params.yearMonth,
      districts: districtList
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const districts = searchParams.get('districts')?.split(',').filter(Boolean);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    console.log('Fetching collectors data...');

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

    // Apply filters
    if (districts && districts.length > 0) {
      data = data.filter(row => districts.includes(row.SiteDistrict));
    }

    if (startDate || endDate) {
      data = data.filter(row => {
        if (!row.SessionCollectionDate) return false;
        const date = new Date(row.SessionCollectionDate);
        const afterStart = !startDate || date >= new Date(startDate);
        const beforeEnd = !endDate || date <= new Date(endDate);
        return afterStart && beforeEnd;
      });
    }

    // Calculate collector stats
    const collectorMap = new Map();

    data.forEach(row => {
      const name = row.SessionCollectorName || 'Unknown';
      const district = row.SiteDistrict || 'Unknown';
      const site = row.SiteName || row.SiteParish || 'Unknown';
      const date = row.SessionCollectionDate;

      if (!collectorMap.has(name)) {
        collectorMap.set(name, {
          name,
          district,
          site,
          totalCollections: 0,
          totalSpecimens: 0,
          lastSubmission: date,
          status: 'Active',
          totalSubmissionDays: 0
        });
      }

      const collector = collectorMap.get(name);
      collector.totalCollections++;
      
      if (date && new Date(date) > new Date(collector.lastSubmission || '1900-01-01')) {
        collector.lastSubmission = date;
      }
    });

    // Calculate status based on last submission
    const today = new Date();
    collectorMap.forEach(collector => {
      if (!collector.lastSubmission) {
        collector.status = 'Inactive';
        return;
      }

      const daysSince = Math.floor(
        (today.getTime() - new Date(collector.lastSubmission).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSince < 7) {
        collector.status = 'Active';
      } else if (daysSince < 30) {
        collector.status = 'Inactive';
      } else {
        collector.status = 'Dormant';
      }
    });

    const collectors = Array.from(collectorMap.values());

    console.log(`Processed ${collectors.length} unique collectors`);

    return NextResponse.json(collectors);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
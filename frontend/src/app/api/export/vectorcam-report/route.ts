import { NextResponse } from 'next/server';

const VECTORCAM_API_KEY = process.env.VECTORCAM_API_KEY || '';
const SURVEILLANCE_ENDPOINT = 'http://api.vectorcam.org/sessions/export/surveillance-forms/csv';

export async function GET() {
  try {
    console.log('Exporting VectorCam report...');

    const headers = {
      'Authorization': `Bearer ${VECTORCAM_API_KEY}`,
      'Accept': 'text/csv'
    };

    // Fetch surveillance data
    const response = await fetch(SURVEILLANCE_ENDPOINT, { 
      headers, 
      cache: 'no-store' 
    });

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    // Get surveillance CSV
    const csvData = await response.text();

    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `vectorcam_report_${timestamp}.csv`;

    console.log(`Exporting ${filename}...`);

    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error: any) {
    console.error('Export Error:', error);
    return NextResponse.json(
      { error: error.message || 'Export failed' },
      { status: 500 }
    );
  }
}
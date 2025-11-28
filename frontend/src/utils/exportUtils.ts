/**
 * Export utilities for downloading data and reports
 */

export const downloadCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    alert('No data to download');
    return;
  }

  // Convert to CSV
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadJSON = (data: any, filename: string) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadChartImage = (chartId: string, filename: string) => {
  // Find the Plotly chart
  const chartElement = document.querySelector(`[id="${chartId}"]`);
  
  if (!chartElement) {
    alert('Chart not found');
    return;
  }

  // Use Plotly's downloadImage function if available
  try {
    // @ts-ignore - Plotly is loaded globally
    if (window.Plotly) {
      // @ts-ignore
      window.Plotly.downloadImage(chartElement, {
        format: 'png',
        width: 1200,
        height: 800,
        filename: `${filename}_${new Date().toISOString().split('T')[0]}`
      });
    }
  } catch (error) {
    console.error('Failed to download chart image:', error);
    alert('Failed to download chart. Try right-click > Save Image As');
  }
};

export const generateReportData = (metrics: any) => {
  const report = {
    generated_at: new Date().toISOString(),
    summary: metrics.summary,
    temporal_trends: metrics.temporal,
    species_composition: metrics.species,
    interventions: metrics.interventions,
    indoor_density: metrics.indoorDensity,
    geographic: metrics.geographic,
    collection_methods: metrics.collectionMethods
  };
  
  return report;
};
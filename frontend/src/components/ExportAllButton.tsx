/**
 * ExportAllButton Component - FIXED VERSION
 * File: frontend/src/components/ExportAllButton.tsx
 * 
 * Changes:
 * - Handles undefined filters properly
 * - Uses new API service
 * - Better error handling
 */

import React, { useState } from 'react';

interface ExportAllButtonProps {
  filters?: {
    startDate?: string;
    endDate?: string;
    districts?: string[];
    methods?: string[];
    species?: string[];
  };
}

export default function ExportAllButton({ filters = {} }: ExportAllButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Build query string with filters (handle undefined)
      const params = new URLSearchParams();
      
      if (filters?.startDate) {
        params.set('start_date', filters.startDate);
      }
      if (filters?.endDate) {
        params.set('end_date', filters.endDate);
      }
      if (filters?.districts && filters.districts.length > 0) {
        params.set('districts', filters.districts.join(','));
      }
      if (filters?.methods && filters.methods.length > 0) {
        params.set('methods', filters.methods.join(','));
      }
      if (filters?.species && filters.species.length > 0) {
        params.set('species', filters.species.join(','));
      }

      const queryString = params.toString();
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
const url = `${API_BASE_URL}/api/export/vectorcam-report...` + (queryString ? `?${queryString}` : '');

      console.log('Exporting from:', url);
      console.log('Active filters:', filters);

      // Fetch the CSV
      const response = await fetch(url, {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Accept': 'text/csv'
  },
  mode: 'cors'
});
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export failed:', errorText);
        throw new Error(`Export failed: ${response.status} - ${errorText}`);
      }

      // Get the blob
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `vectorcam_report_${new Date().toISOString().split('T')[0]}.csv`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      console.log('Export successful:', filename);
      alert(`Export successful! Downloaded: ${filename}`);

    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}. Check the console for details.`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`
        inline-flex items-center gap-2 px-4 py-2 
        bg-green-600 hover:bg-green-700 
        text-white font-medium rounded-lg
        transition-colors duration-200
        disabled:bg-gray-400 disabled:cursor-not-allowed
      `}
    >
      {/* SVG Download Icon */}
      <svg 
        className="w-5 h-5" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
        />
      </svg>
      {isExporting ? 'Exporting...' : 'Export Data'}
    </button>
  );
}

'use client';

import { useState } from 'react';
import { FiDownload, FiFileText } from 'react-icons/fi';
import { downloadCSV, downloadJSON } from '@/utils/exportUtils';

interface DownloadButtonProps {
  data: any;
  filename: string;
  label?: string;
}

export default function DownloadButton({ data, filename, label = 'Download' }: DownloadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownloadCSV = () => {
    if (Array.isArray(data)) {
      downloadCSV(data, filename);
    } else if (data && typeof data === 'object') {
      // Convert object to array
      const arrayData = Object.entries(data).map(([key, value]) => ({ key, value }));
      downloadCSV(arrayData, filename);
    }
    setIsOpen(false);
  };

  const handleDownloadJSON = () => {
    downloadJSON(data, filename);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors space-x-2"
      >
        <FiDownload size={16} />
        <span>{label}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              <button
                onClick={handleDownloadCSV}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <FiFileText size={16} />
                <span>Download CSV</span>
              </button>
              <button
                onClick={handleDownloadJSON}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <FiFileText size={16} />
                <span>Download JSON</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
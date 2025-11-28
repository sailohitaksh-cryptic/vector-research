import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VectorResearch Dashboard',
  description: 'Mosquito surveillance data visualization for public health',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    🦟 VectorResearch Dashboard
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Mosquito Surveillance Data Analysis - Uganda
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    Last Updated: {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="bg-white border-t border-gray-200 mt-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <p className="text-center text-sm text-gray-500">
                VectorResearch Dashboard © 2024 - Powered by VectorCam
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

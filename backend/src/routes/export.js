/**
 * Export Routes
 * Handles CSV export endpoints for downloading reports
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Path to exports directory
const EXPORTS_DIR = path.join(__dirname, '..', '..', 'data', 'exports');

/**
 * Helper function to find latest file matching pattern
 */
function findLatestFile(pattern) {
  try {
    const files = fs.readdirSync(EXPORTS_DIR)
      .filter(file => file.match(pattern))
      .map(file => ({
        name: file,
        path: path.join(EXPORTS_DIR, file),
        time: fs.statSync(path.join(EXPORTS_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    return files.length > 0 ? files[0].path : null;
  } catch (error) {
    console.error('Error finding file:', error);
    return null;
  }
}

/**
 * GET /api/export/vectorcam-report
 * Download VectorCam report format CSV
 */
router.get('/vectorcam-report', (req, res) => {
  try {
    // Find latest vectorcam report
    const reportFile = findLatestFile(/^vectorcam_report_\d{4}-\d{2}-\d{2}\.csv$/);
    
    if (!reportFile) {
      return res.status(404).json({
        error: {
          message: 'VectorCam report not found. Please run the pipeline first.',
          status: 404
        }
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(reportFile)) {
      return res.status(404).json({
        error: {
          message: 'Report file not found',
          status: 404
        }
      });
    }
    
    // Get filename for download
    const filename = path.basename(reportFile);
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream file to response
    const fileStream = fs.createReadStream(reportFile);
    fileStream.pipe(res);
    
    console.log(`Exported VectorCam report: ${filename}`);
    
  } catch (error) {
    console.error('Error exporting VectorCam report:', error);
    res.status(500).json({
      error: {
        message: 'Failed to export report',
        status: 500,
        details: error.message
      }
    });
  }
});

/**
 * GET /api/export/surveillance
 * Download cleaned surveillance data CSV
 */
router.get('/surveillance', (req, res) => {
  try {
    const survFile = findLatestFile(/^cleaned_surveillance_\d{4}-\d{2}-\d{2}\.csv$/);
    
    if (!survFile || !fs.existsSync(survFile)) {
      return res.status(404).json({
        error: {
          message: 'Surveillance data not found',
          status: 404
        }
      });
    }
    
    const filename = path.basename(survFile);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(survFile);
    fileStream.pipe(res);
    
    console.log(`Exported surveillance data: ${filename}`);
    
  } catch (error) {
    console.error('Error exporting surveillance data:', error);
    res.status(500).json({
      error: {
        message: 'Failed to export surveillance data',
        status: 500,
        details: error.message
      }
    });
  }
});

/**
 * GET /api/export/specimens
 * Download cleaned specimens data CSV
 */
router.get('/specimens', (req, res) => {
  try {
    const specFile = findLatestFile(/^cleaned_specimens_\d{4}-\d{2}-\d{2}\.csv$/);
    
    if (!specFile || !fs.existsSync(specFile)) {
      return res.status(404).json({
        error: {
          message: 'Specimens data not found',
          status: 404
        }
      });
    }
    
    const filename = path.basename(specFile);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(specFile);
    fileStream.pipe(res);
    
    console.log(`Exported specimens data: ${filename}`);
    
  } catch (error) {
    console.error('Error exporting specimens data:', error);
    res.status(500).json({
      error: {
        message: 'Failed to export specimens data',
        status: 500,
        details: error.message
      }
    });
  }
});

/**
 * GET /api/export/all
 * Get list of all available exports
 */
router.get('/all', (req, res) => {
  try {
    if (!fs.existsSync(EXPORTS_DIR)) {
      return res.json({ exports: [] });
    }
    
    const files = fs.readdirSync(EXPORTS_DIR)
      .filter(file => file.endsWith('.csv'))
      .map(file => {
        const filePath = path.join(EXPORTS_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          modified: stats.mtime,
          type: file.includes('vectorcam_report') ? 'report' :
                file.includes('surveillance') ? 'surveillance' :
                file.includes('specimens') ? 'specimens' : 'other'
        };
      })
      .sort((a, b) => b.modified - a.modified);
    
    res.json({ exports: files });
    
  } catch (error) {
    console.error('Error listing exports:', error);
    res.status(500).json({
      error: {
        message: 'Failed to list exports',
        status: 500,
        details: error.message
      }
    });
  }
});

module.exports = router;
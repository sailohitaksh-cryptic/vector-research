/**
 * Data Operations API Routes
 */

const express = require('express');
const router = express.Router();
const { fetchAndProcessData } = require('../scripts/fetchData');
const database = require('../services/database');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * POST /api/data/fetch
 * Trigger manual data fetch and processing
 */
router.post('/fetch', async (req, res) => {
  try {
    logger.info('📥 Manual data fetch triggered via API');

    // Run the pipeline asynchronously
    fetchAndProcessData()
      .then(result => {
        logger.info('✅ Manual fetch completed:', result);
      })
      .catch(error => {
        logger.error('❌ Manual fetch failed:', error);
      });

    // Return immediately
    res.json({
      success: true,
      message: 'Data fetch started. Check logs for progress.'
    });
  } catch (error) {
    logger.error('Error triggering data fetch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/data/status
 * Get current data status
 */
router.get('/status', (req, res) => {
  try {
    const surveillance = database.getSurveillanceData();
    const specimens = database.getSpecimensData();

    const status = {
      lastUpdated: surveillance.length > 0 ? surveillance[0].ImportedAt : null,
      recordCounts: {
        surveillance: surveillance.length,
        specimens: specimens.length
      },
      dateRange: {
        start: surveillance.length > 0 ? surveillance[surveillance.length - 1].SessionCollectionDate : null,
        end: surveillance.length > 0 ? surveillance[0].SessionCollectionDate : null
      }
    };

    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Error fetching data status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/data/export/report
 * Download VectorCam report CSV
 */
router.get('/export/report', (req, res) => {
  try {
    const exportDir = path.join(__dirname, '../../data/exports');
    const files = fs.readdirSync(exportDir)
      .filter(f => f.startsWith('vectorcam_report_'))
      .sort()
      .reverse();

    if (files.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No report files found'
      });
    }

    const latestReport = path.join(exportDir, files[0]);
    const reportData = fs.readFileSync(latestReport, 'utf8');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${files[0]}"`);
    res.send(reportData);
  } catch (error) {
    logger.error('Error exporting report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/data/export/surveillance
 * Download cleaned surveillance CSV
 */
router.get('/export/surveillance', (req, res) => {
  try {
    const data = database.getSurveillanceData();
    const csv = Papa.unparse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="surveillance_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error('Error exporting surveillance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/data/export/specimens
 * Download cleaned specimens CSV
 */
router.get('/export/specimens', (req, res) => {
  try {
    const data = database.getSpecimensData();
    const csv = Papa.unparse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="specimens_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error('Error exporting specimens:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

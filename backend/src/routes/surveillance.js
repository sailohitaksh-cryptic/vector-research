/**
 * Surveillance API Routes
 */

const express = require('express');
const router = express.Router();
const database = require('../services/database');
const logger = require('../utils/logger');

/**
 * GET /api/surveillance
 * Get surveillance data with optional filters
 */
router.get('/', (req, res) => {
  try {
    const { startDate, endDate, district, method } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (district) filters.district = district;

    let data = database.getSurveillanceData(filters);

    // Apply method filter if provided
    if (method) {
      data = data.filter(item => item.SessionCollectionMethod === method);
    }

    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    logger.error('Error fetching surveillance data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/surveillance/summary
 * Get summary statistics
 */
router.get('/summary', (req, res) => {
  try {
    const data = database.getSurveillanceData();

    const summary = {
      totalCollections: data.length,
      uniqueDistricts: [...new Set(data.map(d => d.SiteDistrict))].length,
      uniqueCollectors: [...new Set(data.map(d => d.SessionCollectorName))].length,
      dateRange: {
        start: data.length > 0 ? data[data.length - 1].SessionCollectionDate : null,
        end: data.length > 0 ? data[0].SessionCollectionDate : null
      }
    };

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    logger.error('Error fetching surveillance summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

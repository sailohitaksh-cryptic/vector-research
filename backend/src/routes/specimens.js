/**
 * Specimens API Routes
 */

const express = require('express');
const router = express.Router();
const database = require('../services/database');
const logger = require('../utils/logger');

/**
 * GET /api/specimens
 * Get specimens data with optional filters
 */
router.get('/', (req, res) => {
  try {
    const { startDate, endDate, species, district } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (species) filters.species = species;

    let data = database.getSpecimensData(filters);

    // Apply district filter if provided
    if (district) {
      data = data.filter(item => item.SiteDistrict === district);
    }

    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    logger.error('Error fetching specimens data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/specimens/summary
 * Get specimens summary statistics
 */
router.get('/summary', (req, res) => {
  try {
    const data = database.getSpecimensData();

    const anopheles = data.filter(d => d.Species && d.Species.toLowerCase().includes('anopheles'));

    const summary = {
      totalSpecimens: data.length,
      totalAnopheles: anopheles.length,
      anophelesPercentage: data.length > 0 ? (anopheles.length / data.length) * 100 : 0,
      uniqueSpecies: [...new Set(data.map(d => d.Species).filter(Boolean))].length
    };

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    logger.error('Error fetching specimens summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

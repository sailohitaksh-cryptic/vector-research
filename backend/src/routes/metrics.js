/**
 * Metrics API Routes - FIXED VERSION with field name mapping
 */

const express = require('express');
const router = express.Router();
const database = require('../services/database');
const MetricsCalculator = require('../processors/metricsCalculator');
const completenessMetric = require('../processors/completenessMetric');
const logger = require('../utils/logger');
const fidelityMetric = require('../processors/fidelityMetric');


// Add this route with other routes

/**
 * GET /api/metrics
 * Get all calculated metrics with proper field name mapping for frontend
 */
router.get('/', (req, res) => {
  try {
    const { start_date, end_date, districts, methods, species } = req.query;
    
    // Parse filters
    const filters = {
      startDate: start_date,
      endDate: end_date,
      districts: districts ? districts.split(',') : undefined,
      methods: methods ? methods.split(',') : undefined,
      species: species ? species.split(',') : undefined
    };

    // Always calculate metrics live from database
    const surveillance = database.getSurveillanceData(filters);
    const specimens = database.getSpecimensData(filters);

    const calculator = new MetricsCalculator(surveillance, specimens);
    const metrics = calculator.calculateAllMetrics();

    // ⭐ FIX: Remap intervention field names to match frontend expectations
    if (metrics.interventions) {
      const originalInterventions = metrics.interventions;
      
      metrics.interventions = {
        // Map irsRatePercent → irsCoverageRate
        irsCoverageRate: originalInterventions.irsRatePercent || originalInterventions.irsCoverageRate || 0,
        
        // Map avgLlinUsageRate → llinUsageRate
        llinUsageRate: originalInterventions.avgLlinUsageRate || originalInterventions.llinUsageRate || 0,
        
        // Flatten llinCoverage object if it exists
        totalLlins: originalInterventions.llinCoverage?.totalLlins || originalInterventions.totalLlins || 0,
        avgLlinsPerHouse: originalInterventions.llinCoverage?.avgLlinsPerHouse || originalInterventions.avgLlinsPerHouse || 0,
        housesWithLlins: originalInterventions.llinCoverage?.housesWithLlins || originalInterventions.housesWithLlins || 0
      };
    }

    res.json(metrics);
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      // Provide empty structure so frontend doesn't crash
      summary: {
        totalCollections: 0,
        totalSpecimens: 0,
        uniqueSites: 0,
        uniqueCollectors: 0
      },
      temporal: {},
      species: {
        speciesCounts: {},
        anophelesCounts: {}
      },
      geographic: {
        collectionsByDistrict: {},
        specimensByDistrict: {}
      },
      collectionMethods: {
        collectionsByMethod: {},
        specimensByMethod: {}
      },
      indoorDensity: {},
      interventions: {
        irsCoverageRate: 0,
        llinUsageRate: 0,
        totalLlins: 0,
        avgLlinsPerHouse: 0,
        housesWithLlins: 0
      }
    });
  }
});

/**
 * GET /api/metrics/live
 * Calculate metrics in real-time from current data
 */
router.get('/live', (req, res) => {
  try {
    const { start_date, end_date, districts, methods, species } = req.query;

    // Parse filters
    const filters = {
      startDate: start_date,
      endDate: end_date,
      districts: districts ? districts.split(',') : undefined,
      methods: methods ? methods.split(',') : undefined,
      species: species ? species.split(',') : undefined
    };

    // Get filtered data
    const surveillance = database.getSurveillanceData(filters);
    const specimens = database.getSpecimensData(filters);

    // Calculate metrics
    const calculator = new MetricsCalculator(surveillance, specimens);
    const metrics = calculator.calculateAllMetrics();

    // ⭐ FIX: Remap intervention field names (same as above)
    if (metrics.interventions) {
      const originalInterventions = metrics.interventions;
      
      metrics.interventions = {
        irsCoverageRate: originalInterventions.irsRatePercent || originalInterventions.irsCoverageRate || 0,
        llinUsageRate: originalInterventions.avgLlinUsageRate || originalInterventions.llinUsageRate || 0,
        totalLlins: originalInterventions.llinCoverage?.totalLlins || originalInterventions.totalLlins || 0,
        avgLlinsPerHouse: originalInterventions.llinCoverage?.avgLlinsPerHouse || originalInterventions.avgLlinsPerHouse || 0,
        housesWithLlins: originalInterventions.llinCoverage?.housesWithLlins || originalInterventions.housesWithLlins || 0
      };
    }

    res.json(metrics);
  } catch (error) {
    logger.error('Error calculating live metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/metrics/completeness/:yearMonth
 * Get completeness metrics for a specific month
 */
router.get('/completeness/:yearMonth', (req, res) => {
  try {
    const { yearMonth } = req.params;

    const completeness = completenessMetric.calculateOverallCompleteness(yearMonth);

    res.json({
      success: true,
      completeness
    });
  } catch (error) {
    logger.error('Error calculating completeness:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/metrics/completeness/:yearMonth/incomplete-sites
 * Get list of incomplete sites for follow-up
 */
router.get('/completeness/:yearMonth/incomplete-sites', (req, res) => {
  try {
    const { yearMonth } = req.params;

    const incompleteSites = completenessMetric.getIncompleteSites(yearMonth);

    res.json({
      success: true,
      count: incompleteSites.length,
      sites: incompleteSites
    });
  } catch (error) {
    logger.error('Error fetching incomplete sites:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/fidelity/:yearMonth', (req, res) => {
  try {
    const { yearMonth } = req.params;
    
    logger.info(`Calculating fidelity for ${yearMonth}`);
    
    const fidelity = fidelityMetric.calculateOverallFidelity(yearMonth);
    
    res.json({
      success: true,
      fidelity
    });
  } catch (error) {
    logger.error('Error calculating fidelity:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
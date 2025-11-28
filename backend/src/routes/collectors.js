/**
 * Collectors API Routes - FIXED
 * File: backend/src/routes/collectors.js
 */

const express = require('express');
const router = express.Router();
const database = require('../services/database');
const logger = require('../utils/logger');

/**
 * GET /api/collectors
 * Get field collectors with filtering support
 */
router.get('/', (req, res) => {
  try {
    const { start_date, end_date, districts } = req.query;

    // Parse filters
    const filters = {
      startDate: start_date,
      endDate: end_date,
      districts: districts ? districts.split(',') : undefined
    };

    // Get surveillance data to calculate collector stats
    const surveillanceData = database.getSurveillanceData(filters);

    // Calculate collector statistics
    const collectorStats = new Map();

    surveillanceData.forEach(record => {
      const collectorName = record.SessionCollectorName || 'Unknown';
      const district = record.SiteDistrict || 'Unknown';
      const collectionDate = record.SessionCollectionDate;

      if (!collectorStats.has(collectorName)) {
        collectorStats.set(collectorName, {
          name: collectorName,
          district: district,
          totalCollections: 0,
          lastSubmission: null,
          status: 'Never Submitted'
        });
      }

      const collector = collectorStats.get(collectorName);
      collector.totalCollections += 1;

      // Update last submission date
      if (collectionDate) {
        const submissionDate = new Date(collectionDate);
        if (!collector.lastSubmission || submissionDate > new Date(collector.lastSubmission)) {
          collector.lastSubmission = submissionDate.toISOString().split('T')[0];
        }
      }
    });

    // Calculate status based on last submission
    const now = new Date();
    collectorStats.forEach(collector => {
      if (!collector.lastSubmission) {
        collector.status = 'Never Submitted';
      } else {
        const lastDate = new Date(collector.lastSubmission);
        const daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

        if (daysSince < 7) {
          collector.status = 'Active';
        } else if (daysSince < 30) {
          collector.status = 'Inactive';
        } else {
          collector.status = 'Dormant';
        }
      }
    });

    // Convert to array and sort by total collections (descending)
    const collectorsArray = Array.from(collectorStats.values())
      .sort((a, b) => b.totalCollections - a.totalCollections);

    // CRITICAL: Return as array, not object
    res.json(collectorsArray);

  } catch (error) {
    logger.error('Error fetching collectors:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      // Return empty array on error so frontend doesn't crash
      collectors: []
    });
  }
});

module.exports = router;
/**
 * Surveillance Routes - FILTERED FOR SURVEILLANCE TYPE ONLY
 * File: backend/src/routes/surveillance.js
 * 
 * CRITICAL FIX: Only returns sessions where session_type = 'SURVEILLANCE'
 * Excludes all DATA_COLLECTION sessions
 */

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const config = require('../config');

// Database connection
const db = new Database(config.database.path, { readonly: true });

/**
 * GET /api/surveillance/sessions
 * Get all surveillance sessions with pagination
 * FILTERED: Only SURVEILLANCE type sessions
 */
router.get('/sessions', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // ✅ FILTER: Only SURVEILLANCE sessions
    const sessions = db.prepare(`
      SELECT * FROM surveillance_sessions 
      WHERE session_type = 'SURVEILLANCE'
      ORDER BY collection_date DESC 
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    // ✅ FILTER: Count only SURVEILLANCE sessions
    const total = db.prepare(`
      SELECT COUNT(*) as count 
      FROM surveillance_sessions 
      WHERE session_type = 'SURVEILLANCE'
    `).get();

    res.json({
      data: sessions,
      pagination: {
        page,
        limit,
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching surveillance sessions:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch surveillance sessions',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/surveillance/sessions/:id
 * Get a specific surveillance session
 * FILTERED: Only if session_type = 'SURVEILLANCE'
 */
router.get('/sessions/:id', (req, res) => {
  try {
    const { id } = req.params;

    // ✅ FILTER: Only SURVEILLANCE sessions
    const session = db.prepare(`
      SELECT * FROM surveillance_sessions 
      WHERE session_id = ? AND session_type = 'SURVEILLANCE'
    `).get(id);

    if (!session) {
      return res.status(404).json({
        error: {
          message: 'Surveillance session not found or is not a SURVEILLANCE type',
          status: 404
        }
      });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching surveillance session:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch surveillance session',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/surveillance/districts
 * Get unique districts from surveillance sessions
 * FILTERED: Only SURVEILLANCE sessions
 */
router.get('/districts', (req, res) => {
  try {
    // ✅ FILTER: Only SURVEILLANCE sessions
    const districts = db.prepare(`
      SELECT DISTINCT district 
      FROM surveillance_sessions 
      WHERE session_type = 'SURVEILLANCE' AND district IS NOT NULL
      ORDER BY district
    `).all();

    res.json(districts.map(d => d.district));
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch districts',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/surveillance/methods
 * Get unique collection methods
 * FILTERED: Only from SURVEILLANCE sessions
 */
router.get('/methods', (req, res) => {
  try {
    // ✅ FILTER: Only SURVEILLANCE sessions
    const methods = db.prepare(`
      SELECT DISTINCT collection_method 
      FROM surveillance_sessions 
      WHERE session_type = 'SURVEILLANCE' AND collection_method IS NOT NULL
      ORDER BY collection_method
    `).all();

    res.json(methods.map(m => m.collection_method));
  } catch (error) {
    console.error('Error fetching collection methods:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch collection methods',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/surveillance/date-range
 * Get min and max collection dates
 * FILTERED: Only from SURVEILLANCE sessions
 */
router.get('/date-range', (req, res) => {
  try {
    // ✅ FILTER: Only SURVEILLANCE sessions
    const range = db.prepare(`
      SELECT 
        MIN(collection_date) as min_date,
        MAX(collection_date) as max_date
      FROM surveillance_sessions
      WHERE session_type = 'SURVEILLANCE'
    `).get();

    res.json(range);
  } catch (error) {
    console.error('Error fetching date range:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch date range',
        details: error.message
      }
    });
  }
});

module.exports = router;
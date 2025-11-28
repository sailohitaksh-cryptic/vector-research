/**
 * Database Service - SIMPLIFIED FIX (No Normalization)
 * Just makes filters actually work
 * 
 * Replace: backend/src/services/database.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    const dbPath = path.join(__dirname, '../../data/vectorinsight.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    logger.info(`Database connected: ${dbPath}`);
  }

  /**
   * Get surveillance data with filters - FIXED
   */
  getSurveillanceData(filters = {}) {
    let query = 'SELECT * FROM surveillance_sessions WHERE 1=1';
    const params = [];

    // Date range filter
    if (filters.startDate) {
      query += ' AND SessionCollectionDate >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND SessionCollectionDate <= ?';
      params.push(filters.endDate);
    }

    // ✅ FIX: District filter - properly handle array
    if (filters.districts && filters.districts.length > 0) {
      const placeholders = filters.districts.map(() => '?').join(',');
      query += ` AND SiteDistrict IN (${placeholders})`;
      params.push(...filters.districts);
    }

    // ✅ FIX: Collection method filter - properly handle array
    if (filters.methods && filters.methods.length > 0) {
      const placeholders = filters.methods.map(() => '?').join(',');
      query += ` AND SessionCollectionMethod IN (${placeholders})`;
      params.push(...filters.methods);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Get specimens data with filters - FIXED
   */
  getSpecimensData(filters = {}) {
    let query = `
      SELECT s.*, sv.SessionCollectionDate, sv.SiteDistrict 
      FROM specimens s
      LEFT JOIN surveillance_sessions sv ON s.SessionID = sv.SessionID
      WHERE 1=1
    `;
    const params = [];

    // Date range filter
    if (filters.startDate) {
      query += ' AND sv.SessionCollectionDate >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND sv.SessionCollectionDate <= ?';
      params.push(filters.endDate);
    }

    // ✅ FIX: District filter
    if (filters.districts && filters.districts.length > 0) {
      const placeholders = filters.districts.map(() => '?').join(',');
      query += ` AND sv.SiteDistrict IN (${placeholders})`;
      params.push(...filters.districts);
    }

    // ✅ FIX: Collection method filter
    if (filters.methods && filters.methods.length > 0) {
      const placeholders = filters.methods.map(() => '?').join(',');
      query += ` AND sv.SessionCollectionMethod IN (${placeholders})`;
      params.push(...filters.methods);
    }

    // ✅ FIX: Species filter
    if (filters.species && filters.species.length > 0) {
      const placeholders = filters.species.map(() => '?').join(',');
      query += ` AND s.Species IN (${placeholders})`;
      params.push(...filters.species);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Get all districts
   */
  getDistricts() {
    const query = 'SELECT DISTINCT SiteDistrict FROM surveillance_sessions WHERE SiteDistrict IS NOT NULL ORDER BY SiteDistrict';
    const results = this.db.prepare(query).all();
    return results.map(r => r.SiteDistrict);
  }

  /**
   * Get all species
   */
  getSpecies() {
    const query = 'SELECT DISTINCT Species FROM specimens WHERE Species IS NOT NULL AND Species != "Unknown" ORDER BY Species';
    const results = this.db.prepare(query).all();
    return results.map(r => r.Species);
  }

  /**
   * Get all collection methods - as they appear in data
   */
  getCollectionMethods() {
    const query = 'SELECT DISTINCT SessionCollectionMethod FROM surveillance_sessions WHERE SessionCollectionMethod IS NOT NULL ORDER BY SessionCollectionMethod';
    const results = this.db.prepare(query).all();
    return results.map(r => r.SessionCollectionMethod);
  }

  close() {
    this.db.close();
    logger.info('Database connection closed');
  }
}

// Singleton instance
const dbService = new DatabaseService();

module.exports = dbService;
/**
 * User Tracking Service
 * Tracks field team activity, submissions, and training status
 * Converted from Python user_tracking.py
 */

const database = require('./database');
const logger = require('../utils/logger');
const { differenceInDays, parseISO } = require('date-fns');

class UserTrackingService {
  /**
   * Create user tracking tables
   */
  createTables() {
    // Tables are already created in database.js
    logger.info('✅ User tracking tables verified');
  }

  /**
   * Auto-register collectors from surveillance data
   */
  autoRegisterCollectors() {
    const query = `
      SELECT DISTINCT 
        SessionCollectorName as name,
        SiteDistrict as district,
        SiteName as site
      FROM surveillance_sessions
      WHERE SessionCollectorName IS NOT NULL AND SessionCollectorName != ''
    `;

    const collectors = database.db.prepare(query).all();
    let registered = 0;

    collectors.forEach(collector => {
      try {
        database.db.prepare(`
          INSERT OR IGNORE INTO field_collectors (collector_name, district, site)
          VALUES (?, ?, ?)
        `).run(collector.name, collector.district, collector.site);
        registered++;
      } catch (err) {
        // Already exists, skip
      }
    });

    logger.info(`✅ Auto-registered ${registered} collectors`);
    return registered;
  }

  /**
   * Update submission logs from surveillance data
   */
  updateSubmissionLogs() {
    const query = `
      SELECT 
        s.SessionCollectorName as collector_name,
        DATE(s.SessionCollectionDate) as submission_date,
        s.SiteDistrict as district,
        s.SiteName as site,
        s.SessionCollectionMethod as collection_method,
        COUNT(DISTINCT s.SessionID) as num_houses,
        COUNT(sp.SpecimenID) as num_specimens
      FROM surveillance_sessions s
      LEFT JOIN specimens sp ON s.SessionID = sp.SessionID
      WHERE s.SessionCollectorName IS NOT NULL AND s.SessionCollectorName != '' AND s.SessionCollectionDate IS NOT NULL
      GROUP BY s.SessionCollectorName, DATE(s.SessionCollectionDate), 
               s.SiteDistrict, s.SiteName, s.SessionCollectionMethod
    `;

    const submissions = database.db.prepare(query).all();

    // Clear old logs
    database.db.prepare('DELETE FROM submission_logs').run();

    // Insert new logs
    const insert = database.db.prepare(`
      INSERT INTO submission_logs 
      (collector_name, submission_date, district, site, collection_method, num_houses, num_specimens)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = database.db.transaction((records) => {
      records.forEach(record => {
        insert.run(
          record.collector_name,
          record.submission_date,
          record.district,
          record.site,
          record.collection_method,
          record.num_houses,
          record.num_specimens
        );
      });
    });

    insertMany(submissions);
    logger.info(`✅ Updated ${submissions.length} submission log entries`);
  }

  /**
   * Get collector summary with activity status
   */
  getCollectorSummary() {
    const query = `
      SELECT 
        fc.collector_name,
        fc.district,
        fc.site,
        fc.role,
        fc.status,
        fc.date_registered,
        MAX(tr.training_date) as last_training_date,
        tr.training_type as last_training_type,
        MAX(sl.submission_date) as last_submission_date,
        COUNT(DISTINCT sl.submission_date) as total_submission_days,
        SUM(sl.num_houses) as total_houses_collected,
        SUM(sl.num_specimens) as total_specimens_collected
      FROM field_collectors fc
      LEFT JOIN training_records tr ON fc.collector_id = tr.collector_id
      LEFT JOIN submission_logs sl ON fc.collector_name = sl.collector_name
      GROUP BY fc.collector_id
      ORDER BY last_submission_date DESC
    `;

    const collectors = database.db.prepare(query).all();
    const today = new Date();

    return collectors.map(collector => {
      const lastSubmission = collector.last_submission_date 
        ? parseISO(collector.last_submission_date)
        : null;
      
      const lastTraining = collector.last_training_date 
        ? parseISO(collector.last_training_date)
        : null;

      const daysSinceSubmission = lastSubmission 
        ? differenceInDays(today, lastSubmission)
        : null;

      const daysSinceTraining = lastTraining 
        ? differenceInDays(today, lastTraining)
        : null;

      // Activity status
      let activityStatus = 'No Submissions';
      if (daysSinceSubmission !== null) {
        if (daysSinceSubmission < 7) activityStatus = 'Active (< 7 days)';
        else if (daysSinceSubmission < 30) activityStatus = 'Inactive (7-30 days)';
        else activityStatus = 'Dormant (> 30 days)';
      }

      // Training status
      let trainingStatus = 'No Training Record';
      if (daysSinceTraining !== null) {
        if (daysSinceTraining < 90) trainingStatus = 'Recent (< 90 days)';
        else if (daysSinceTraining < 180) trainingStatus = 'Due for Refresher (90-180 days)';
        else trainingStatus = 'Needs Training (> 180 days)';
      }

      return {
        ...collector,
        days_since_last_submission: daysSinceSubmission,
        days_since_training: daysSinceTraining,
        activity_status: activityStatus,
        training_status: trainingStatus
      };
    });
  }

  /**
   * Get collectors needing attention
   */
  getCollectorsNeedingAttention() {
    const summary = this.getCollectorSummary();

    return summary.filter(collector => 
      ['Inactive (7-30 days)', 'Dormant (> 30 days)', 'No Submissions'].includes(collector.activity_status) ||
      ['Due for Refresher (90-180 days)', 'Needs Training (> 180 days)'].includes(collector.training_status)
    );
  }

  /**
   * Get daily submission summary
   */
  getDailySubmissionSummary(startDate = null, endDate = null) {
    let query = `
      SELECT 
        submission_date,
        COUNT(DISTINCT collector_name) as num_collectors,
        COUNT(*) as num_submissions,
        SUM(num_houses) as total_houses,
        SUM(num_specimens) as total_specimens
      FROM submission_logs
    `;

    const params = [];
    const conditions = [];

    if (startDate) {
      conditions.push('submission_date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('submission_date <= ?');
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY submission_date ORDER BY submission_date';

    return database.db.prepare(query).all(...params);
  }

  /**
   * Add training record
   */
  addTrainingRecord(collectorName, trainingDate, trainingType = 'Initial Training', 
                    trainerName = null, topics = null, score = null, certification = 'Certified') {
    // Get or create collector
    let collector = database.db.prepare(
      'SELECT collector_id FROM field_collectors WHERE collector_name = ?'
    ).get(collectorName);

    if (!collector) {
      database.db.prepare(`
        INSERT INTO field_collectors (collector_name, status)
        VALUES (?, 'Active')
      `).run(collectorName);

      collector = database.db.prepare(
        'SELECT collector_id FROM field_collectors WHERE collector_name = ?'
      ).get(collectorName);
    }

    // Add training record
    database.db.prepare(`
      INSERT INTO training_records 
      (collector_id, training_date, training_type, trainer_name, topics_covered, assessment_score, certification_status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      collector.collector_id,
      trainingDate,
      trainingType,
      trainerName,
      topics,
      score,
      certification
    );

    logger.info(`✅ Added training record for ${collectorName}`);
  }

  /**
   * Initialize user tracking (run after data processing)
   */
  initialize() {
    this.createTables();
    this.autoRegisterCollectors();
    this.updateSubmissionLogs();
    logger.info('✅ User tracking initialized');
  }
}

module.exports = new UserTrackingService();

/**
 * Completeness Metric - SIMPLIFIED FOR QUICK DEPLOYMENT
 * Calculates data completeness at district level
 * 
 * Replace: backend/src/processors/completenessMetric.js
 */

const logger = require('../utils/logger');
const database = require('../services/database');

class CompletenessMetric {
  /**
   * Calculate completeness for a specific month
   * @param {string} yearMonth - Format: YYYY-MM (e.g., "2025-11")
   */
  calculateOverallCompleteness(yearMonth) {
    logger.info(`Calculating completeness for ${yearMonth}...`);

    try {
      // Get all surveillance data for the month
      const [year, month] = yearMonth.split('-');
      
      const query = `
        SELECT 
          sv.*,
          COUNT(sp.SpecimenID) as specimen_count
        FROM surveillance_sessions sv
        LEFT JOIN specimens sp ON sv.SessionID = sp.SessionID
        WHERE sv.CollectionYearMonth = ?
        GROUP BY sv.SessionID
      `;

      const sessions = database.db.prepare(query).all(yearMonth);

      if (sessions.length === 0) {
        return {
          yearMonth,
          totalSessions: 0,
          completeSessions: 0,
          completenessRate: 0,
          districts: [],
          message: 'No data available for this month'
        };
      }

      // Define required fields for completeness
      const requiredFields = [
        'SessionCollectorName',
        'SessionCollectionDate',
        'SessionCollectionMethod',
        'SiteDistrict',
        'NumPeopleSleptInHouse',
        'NumLlinsAvailable'
      ];

      // Calculate completeness for each session
      const sessionsWithCompleteness = sessions.map(session => {
        const missingFields = [];
        
        requiredFields.forEach(field => {
          const value = session[field];
          if (!value || value === '' || value === 'Unknown' || value === 'N/A') {
            missingFields.push(field);
          }
        });

        // Check if has specimens
        if (!session.specimen_count || session.specimen_count < 1) {
          missingFields.push('Specimens (need at least 1)');
        }

        const isComplete = missingFields.length === 0;

        return {
          ...session,
          isComplete,
          missingFields,
          completenessPercent: Math.round(
            ((requiredFields.length + 1 - missingFields.length) / (requiredFields.length + 1)) * 100
          )
        };
      });

      // Group by district
      const districtStats = {};
      sessionsWithCompleteness.forEach(session => {
        const district = session.SiteDistrict || 'Unknown';
        
        if (!districtStats[district]) {
          districtStats[district] = {
            district,
            totalSessions: 0,
            completeSessions: 0,
            incompleteSessions: 0,
            sessions: []
          };
        }

        districtStats[district].totalSessions++;
        if (session.isComplete) {
          districtStats[district].completeSessions++;
        } else {
          districtStats[district].incompleteSessions++;
        }
        districtStats[district].sessions.push(session);
      });

      // Calculate rates for each district
      const districts = Object.values(districtStats).map(dist => ({
        district: dist.district,
        totalSessions: dist.totalSessions,
        completeSessions: dist.completeSessions,
        incompleteSessions: dist.incompleteSessions,
        completenessRate: Math.round((dist.completeSessions / dist.totalSessions) * 100)
      })).sort((a, b) => b.completenessRate - a.completenessRate);

      // Calculate overall stats
      const totalSessions = sessionsWithCompleteness.length;
      const completeSessions = sessionsWithCompleteness.filter(s => s.isComplete).length;
      const completenessRate = Math.round((completeSessions / totalSessions) * 100);

      // Get incomplete sessions for follow-up
      const incompleteSessions = sessionsWithCompleteness
        .filter(s => !s.isComplete)
        .map(s => ({
          sessionId: s.SessionID,
          district: s.SiteDistrict,
          collectorName: s.SessionCollectorName || 'Unknown',
          date: s.SessionCollectionDate,
          completenessPercent: s.completenessPercent,
          missingFields: s.missingFields
        }))
        .sort((a, b) => a.completenessPercent - b.completenessPercent)
        .slice(0, 20); // Top 20 most incomplete

      logger.info(`Completeness calculated: ${completenessRate}% (${completeSessions}/${totalSessions})`);

      return {
        yearMonth,
        totalSessions,
        completeSessions,
        incompleteSessions: totalSessions - completeSessions,
        completenessRate,
        districts,
        incompleteSummary: incompleteSessions,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating completeness:', error);
      throw error;
    }
  }

  /**
   * Get list of incomplete sessions for follow-up
   */
  getIncompleteSites(yearMonth) {
    const completeness = this.calculateOverallCompleteness(yearMonth);
    return completeness.incompleteSummary || [];
  }
}

module.exports = new CompletenessMetric();
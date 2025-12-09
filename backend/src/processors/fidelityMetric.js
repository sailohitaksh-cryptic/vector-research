/**
 * Fidelity Metrics Calculator (formerly Completeness)
 * Calculates:
 * 1. House data fidelity (houses with data / expected houses from API)
 * 2. Mosquito data completeness (missing mosquito data)
 * 3. VHT penetration (VHTs collecting in current month / VHTs in 2025-11)
 * 4. VHT training completion (trained VHTs using SessionCollectorLastTrainedOn / 18 total VHTs)
 * 
 * ✅ UPDATED: 
 * - Uses SessionCollectorLastTrainedOn from raw data
 * - First rollout month hardcoded to 2025-11
 * - Fetches expected houses from sites API
 * 
 * Replace: backend/src/processors/fidelityMetric.js
 */

const logger = require('../utils/logger');
const database = require('../services/database');
const axios = require('axios');

class FidelityMetric {
  /**
   * Calculate fidelity metrics for a specific month
   * @param {string} yearMonth - Format: YYYY-MM (e.g., "2025-11")
   */
  async calculateFidelityMetrics(yearMonth) {
    logger.info(`Calculating fidelity metrics for ${yearMonth}...`);

    try {
      const [year, month] = yearMonth.split('-');

      // Get all surveillance data for the month
      const surveillanceQuery = `
        SELECT 
          sv.*,
          COUNT(sp.SpecimenID) as specimen_count
        FROM surveillance_sessions sv
        LEFT JOIN specimens sp ON sv.SessionID = sp.SessionID
        WHERE strftime('%Y-%m', sv.SessionCollectionDate) = ?
        GROUP BY sv.SessionID
      `;

      const sessions = database.db.prepare(surveillanceQuery).all(yearMonth);

      if (sessions.length === 0) {
        return {
          yearMonth,
          houseFidelity: await this.calculateHouseFidelity(yearMonth, 0),
          mosquitoFidelity: this.calculateMosquitoFidelity([]),
          vhtPenetration: this.calculateVHTPenetration(yearMonth, []),
          vhtTraining: this.calculateVHTTraining([]),
          message: 'No data available for this month'
        };
      }

      // Calculate all fidelity metrics
      const houseFidelity = await this.calculateHouseFidelity(yearMonth, sessions.length);
      const mosquitoFidelity = this.calculateMosquitoFidelity(sessions);
      const vhtPenetration = this.calculateVHTPenetration(yearMonth, sessions);
      const vhtTraining = this.calculateVHTTraining(sessions);

      return {
        yearMonth,
        houseFidelity,
        mosquitoFidelity,
        vhtPenetration,
        vhtTraining,
        calculatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculating fidelity metrics:', error);
      throw error;
    }
  }

  /**
   * 1. Calculate house data fidelity
   * Houses with data / Total expected houses (from API)
   * 
   * ✅ UPDATED: Fetches expected houses from sites API
   */
  async calculateHouseFidelity(yearMonth, housesWithData) {
    try {
      // Fetch expected houses from sites API
      const axios = require('axios');
      const apiUrl = 'http://api.vectorcam.org/sites';
      
      let totalExpectedHouses = 30; // Default fallback
      
      try {
        const response = await axios.get(apiUrl);
        
        // Sum up expected houses from all sites
        if (response.data && Array.isArray(response.data)) {
          totalExpectedHouses = response.data.reduce((sum, site) => {
            return sum + (site.expected_houses || site.expectedHouses || 0);
          }, 0);
        }
      } catch (apiError) {
        logger.warn('Could not fetch expected houses from API, using default:', apiError.message);
      }

      const fidelityRate = (housesWithData / totalExpectedHouses) * 100;

      return {
        housesWithData,
        totalExpectedHouses,
        fidelityRate: Math.round(fidelityRate * 10) / 10,
        status: fidelityRate >= 90 ? 'Excellent' : 
                fidelityRate >= 70 ? 'Good' : 
                fidelityRate >= 50 ? 'Fair' : 'Needs Improvement'
      };
    } catch (error) {
      logger.error('Error calculating house fidelity:', error);
      
      // Fallback to default
      const fidelityRate = (housesWithData / 30) * 100;
      return {
        housesWithData,
        totalExpectedHouses: 30,
        fidelityRate: Math.round(fidelityRate * 10) / 10,
        status: fidelityRate >= 90 ? 'Excellent' : 
                fidelityRate >= 70 ? 'Good' : 
                fidelityRate >= 50 ? 'Fair' : 'Needs Improvement',
        error: error.message
      };
    }
  }

  /**
   * 2. Calculate mosquito data completeness
   * Check for missing mosquito specimen data
   */
  calculateMosquitoFidelity(sessions) {
    let sessionsWithMosquitoes = 0;
    let sessionsWithoutMosquitoes = 0;
    let totalSpecimens = 0;

    sessions.forEach(session => {
      const specimenCount = session.specimen_count || 0;
      totalSpecimens += specimenCount;

      if (specimenCount > 0) {
        sessionsWithMosquitoes++;
      } else {
        sessionsWithoutMosquitoes++;
      }
    });

    const mosquitoDataRate = sessions.length > 0 
      ? (sessionsWithMosquitoes / sessions.length) * 100 
      : 0;

    return {
      totalSessions: sessions.length,
      sessionsWithMosquitoes,
      sessionsWithoutMosquitoes,
      totalSpecimens,
      mosquitoDataRate: Math.round(mosquitoDataRate * 10) / 10,
      avgSpecimensPerSession: sessions.length > 0 
        ? Math.round((totalSpecimens / sessions.length) * 10) / 10 
        : 0,
      status: mosquitoDataRate >= 90 ? 'Excellent' : 
              mosquitoDataRate >= 70 ? 'Good' : 
              mosquitoDataRate >= 50 ? 'Fair' : 'Needs Improvement'
    };
  }

  /**
   * 3. Calculate VHT penetration
   * VHTs collecting in current month / VHTs in first rollout month * 100
   * 
   * ✅ UPDATED: First rollout month hardcoded to 2025-11
   */
  calculateVHTPenetration(currentYearMonth, currentSessions) {
    try {
      // Get unique VHTs (collectors) in current month
      const currentVHTs = new Set(
        currentSessions
          .map(s => s.SessionCollectorName)
          .filter(name => name && name !== 'Unknown')
      );

      // ✅ HARDCODED: First rollout month is 2025-12
      const firstMonth = '2025-12';

      // Get VHTs from first rollout month
      const firstMonthQuery = `
        SELECT DISTINCT SessionCollectorName
        FROM surveillance_sessions
        WHERE strftime('%Y-%m', SessionCollectionDate) = ?
          AND SessionCollectorName IS NOT NULL 
          AND SessionCollectorName != ''
          AND SessionCollectorName != 'Unknown'
      `;

      const firstMonthVHTs = database.db.prepare(firstMonthQuery).all(firstMonth);
      const firstMonthCount = firstMonthVHTs.length;

      const penetrationRate = firstMonthCount > 0 
        ? (currentVHTs.size / firstMonthCount) * 100 
        : 0;

      return {
        currentMonthVHTs: currentVHTs.size,
        firstMonthVHTs: firstMonthCount,
        penetrationRate: Math.round(penetrationRate * 10) / 10,
        firstRolloutMonth: firstMonth,
        vhtNames: Array.from(currentVHTs),
        status: penetrationRate >= 100 ? 'Growing' : 
                penetrationRate >= 80 ? 'Good Retention' : 
                penetrationRate >= 50 ? 'Fair Retention' : 'Low Retention'
      };

    } catch (error) {
      logger.error('Error calculating VHT penetration:', error);
      return {
        currentMonthVHTs: 0,
        firstMonthVHTs: 0,
        penetrationRate: 0,
        firstRolloutMonth: '2025-11',
        status: 'Error calculating'
      };
    }
  }

  /**
   * 4. Calculate VHT training completion
   * Trained VHTs / Total VHTs (18) * 100
   * Based on SessionCollectorLastTrainedOn field in surveillance_sessions
   * 
   * ✅ UPDATED: Uses SessionCollectorLastTrainedOn from raw data
   */
  calculateVHTTraining(sessions) {
    const TOTAL_VHTS = 18;

    try {
      // Get unique VHTs who have been trained (have SessionCollectorLastTrainedOn date)
      const trainedVHTsQuery = `
        SELECT DISTINCT 
          SessionCollectorName,
          SessionCollectorLastTrainedOn,
          MAX(SessionCollectionDate) as last_collection_date
        FROM surveillance_sessions
        WHERE SessionCollectorLastTrainedOn IS NOT NULL 
          AND SessionCollectorLastTrainedOn != ''
          AND SessionCollectorName IS NOT NULL 
          AND SessionCollectorName != ''
          AND SessionCollectorName != 'Unknown'
        GROUP BY SessionCollectorName
      `;

      const trainedVHTs = database.db.prepare(trainedVHTsQuery).all();
      const trainedCount = trainedVHTs.length;

      const trainingRate = (trainedCount / TOTAL_VHTS) * 100;

      return {
        trainedVHTs: trainedCount,
        totalVHTs: TOTAL_VHTS,
        untrainedVHTs: TOTAL_VHTS - trainedCount,
        trainingRate: Math.round(trainingRate * 10) / 10,
        trainingDetails: trainedVHTs.map(t => ({
          name: t.SessionCollectorName,
          trainedOn: t.SessionCollectorLastTrainedOn,
          lastCollection: t.last_collection_date
        })),
        status: trainingRate >= 90 ? 'Excellent' : 
                trainingRate >= 70 ? 'Good' : 
                trainingRate >= 50 ? 'Fair' : 'Needs Training Campaign'
      };

    } catch (error) {
      logger.error('Error calculating VHT training:', error);
      
      // Fallback: count unique VHTs in current data
      const uniqueVHTs = new Set(
        sessions
          .map(s => s.SessionCollectorName)
          .filter(name => name && name !== 'Unknown')
      );

      return {
        trainedVHTs: 0,
        totalVHTs: TOTAL_VHTS,
        untrainedVHTs: TOTAL_VHTS,
        trainingRate: 0,
        activeVHTs: uniqueVHTs.size,
        status: 'Training data not yet available',
        error: error.message
      };
    }
  }

  /**
   * Get overall fidelity summary
   */
  async calculateOverallFidelity(yearMonth) {
    const metrics = await this.calculateFidelityMetrics(yearMonth);

    // Calculate composite fidelity score (average of all metrics)
    const scores = [
      metrics.houseFidelity?.fidelityRate || 0,
      metrics.mosquitoFidelity?.mosquitoDataRate || 0,
      metrics.vhtPenetration?.penetrationRate || 0,
      metrics.vhtTraining?.trainingRate || 0
    ];

    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    return {
      ...metrics,
      overallFidelityScore: Math.round(overallScore * 10) / 10,
      overallStatus: overallScore >= 90 ? 'Excellent' : 
                     overallScore >= 70 ? 'Good' : 
                     overallScore >= 50 ? 'Fair' : 'Needs Improvement'
    };
  }
}

module.exports = new FidelityMetric();
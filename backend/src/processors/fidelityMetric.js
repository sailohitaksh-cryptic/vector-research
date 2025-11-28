/**
 * Fidelity Metrics Calculator (formerly Completeness)
 * Calculates:
 * 1. House data fidelity (houses with data / 30 total expected)
 * 2. Mosquito data completeness (missing mosquito data)
 * 3. VHT penetration (VHTs collecting in current month / VHTs in first month)
 * 4. VHT training completion (trained VHTs / 18 total VHTs)
 * 
 * Replace: backend/src/processors/completenessMetric.js
 * (or rename to fidelityMetric.js)
 */

const logger = require('../utils/logger');
const database = require('../services/database');

class FidelityMetric {
  /**
   * Calculate fidelity metrics for a specific month
   * @param {string} yearMonth - Format: YYYY-MM (e.g., "2025-11")
   */
  calculateFidelityMetrics(yearMonth) {
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
          houseFidelity: this.calculateHouseFidelity(0),
          mosquitoFidelity: this.calculateMosquitoFidelity([]),
          vhtPenetration: this.calculateVHTPenetration(yearMonth, []),
          vhtTraining: this.calculateVHTTraining([]),
          message: 'No data available for this month'
        };
      }

      // Calculate all fidelity metrics
      const houseFidelity = this.calculateHouseFidelity(sessions.length);
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
   * Houses with data / Total expected houses (30)
   */
  calculateHouseFidelity(housesWithData) {
    const TOTAL_EXPECTED_HOUSES = 30;

    const fidelityRate = (housesWithData / TOTAL_EXPECTED_HOUSES) * 100;

    return {
      housesWithData,
      totalExpectedHouses: TOTAL_EXPECTED_HOUSES,
      fidelityRate: Math.round(fidelityRate * 10) / 10, // Round to 1 decimal
      status: fidelityRate >= 90 ? 'Excellent' : 
              fidelityRate >= 70 ? 'Good' : 
              fidelityRate >= 50 ? 'Fair' : 'Needs Improvement'
    };
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
   */
  calculateVHTPenetration(currentYearMonth, currentSessions) {
    try {
      // Get unique VHTs (collectors) in current month
      const currentVHTs = new Set(
        currentSessions
          .map(s => s.SessionCollectorName)
          .filter(name => name && name !== 'Unknown')
      );

      // Get first month of rollout (earliest collection date in database)
      const firstMonthQuery = `
        SELECT 
          strftime('%Y-%m', MIN(SessionCollectionDate)) as first_month
        FROM surveillance_sessions
        WHERE SessionCollectorName IS NOT NULL 
          AND SessionCollectorName != ''
          AND SessionCollectorName != 'Unknown'
      `;

      const firstMonthResult = database.db.prepare(firstMonthQuery).get();
      const firstMonth = firstMonthResult?.first_month;

      if (!firstMonth) {
        return {
          currentMonthVHTs: currentVHTs.size,
          firstMonthVHTs: 0,
          penetrationRate: 0,
          firstRolloutMonth: 'Unknown',
          status: 'No baseline data'
        };
      }

      // Get VHTs from first rollout month
      const firstMonthQuery2 = `
        SELECT DISTINCT SessionCollectorName
        FROM surveillance_sessions
        WHERE strftime('%Y-%m', SessionCollectionDate) = ?
          AND SessionCollectorName IS NOT NULL 
          AND SessionCollectorName != ''
          AND SessionCollectorName != 'Unknown'
      `;

      const firstMonthVHTs = database.db.prepare(firstMonthQuery2).all(firstMonth);
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
        status: 'Error calculating'
      };
    }
  }

  /**
   * 4. Calculate VHT training completion
   * Trained VHTs / Total VHTs (18) * 100
   * Based on LastTrainedOn field
   */
  calculateVHTTraining(sessions) {
    const TOTAL_VHTS = 18;

    // Get unique VHTs who have been trained (have LastTrainedOn date)
    const trainedVHTsQuery = `
      SELECT DISTINCT SessionCollectorName
      FROM surveillance_sessions
      WHERE LastTrainedOn IS NOT NULL 
        AND LastTrainedOn != ''
        AND SessionCollectorName IS NOT NULL 
        AND SessionCollectorName != ''
        AND SessionCollectorName != 'Unknown'
    `;

    try {
      const trainedVHTs = database.db.prepare(trainedVHTsQuery).all();
      const trainedCount = trainedVHTs.length;

      const trainingRate = (trainedCount / TOTAL_VHTS) * 100;

      // Get training details for each VHT
      const trainingDetailsQuery = `
        SELECT 
          SessionCollectorName,
          LastTrainedOn,
          MAX(SessionCollectionDate) as last_collection_date
        FROM surveillance_sessions
        WHERE LastTrainedOn IS NOT NULL 
          AND LastTrainedOn != ''
        GROUP BY SessionCollectorName
      `;

      const trainingDetails = database.db.prepare(trainingDetailsQuery).all();

      return {
        trainedVHTs: trainedCount,
        totalVHTs: TOTAL_VHTS,
        untrainedVHTs: TOTAL_VHTS - trainedCount,
        trainingRate: Math.round(trainingRate * 10) / 10,
        trainingDetails: trainingDetails.map(t => ({
          name: t.SessionCollectorName,
          trainedOn: t.LastTrainedOn,
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
        status: 'Training data not yet available'
      };
    }
  }

  /**
   * Get overall fidelity summary
   */
  calculateOverallFidelity(yearMonth) {
    const metrics = this.calculateFidelityMetrics(yearMonth);

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
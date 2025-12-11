/**
 * Fidelity Metrics Calculator (formerly Completeness)
 * Calculates:
 * 1. House data fidelity (houses with data / expected houses from API)
 * 2. Mosquito data completeness (missing mosquito data)
 * 3. VHT penetration (VHTs collecting in current month / VHTs in 2025-12)
 * 4. VHT training completion (trained VHTs using SessionCollectorLastTrainedOn / 18 total VHTs)
 * 
 * ✅ UPDATED: 
 * - Uses SessionCollectorLastTrainedOn from raw data
 * - First rollout month hardcoded to 2025-12
 * - Fetches expected houses count from sites API (programId=1)
 * - No data filtering needed - already done in pipeline.py
 * - ✅ FIXED: Houses with data only counts site IDs in valid sites list
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
      // ✅ No filters needed - data already cleaned in pipeline.py
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
          houseFidelity: await this.calculateHouseFidelity(yearMonth, []),
          mosquitoFidelity: this.calculateMosquitoFidelity([]),
          vhtPenetration: this.calculateVHTPenetration(yearMonth, []),
          vhtTraining: this.calculateVHTTraining([]),
          message: 'No data available for this month'
        };
      }

      // Calculate all fidelity metrics
      const houseFidelity = await this.calculateHouseFidelity(yearMonth, sessions);
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
   * Houses with data / Total expected houses (from API, excluding siteId 11)
   * 
   * ✅ FIXED: Only counts site IDs that are in the valid sites list
   */
  async calculateHouseFidelity(yearMonth, sessions) {
    try {
      // Fetch expected houses from sites API
      const axios = require('axios');
      const apiUrl = 'http://api.vectorcam.org/sites/?programId=1';
      
      let totalExpectedHouses = 60; // Default if API fetch fails
      let validSiteIds = new Set(); // Track valid site IDs
      
      try {
        const apiKey = process.env.API_SECRET_KEY || process.env.VECTORCAM_API_KEY;
        
        const response = await axios.get(apiUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });
        
        // ✅ Filter out siteId 11 (district "Other") and count remaining sites
        if (response.data && response.data.sites && Array.isArray(response.data.sites)) {
          const validSites = response.data.sites.filter(site => 
            site.siteId !== 11 && 
            site.district !== 'Other' &&
            site.isActive === true
          );
          totalExpectedHouses = validSites.length;
          validSiteIds = new Set(validSites.map(s => s.siteId)); // Store valid site IDs
          
          logger.info(`✅ Fetched ${totalExpectedHouses} expected houses from API (excluded siteId 11)`);
        }
      } catch (apiError) {
        logger.warn(`Could not fetch expected houses from API, using default: ${totalExpectedHouses}`, apiError.message);
      }

      // ✅ FIX: Only count SessionSiteId values that are in the valid sites list
      const sessionSiteIds = sessions
        .map(s => s.SessionSiteId || s.SiteID || s.site_id)
        .filter(id => id != null && id !== '');
      
      // Filter to only valid site IDs
      const validSessionSiteIds = validSiteIds.size > 0
        ? sessionSiteIds.filter(id => validSiteIds.has(parseInt(id)))
        : sessionSiteIds; // Fallback if API failed
      
      const housesWithData = new Set(validSessionSiteIds).size;
      
      logger.info(`Found ${sessionSiteIds.length} session records with site IDs`);
      logger.info(`After filtering to valid sites: ${housesWithData} houses with data`);

      const fidelityRate = totalExpectedHouses > 0 
        ? (housesWithData / totalExpectedHouses) * 100 
        : 0;

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
      return {
        housesWithData: 0,
        totalExpectedHouses: 60,
        fidelityRate: 0,
        status: 'Needs Improvement',
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
   * ✅ FIXED: Only counts collectors where SessionCollectorTitle = 'Village Health Team (VHT)'
   * ✅ FIXED: Expected VHTs calculated as: number_of_districts * 6
   */
  calculateVHTPenetration(currentYearMonth, currentSessions) {
    try {
      // ✅ NEW: Only count VHTs from specimens table where SessionCollectorTitle = 'Village Health Team (VHT)'
      const currentVHTsQuery = `
        SELECT DISTINCT sp.SessionCollectorName
        FROM specimens sp
        INNER JOIN surveillance_sessions sv ON sp.SessionID = sv.SessionID
        WHERE strftime('%Y-%m', sv.SessionCollectionDate) = ?
          AND sp.SessionCollectorTitle = 'Village Health Team (VHT)'
          AND sp.SessionCollectorName IS NOT NULL 
          AND sp.SessionCollectorName != ''
          AND sp.SessionCollectorName != 'Unknown'
      `;
      
      const currentVHTsResult = database.db.prepare(currentVHTsQuery).all(currentYearMonth);
      const currentVHTs = new Set(currentVHTsResult.map(r => r.SessionCollectorName));

      // ✅ HARDCODED: First rollout month is 2025-12
      const firstMonth = '2025-12';

      // ✅ Get VHTs from first rollout month (also filtered by VHT title)
      const firstMonthVHTsQuery = `
        SELECT DISTINCT sp.SessionCollectorName
        FROM specimens sp
        INNER JOIN surveillance_sessions sv ON sp.SessionID = sv.SessionID
        WHERE strftime('%Y-%m', sv.SessionCollectionDate) = ?
          AND sp.SessionCollectorTitle = 'Village Health Team (VHT)'
          AND sp.SessionCollectorName IS NOT NULL 
          AND sp.SessionCollectorName != ''
          AND sp.SessionCollectorName != 'Unknown'
      `;

      const firstMonthVHTs = database.db.prepare(firstMonthVHTsQuery).all(firstMonth);
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
        firstRolloutMonth: '2025-12',
        status: 'Error calculating'
      };
    }
  }

  /**
   * 4. Calculate VHT training completion
   * Trained VHTs / Expected VHTs (districts * 6) * 100
   * 
   * ✅ FIXED: Only counts collectors where SessionCollectorTitle = 'Village Health Team (VHT)'
   * ✅ FIXED: Expected VHTs calculated as: number_of_districts * 6
   */
  calculateVHTTraining(sessions) {
    try {
      // ✅ Get number of districts from data
      const districtsQuery = `
        SELECT COUNT(DISTINCT SiteDistrict) as district_count
        FROM surveillance_sessions
        WHERE SiteDistrict IS NOT NULL 
          AND SiteDistrict != ''
          AND SiteDistrict != 'Other'
      `;
      
      const districtsResult = database.db.prepare(districtsQuery).get();
      const numDistricts = districtsResult?.district_count || 2; // Fallback to 2
      const TOTAL_VHTS = numDistricts * 6; // ✅ Dynamic calculation
      
      logger.info(`Calculating VHT training: ${numDistricts} districts * 6 = ${TOTAL_VHTS} expected VHTs`);

      // ✅ Get unique VHTs who have been trained (with VHT title filter)
      const trainedVHTsQuery = `
        SELECT DISTINCT 
          sp.SessionCollectorName,
          sv.SessionCollectorLastTrainedOn,
          MAX(sv.SessionCollectionDate) as last_collection_date
        FROM specimens sp
        INNER JOIN surveillance_sessions sv ON sp.SessionID = sv.SessionID
        WHERE sv.SessionCollectorLastTrainedOn IS NOT NULL 
          AND sv.SessionCollectorLastTrainedOn != ''
          AND sp.SessionCollectorTitle = 'Village Health Team (VHT)'
          AND sp.SessionCollectorName IS NOT NULL 
          AND sp.SessionCollectorName != ''
          AND sp.SessionCollectorName != 'Unknown'
          AND sv.SessionID IS NOT NULL 
          AND sv.SessionID != ''
        GROUP BY sp.SessionCollectorName
      `;

      const trainedVHTs = database.db.prepare(trainedVHTsQuery).all();
      const trainedCount = trainedVHTs.length;

      const trainingRate = TOTAL_VHTS > 0 ? (trainedCount / TOTAL_VHTS) * 100 : 0;

      return {
        trainedVHTs: trainedCount,
        totalVHTs: TOTAL_VHTS,
        untrainedVHTs: Math.max(0, TOTAL_VHTS - trainedCount),
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
      
      // Fallback: Use 2 districts * 6 = 12 VHTs
      const TOTAL_VHTS = 12;
      
      return {
        trainedVHTs: 0,
        totalVHTs: TOTAL_VHTS,
        untrainedVHTs: TOTAL_VHTS,
        trainingRate: 0,
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
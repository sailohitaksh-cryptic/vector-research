/**
 * Metrics Calculator - WITH COLLECTION METHOD NORMALIZATION
 * Normalizes collection methods to 4 categories:
 * - PSC (Pyrethrum Spray Catch)
 * - CDC Light Trap
 * - HLC (Human Landing Catch)
 * - Other
 * 
 * Replace: backend/src/processors/metricsCalculator.js
 */

const logger = require('../utils/logger');
const _ = require('lodash');

class MetricsCalculator {
  constructor(surveillance, specimens) {
    this.surveillance = surveillance;
    this.specimens = specimens;
  }

  /**
   * Normalize species name
   * Cleans up variations and removes invalid species
   */
  normalizeSpecies(species) {
    if (!species || species === 'null' || species === 'NULL') {
      return null; // Will be filtered out
    }

    const speciesLower = species.toLowerCase().trim();

    // Normalize "Non-mosquito" variations
    if (speciesLower === 'non-mosquito' || speciesLower === 'non mosquito' || speciesLower === 'nonmosquito') {
      return 'Non-Mosquito';
    }

    // Return original if no normalization needed
    return species;
  }

  /**
   * Normalize collection method
   * Normalizes to 4 standard categories:
   * - PSC (Pyrethrum Spray Catch)
   * - CDC Light Trap
   * - HLC (Human Landing Catch)  
   * - Other
   */
  normalizeCollectionMethod(method) {
    if (!method || method === 'null' || method === 'NULL') {
      return 'Other';
    }

    const methodLower = method.toLowerCase().trim();

    // PSC variations
    if (methodLower.includes('pyrethrum') || methodLower.includes('psc')) {
      return 'PSC';
    }

    // CDC Light Trap variations
    if (methodLower.includes('cdc') || methodLower.includes('light trap') || methodLower.includes('ltc')) {
      return 'CDC Light Trap';
    }

    // HLC variations
    if (methodLower.includes('human landing') || methodLower.includes('hlc')) {
      return 'HLC';
    }

    // Everything else goes to "Other"
    // This includes: null, Other VC, Other vectorsuck, Other insectary, etc.
    return 'Other';
  }

  /**
   * Calculate all metrics
   */
  calculateAllMetrics() {
    logger.info('Calculating all metrics...');

    const metrics = {
      summary: this.calculateSummaryMetrics(),
      temporal: this.calculateTemporalMetrics(),
      species: this.calculateSpeciesMetrics(),
      collectionMethods: this.calculateCollectionMethodMetrics(),
      interventions: this.calculateInterventionMetrics(),
      bloodFeeding: this.calculateBloodFeedingMetrics(),
      indoorResting: this.calculateIndoorRestingDensity(),
      geographic: this.calculateGeographicMetrics(),
      dataQuality: this.calculateDataQualityMetrics()
    };

    logger.info('✅ All metrics calculated successfully');
    return metrics;
  }

  /**
   * Extract year-month from date string
   */
  getYearMonthFromDate(dateString) {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate summary metrics
   */
  calculateSummaryMetrics() {
    const dates = this.surveillance
      .filter(s => s.SessionCollectionDate)
      .map(s => new Date(s.SessionCollectionDate))
      .filter(d => !isNaN(d));

    // ✅ FIX: Filter out null species for count
    const validSpecimens = this.specimens.filter(sp => {
      const normalized = this.normalizeSpecies(sp.Species);
      return normalized !== null;
    });

    return {
      totalCollections: this.surveillance.length,
      totalSpecimens: validSpecimens.length, // Use valid specimens count
      dateRange: {
        start: dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : null,
        end: dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null
      },
      uniqueSites: _.uniqBy(this.surveillance, 'SiteDistrict').length,
      uniqueCollectors: _.uniqBy(this.surveillance, 'SessionCollectorName').length,
      countries: _.uniq(this.surveillance.map(s => s.ProgramCountry).filter(Boolean))
    };
  }

  /**
   * Calculate temporal metrics
   */
  calculateTemporalMetrics() {
    const surveillanceWithYearMonth = this.surveillance.map(s => ({
      ...s,
      CollectionYearMonth: s.CollectionYearMonth || this.getYearMonthFromDate(s.SessionCollectionDate)
    }));

    const specimensWithYearMonth = this.specimens.map(sp => ({
      ...sp,
      CaptureYearMonth: sp.CaptureYearMonth || this.getYearMonthFromDate(sp.CapturedAt)
    }));

    const validSurveillance = surveillanceWithYearMonth.filter(s => s.CollectionYearMonth);
    const validSpecimens = specimensWithYearMonth.filter(sp => sp.CaptureYearMonth);

    const collectionsByMonth = _.countBy(validSurveillance, 'CollectionYearMonth');
    const specimensByMonth = _.countBy(validSpecimens, 'CaptureYearMonth');

    return {
      collectionsByMonth,
      specimensByMonth,
      collectionsOverTime: validSurveillance.map(s => ({
        date: s.SessionCollectionDate,
        yearMonth: s.CollectionYearMonth
      }))
    };
  }

  /**
   * Calculate species metrics - WITH CLEANUP
   */
  calculateSpeciesMetrics() {
    // ✅ FIX: Normalize species names and filter out nulls
    const specimensWithNormalizedSpecies = this.specimens.map(s => ({
      ...s,
      NormalizedSpecies: this.normalizeSpecies(s.Species)
    })).filter(s => s.NormalizedSpecies !== null); // Remove nulls

    const speciesCounts = _.countBy(specimensWithNormalizedSpecies, 'NormalizedSpecies');
    
    const anophelesSpecimens = specimensWithNormalizedSpecies.filter(s => 
      s.NormalizedSpecies && s.NormalizedSpecies.toLowerCase().includes('anopheles')
    );

    const anophelesCounts = _.countBy(anophelesSpecimens, 'NormalizedSpecies');
    const anophelesSexRatio = _.countBy(anophelesSpecimens, 'Sex');

    return {
      speciesCounts,
      anophelesCounts,
      anophelesSexRatio,
      totalAnopheles: anophelesSpecimens.length,
      anophelesPercentage: specimensWithNormalizedSpecies.length > 0 
        ? (anophelesSpecimens.length / specimensWithNormalizedSpecies.length) * 100 
        : 0
    };
  }

  /**
   * Calculate collection method metrics - WITH NORMALIZATION
   */
  calculateCollectionMethodMetrics() {
    // ✅ Normalize collection methods before counting
    const surveillanceWithNormalizedMethods = this.surveillance.map(s => ({
      ...s,
      NormalizedMethod: this.normalizeCollectionMethod(s.SessionCollectionMethod)
    }));

    const specimensWithNormalizedMethods = this.specimens.map(sp => ({
      ...sp,
      NormalizedMethod: this.normalizeCollectionMethod(sp.SessionCollectionMethod)
    }));

    const collectionsByMethod = _.countBy(surveillanceWithNormalizedMethods, 'NormalizedMethod');
    const specimensByMethod = _.countBy(specimensWithNormalizedMethods, 'NormalizedMethod');

    const specimensPerCollection = {};
    Object.keys(collectionsByMethod).forEach(method => {
      const nCollections = collectionsByMethod[method];
      const nSpecimens = specimensByMethod[method] || 0;
      specimensPerCollection[method] = nCollections > 0 ? nSpecimens / nCollections : 0;
    });

    return {
      collectionsByMethod,
      specimensByMethod,
      specimensPerCollection
    };
  }

  /**
   * Calculate intervention metrics (LLIN & IRS)
   */
  calculateInterventionMetrics() {
    const irsCoverage = _.countBy(this.surveillance, 'WasIrsConducted');
    const irsYes = irsCoverage['Yes'] || 0;
    const irsRate = this.surveillance.length > 0 
      ? (irsYes / this.surveillance.length) * 100 
      : 0;

    const totalLlins = _.sumBy(this.surveillance, s => Number(s.NumLlinsAvailable) || 0);
    const housesWithLlins = this.surveillance.filter(s => (s.NumLlinsAvailable || 0) > 0).length;
    const avgLlinsPerHouse = this.surveillance.length > 0 
      ? totalLlins / this.surveillance.length 
      : 0;

    // Calculate LLIN usage rate
    let totalUsageRate = 0;
    let housesWithUsageData = 0;

    this.surveillance.forEach(s => {
      const peopleInHouse = Number(s.NumPeopleSleptInHouse) || 0;
      const peopleUnderLlin = Number(s.NumPeopleSleptUnderLlin) || 0;
      
      if (peopleInHouse > 0) {
        const usageRate = (peopleUnderLlin / peopleInHouse) * 100;
        totalUsageRate += usageRate;
        housesWithUsageData++;
      }
    });

    const avgLlinUsageRate = housesWithUsageData > 0 
      ? totalUsageRate / housesWithUsageData 
      : 0;

    const llinTypes = _.countBy(
      this.surveillance.filter(s => s.LlinType && s.LlinType !== 'Unknown'),
      'LlinType'
    );

    return {
      irsCoverage,
      irsRatePercent: irsRate,
      llinCoverage: {
        totalLlins,
        avgLlinsPerHouse,
        housesWithLlins
      },
      avgLlinUsageRate,
      llinTypes
    };
  }

  /**
   * Calculate blood feeding metrics
   */
  calculateBloodFeedingMetrics() {
    const feedingStatus = _.countBy(this.specimens, 'AbdomenStatus');

    const anophelesSpecimens = this.specimens.filter(s => 
      s.Species && s.Species.toLowerCase().includes('anopheles')
    );

    const anophelesFeedingStatus = _.countBy(anophelesSpecimens, 'AbdomenStatus');

    const fedCount = this.specimens.filter(s => s.IsFed).length;
    const feedingRate = this.specimens.length > 0 
      ? (fedCount / this.specimens.length) * 100 
      : 0;

    const anophelesFedCount = anophelesSpecimens.filter(s => s.IsFed).length;
    const anophelesFeedingRate = anophelesSpecimens.length > 0 
      ? (anophelesFedCount / anophelesSpecimens.length) * 100 
      : 0;

    return {
      overallFeedingStatus: feedingStatus,
      anophelesFeedingStatus,
      overallFeedingRate: feedingRate,
      anophelesFeedingRate
    };
  }

  /**
   * Calculate indoor resting density (PSC collections)
   * Uses normalized method names
   */
  calculateIndoorRestingDensity() {
    // ✅ Use normalized method name
    const pscSessions = this.surveillance.filter(s => 
      this.normalizeCollectionMethod(s.SessionCollectionMethod) === 'PSC'
    );

    if (pscSessions.length === 0) {
      return {
        pscCollections: 0,
        avgMosquitoesPerHouse: 0,
        avgAnophelesPerHouse: 0,
        anophelesProportion: 0
      };
    }

    const pscSpecimens = this.specimens.filter(sp => 
      this.normalizeCollectionMethod(sp.SessionCollectionMethod) === 'PSC'
    );

    const specimensBySession = _.groupBy(pscSpecimens, 'SessionID');

    let totalMosquitoes = 0;
    let totalAnopheles = 0;

    Object.values(specimensBySession).forEach(specimens => {
      totalMosquitoes += specimens.length;
      totalAnopheles += specimens.filter(s => 
        s.Species && s.Species.toLowerCase().includes('anopheles')
      ).length;
    });

    const anophelesProportion = totalMosquitoes > 0 
      ? (totalAnopheles / totalMosquitoes) * 100 
      : 0;

    return {
      pscCollections: pscSessions.length,
      avgMosquitoesPerHouse: pscSessions.length > 0 ? totalMosquitoes / pscSessions.length : 0,
      avgAnophelesPerHouse: pscSessions.length > 0 ? totalAnopheles / pscSessions.length : 0,
      anophelesProportion: anophelesProportion,
      totalMosquitoesCaught: totalMosquitoes,
      totalAnophelesCaught: totalAnopheles
    };
  }

  /**
   * Calculate geographic metrics
   */
  calculateGeographicMetrics() {
    const collectionsByDistrict = _.countBy(this.surveillance, 'SiteDistrict');
    const specimensByDistrict = _.countBy(this.specimens, 'SiteDistrict');

    return {
      collectionsByDistrict,
      specimensByDistrict,
      districts: Object.keys(collectionsByDistrict)
    };
  }

  /**
   * Calculate data quality metrics
   */
  calculateDataQualityMetrics() {
    const qualityFlags = _.countBy(this.surveillance, 'DataQualityFlag');
    
    const missingCollector = this.surveillance.filter(s => 
      !s.SessionCollectorName || s.SessionCollectorName === 'Unknown'
    ).length;

    const missingMethod = this.surveillance.filter(s => 
      !s.SessionCollectionMethod || s.SessionCollectionMethod === 'Unknown'
    ).length;

    const missingSpecies = this.specimens.filter(sp => 
      !sp.Species || sp.Species === 'Unknown'
    ).length;

    return {
      qualityFlags,
      missingData: {
        missingCollector,
        missingMethod,
        missingSpecies
      },
      completenessRate: this.surveillance.length > 0 
        ? ((this.surveillance.length - missingCollector - missingMethod) / this.surveillance.length) * 100 
        : 0
    };
  }
}

module.exports = MetricsCalculator;
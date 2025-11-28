/**
 * Data Processor
 * Converts Python data processing logic to JavaScript
 * Handles data cleaning, transformation, and report generation
 */

const { parseISO, format, getYear, getMonth, getQuarter } = require('date-fns');
const logger = require('../utils/logger');

class DataProcessor {
  /**
   * Clean surveillance data
   */
  cleanSurveillanceData(data) {
    logger.info(`Cleaning surveillance data: ${data.length} records`);

    return data.map(row => {
      const cleaned = { ...row };

      // Parse dates
      const dateColumns = [
        'SessionCollectionDate', 'SessionCreatedAt', 'SessionCompletedAt',
        'SessionSubmittedAt', 'SessionUpdatedAt', 'CreatedAt', 'UpdatedAt'
      ];

      dateColumns.forEach(col => {
        if (cleaned[col]) {
          try {
            cleaned[col] = parseISO(cleaned[col]).toISOString();
          } catch (e) {
            cleaned[col] = null;
          }
        }
      });

      // Handle numeric columns
      const numericColumns = [
        'NumPeopleSleptInHouse', 'MonthsSinceIrs', 'NumLlinsAvailable',
        'NumPeopleSleptUnderLlin', 'SessionID', 'SiteID', 'ProgramID', 'ID'
      ];

      numericColumns.forEach(col => {
        if (cleaned[col] !== null && cleaned[col] !== undefined && cleaned[col] !== '') {
          cleaned[col] = parseFloat(cleaned[col]) || null;
        }
      });

      // Clean Yes/No fields
      cleaned.WasIrsConducted = cleaned.WasIrsConducted || 'Unknown';

      // Fill categorical fields with 'Unknown'
      const categorical = [
        'LlinType', 'LlinBrand', 'SiteDistrict', 'SessionCollectionMethod',
        'SessionSpecimenCondition', 'ProgramCountry'
      ];

      categorical.forEach(col => {
        if (!cleaned[col] || cleaned[col] === '' || cleaned[col] === 'N/A') {
          cleaned[col] = 'Unknown';
        }
      });

      // Add derived columns with fallback date logic
      // Use DeviceRegisteredAt, SessionUpdatedAt, or SessionCreatedAt if SessionCollectionDate is missing
      let collectionDate = cleaned.SessionCollectionDate;
      
      if (!collectionDate || collectionDate === '') {
        // Try fallback dates in order of preference
        collectionDate = cleaned.DeviceRegisteredAt || 
                        cleaned.SessionUpdatedAt || 
                        cleaned.SessionCreatedAt ||
                        cleaned.SessionCompletedAt;
        
        // Update the SessionCollectionDate field with fallback
        if (collectionDate) {
          cleaned.SessionCollectionDate = collectionDate;
        }
      }
      
      if (collectionDate) {
        try {
          const date = parseISO(collectionDate);
          cleaned.CollectionYear = getYear(date);
          cleaned.CollectionMonth = getMonth(date) + 1; // JS months are 0-indexed
          cleaned.CollectionYearMonth = format(date, 'yyyy-MM');
          cleaned.CollectionQuarter = getQuarter(date);
        } catch (e) {
          // Leave as null if parsing fails
        }
      }

      // Calculate LLIN usage rate
      if (cleaned.NumPeopleSleptUnderLlin && cleaned.NumPeopleSleptInHouse && cleaned.NumPeopleSleptInHouse > 0) {
        cleaned.LlinUsageRate = (cleaned.NumPeopleSleptUnderLlin / cleaned.NumPeopleSleptInHouse) * 100;
      } else {
        cleaned.LlinUsageRate = 0;
      }

      // Data quality flag
      cleaned.DataQualityFlag = 'OK';

      // Flag suspicious data
      if (cleaned.NumPeopleSleptUnderLlin && cleaned.NumLlinsAvailable) {
        if (cleaned.NumPeopleSleptUnderLlin > cleaned.NumLlinsAvailable * 2) {
          cleaned.DataQualityFlag = 'Suspicious: More people than nets';
        }
      }

      if (cleaned.NumPeopleSleptInHouse && cleaned.NumPeopleSleptInHouse > 50) {
        cleaned.DataQualityFlag = 'Suspicious: Large household';
      }

      return cleaned;
    });
  }

  /**
   * Clean specimens data
   */
  cleanSpecimensData(data) {
    logger.info(`Cleaning specimens data: ${data.length} records`);

    return data.map(row => {
      const cleaned = { ...row };

      // Parse dates
      const dateColumns = [
        'CapturedAt', 'ImageSubmittedAt', 'ImageUpdatedAt',
        'SessionCollectionDate', 'SessionCreatedAt', 'SessionCompletedAt',
        'SessionSubmittedAt', 'SessionUpdatedAt'
      ];

      dateColumns.forEach(col => {
        if (cleaned[col]) {
          try {
            cleaned[col] = parseISO(cleaned[col]).toISOString();
          } catch (e) {
            cleaned[col] = null;
          }
        }
      });

      // Add fallback date logic for CapturedAt
      if (!cleaned.CapturedAt || cleaned.CapturedAt === '') {
        // Use SessionCollectionDate or SessionUpdatedAt as fallback
        cleaned.CapturedAt = cleaned.SessionCollectionDate || 
                             cleaned.SessionUpdatedAt || 
                             cleaned.SessionCreatedAt;
      }

      // Add derived date columns for specimens
      if (cleaned.CapturedAt) {
        try {
          const date = parseISO(cleaned.CapturedAt);
          cleaned.CaptureYear = getYear(date);
          cleaned.CaptureMonth = getMonth(date) + 1;
          cleaned.CaptureYearMonth = format(date, 'yyyy-MM');
          cleaned.CaptureQuarter = getQuarter(date);
        } catch (e) {
          // Leave as null if parsing fails
        }
      }

      // Handle numeric columns
      const numericColumns = ['SessionID', 'SiteID', 'ProgramID', 'ImageID'];
      numericColumns.forEach(col => {
        if (cleaned[col] !== null && cleaned[col] !== undefined && cleaned[col] !== '') {
          cleaned[col] = parseFloat(cleaned[col]) || null;
        }
      });

      // Clean categorical fields
      const categorical = [
        'Species', 'Sex', 'AbdomenStatus', 'SessionCollectionMethod',
        'SiteDistrict', 'ProgramCountry'
      ];

      categorical.forEach(col => {
        if (!cleaned[col] || cleaned[col] === '' || cleaned[col] === 'N/A') {
          cleaned[col] = 'Unknown';
        }
      });

      // Add derived columns
      if (cleaned.CapturedAt) {
        try {
          const date = parseISO(cleaned.CapturedAt);
          cleaned.CaptureYear = getYear(date);
          cleaned.CaptureMonth = getMonth(date) + 1;
          cleaned.CaptureYearMonth = format(date, 'yyyy-MM');
          cleaned.CaptureQuarter = getQuarter(date);
        } catch (e) {
          // Leave as null
        }
      }

      // Categorize species
      cleaned.SpeciesGroup = this.categorizeSpecies(cleaned.Species);

      // Blood-feeding status
      const fedStatuses = ['Fully Fed', 'Half Gravid', 'Gravid'];
      cleaned.IsFed = fedStatuses.includes(cleaned.AbdomenStatus);
      cleaned.IsUnfed = cleaned.AbdomenStatus === 'Unfed';

      // Data quality flag
      cleaned.DataQualityFlag = 'OK';
      if (['N/A', 'Unknown'].includes(cleaned.Species) && cleaned.Sex !== 'N/A') {
        cleaned.DataQualityFlag = 'Missing species ID';
      }

      return cleaned;
    });
  }

  /**
   * Categorize species into groups
   */
  categorizeSpecies(species) {
    if (!species || species === 'N/A' || species === 'Unknown') {
      return 'Unknown';
    }

    const speciesLower = species.toLowerCase();

    if (speciesLower.includes('gambiae')) {
      return 'Anopheles gambiae complex';
    } else if (speciesLower.includes('funestus')) {
      return 'Anopheles funestus group';
    } else if (speciesLower.includes('arabiensis')) {
      return 'Anopheles arabiensis';
    } else if (speciesLower.includes('anopheles')) {
      return 'Other Anopheles';
    } else if (speciesLower.includes('culex')) {
      return 'Culex';
    } else if (speciesLower.includes('aedes')) {
      return 'Aedes';
    } else if (speciesLower.includes('mansonia')) {
      return 'Mansonia';
    } else {
      return 'Other';
    }
  }

  /**
   * Merge surveillance and specimens data
   */
  mergeData(surveillance, specimens) {
    logger.info('Merging surveillance and specimens data...');

    // Group specimens by SessionID
    const specimensBySession = specimens.reduce((acc, specimen) => {
      const sessionId = specimen.SessionID;
      if (!acc[sessionId]) {
        acc[sessionId] = [];
      }
      acc[sessionId].push(specimen);
      return acc;
    }, {});

    // Merge
    const merged = surveillance.map(session => {
      const sessionSpecimens = specimensBySession[session.SessionID] || [];

      return {
        ...session,
        SpecimenCount: sessionSpecimens.length,
        AnophelesCount: sessionSpecimens.filter(s =>
          s.Species && s.Species.toLowerCase().includes('anopheles')
        ).length,
        Specimens: sessionSpecimens
      };
    });

    logger.info(`Merged data: ${merged.length} sessions with specimens`);
    return merged;
  }

  /**
   * Generate VectorCam report format
   * Converts data to the specific format matching VectorCam_Aug_2024_Report.csv
   */
  generateVectorCamReport(surveillance, specimens) {
    logger.info('Generating VectorCam report format...');

    // Group specimens by session
    const specimensBySession = specimens.reduce((acc, specimen) => {
      if (!acc[specimen.SessionID]) {
        acc[specimen.SessionID] = [];
      }
      acc[specimen.SessionID].push(specimen);
      return acc;
    }, {});

    const reportRows = [];

    surveillance.forEach(session => {
      const sessionSpecimens = specimensBySession[session.SessionID] || [];

      // Initialize counts
      const counts = {
        total: sessionSpecimens.length,
        totalAnopheles: 0,
        totalOtherMosquitoes: 0,
        maleAnopheles: 0,

        // Anopheles gambiae by abdomen status
        anGambiaeUF: 0, anGambiaeF: 0, anGambiaeG: 0,
        AnGambiaeMale: 0, AnGambiaeFemale: 0,

        // Anopheles funestus
        anFunestusUF: 0, anFunestusF: 0, anFunestusG: 0,
        AnFunestusMale: 0, AnFunestusFemale: 0,

        // Other Anopheles
        anOtherUF: 0, anOtherF: 0, anOtherG: 0,
        AnOtherMale: 0, AnOtherFemale: 0,

        // Other genera
        CulexUF: 0, CulexF: 0, CulexG: 0,
        culexMale: 0, culexFemale: 0,

        AedesUF: 0, AedesF: 0, AedesG: 0,
        aedesMale: 0, aedesFemale: 0,

        MansoniaUF: 0, MansoniaF: 0, MansoniaG: 0,
        mansoniaMale: 0, mansoniaFemale: 0
      };

      // Count specimens by category
      sessionSpecimens.forEach(specimen => {
        const species = (specimen.Species || '').toLowerCase();
        const sex = (specimen.Sex || '').toLowerCase();
        const abdomen = specimen.AbdomenStatus || '';

        let status = '';
        if (abdomen === 'Unfed') status = 'UF';
        else if (['Fully Fed', 'Half Gravid'].includes(abdomen)) status = 'F';
        else if (abdomen === 'Gravid') status = 'G';

        let isAnopheles = false;

        if (species.includes('gambiae')) {
          isAnopheles = true;
          counts[`anGambiae${status}`]++;
          if (sex.includes('male')) {
            counts.AnGambiaeMale++;
            counts.maleAnopheles++;
          } else if (sex.includes('female')) {
            counts.AnGambiaeFemale++;
          }
        } else if (species.includes('funestus')) {
          isAnopheles = true;
          counts[`anFunestus${status}`]++;
          if (sex.includes('male')) {
            counts.AnFunestusMale++;
            counts.maleAnopheles++;
          } else if (sex.includes('female')) {
            counts.AnFunestusFemale++;
          }
        } else if (species.includes('anopheles')) {
          isAnopheles = true;
          counts[`anOther${status}`]++;
          if (sex.includes('male')) {
            counts.AnOtherMale++;
            counts.maleAnopheles++;
          } else if (sex.includes('female')) {
            counts.AnOtherFemale++;
          }
        } else if (species.includes('culex')) {
          counts[`Culex${status}`]++;
          if (sex.includes('male')) counts.culexMale++;
          else if (sex.includes('female')) counts.culexFemale++;
        } else if (species.includes('aedes')) {
          counts[`Aedes${status}`]++;
          if (sex.includes('male')) counts.aedesMale++;
          else if (sex.includes('female')) counts.aedesFemale++;
        } else if (species.includes('mansonia')) {
          counts[`Mansonia${status}`]++;
          if (sex.includes('male')) counts.mansoniaMale++;
          else if (sex.includes('female')) counts.mansoniaFemale++;
        }

        if (isAnopheles) {
          counts.totalAnopheles++;
        } else {
          counts.totalOtherMosquitoes++;
        }
      });

      // Build report row
      reportRows.push({
        country: session.ProgramCountry || '',
        district: session.SiteDistrict || '',
        site: session.SiteID || '',
        houseNumber: session.SessionHouseNumber || session.SessionID || '',
        collectionMethod: session.SessionCollectionMethod || '',
        total: counts.total,
        totalAnopheles: counts.totalAnopheles,
        totalOtherMosquitoes: counts.totalOtherMosquitoes,
        maleAnopheles: counts.maleAnopheles,

        // Anopheles gambiae
        anGambiaeUF: counts.anGambiaeUF,
        anGambiaeF: counts.anGambiaeF,
        anGambiaeG: counts.anGambiaeG,
        AnGambiaeMale: counts.AnGambiaeMale,
        AnGambiaeFemale: counts.AnGambiaeFemale,

        // Anopheles funestus
        anFunestusUF: counts.anFunestusUF,
        anFunestusF: counts.anFunestusF,
        anFunestusG: counts.anFunestusG,
        AnFunestusMale: counts.AnFunestusMale,
        AnFunestusFemale: counts.AnFunestusFemale,

        // Other Anopheles
        anOtherUF: counts.anOtherUF,
        anOtherF: counts.anOtherF,
        anOtherG: counts.anOtherG,
        AnOtherMale: counts.AnOtherMale,
        AnOtherFemale: counts.AnOtherFemale,

        // Culex
        CulexUF: counts.CulexUF,
        CulexF: counts.CulexF,
        CulexG: counts.CulexG,
        culexMale: counts.culexMale,
        culexFemale: counts.culexFemale,

        // Aedes
        AedesUF: counts.AedesUF,
        AedesF: counts.AedesF,
        AedesG: counts.AedesG,
        aedesMale: counts.aedesMale,
        aedesFemale: counts.aedesFemale,

        // Mansonia
        MansoniaUF: counts.MansoniaUF,
        MansoniaF: counts.MansoniaF,
        MansoniaG: counts.MansoniaG,
        mansoniaMale: counts.mansoniaMale,
        mansoniaFemale: counts.mansoniaFemale,

        // House metadata
        peopleSlept: session.NumPeopleSleptInHouse || '',
        irsSprayed: session.WasIrsConducted || '',
        monthsAgo: session.MonthsSinceIrs || '',
        totalLLIN: session.NumLlinsAvailable || '',
        llinType: session.LlinType || '',
        llinBrand: session.LlinBrand || '',
        peopleSleptUnderLlin: session.NumPeopleSleptUnderLlin || '',

        // Additional fields
        name: '',
        date: session.SessionCollectionDate || '',
        'site code': session.SiteID || '',
        'health centre': session.SiteHealthCenter || '',
        parish: '',
        village: '',
        'coded house number': '',
        Latitude: '',
        Longitude: '',
        'House Type': '',
        'Title of Officer': session.SessionCollectorTitle || ''
      });
    });

    logger.info(`Generated report with ${reportRows.length} rows`);
    return reportRows;
  }
}

module.exports = new DataProcessor();
/**
 * Fetch and Process Data Script
 * Main script that orchestrates data fetching, processing, and storage
 */

const vectorcam = require('../services/vectorcam');
const s3 = require('../services/s3');
const database = require('../services/database');
const dataProcessor = require('../processors/dataProcessor');
const MetricsCalculator = require('../processors/metricsCalculator');
const completenessMetric = require('../processors/completenessMetric');
const userTracking = require('../services/userTracking');
const logger = require('../utils/logger');
const config = require('../config');
const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

class DataPipeline {
  async run() {
    const startTime = Date.now();
    logger.info('='.repeat(80));
    logger.info('🚀 Starting VectorResearch Data Pipeline');
    logger.info('='.repeat(80));

    try {
      // Step 1: Fetch data from VectorCam API
      logger.info('\n📥 STEP 1: Fetching data from VectorCam API...');
      const { surveillance: rawSurveillance, specimens: rawSpecimens } = await vectorcam.fetchAllData();

      // Step 2: Process and clean data
      logger.info('\n🧹 STEP 2: Processing and cleaning data...');
      const cleanedSurveillance = dataProcessor.cleanSurveillanceData(rawSurveillance);
      const cleanedSpecimens = dataProcessor.cleanSpecimensData(rawSpecimens);
      const mergedData = dataProcessor.mergeData(cleanedSurveillance, cleanedSpecimens);

      // Step 3: Store in database
      logger.info('\n💾 STEP 3: Storing data in database...');
      database.insertSurveillanceData(cleanedSurveillance, true);
      database.insertSpecimensData(cleanedSpecimens, true);

      // Step 4: Export CSVs locally
      logger.info('\n📄 STEP 4: Exporting CSVs locally...');
      const timestamp = new Date().toISOString().split('T')[0];
      const exportDir = path.join(__dirname, '../../data/exports');
      
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      // Export cleaned data
      const survCsvPath = path.join(exportDir, `cleaned_surveillance_${timestamp}.csv`);
      const specCsvPath = path.join(exportDir, `cleaned_specimens_${timestamp}.csv`);
      
      fs.writeFileSync(survCsvPath, Papa.unparse(cleanedSurveillance));
      fs.writeFileSync(specCsvPath, Papa.unparse(cleanedSpecimens));
      
      logger.info(`✅ Surveillance CSV: ${survCsvPath}`);
      logger.info(`✅ Specimens CSV: ${specCsvPath}`);

      // Generate and export VectorCam report format
      const reportData = dataProcessor.generateVectorCamReport(cleanedSurveillance, cleanedSpecimens);
      const reportCsvPath = path.join(exportDir, `vectorcam_report_${timestamp}.csv`);
      fs.writeFileSync(reportCsvPath, Papa.unparse(reportData));
      logger.info(`✅ Report CSV: ${reportCsvPath}`);

      // Step 5: Upload to S3 (if configured)
      if (config.aws.enabled) {
        logger.info('\n☁️  STEP 5: Uploading to AWS S3...');
        
        try {
          await s3.uploadSurveillanceData(cleanedSurveillance);
          await s3.uploadSpecimensData(cleanedSpecimens);
          await s3.uploadReport(reportData, `vectorcam_report_${timestamp}.csv`);
          
          logger.info('✅ Successfully uploaded to S3');
        } catch (error) {
          logger.error('❌ S3 upload failed:', error.message);
          logger.warn('Continuing without S3 upload...');
        }
      } else {
        logger.info('\n⏭️  STEP 5: Skipping S3 upload (not configured)');
      }

      // Step 6: Calculate metrics
      logger.info('\n📊 STEP 6: Calculating metrics...');
      const metricsCalculator = new MetricsCalculator(cleanedSurveillance, cleanedSpecimens);
      const metrics = metricsCalculator.calculateAllMetrics();

      // Store metrics in database
      const yearMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

      // Store summary metrics
      Object.entries(metrics.summary).forEach(([key, value]) => {
        if (typeof value === 'number') {
          database.insertMetric(yearMonth, key, value, null, 'summary');
        } else {
          database.insertMetric(yearMonth, key, 0, JSON.stringify(value), 'summary');
        }
      });

      // Store key metrics
      if (metrics.interventions) {
        database.insertMetric(yearMonth, 'irs_rate', metrics.interventions.irsRatePercent, null, 'interventions');
        database.insertMetric(yearMonth, 'llin_usage_rate', metrics.interventions.avgLlinUsageRate, null, 'interventions');
      }

      if (metrics.indoorDensity) {
        database.insertMetric(yearMonth, 'avg_mosquitoes_per_house', metrics.indoorDensity.avgMosquitoesPerHouse, null, 'density');
        database.insertMetric(yearMonth, 'avg_anopheles_per_house', metrics.indoorDensity.avgAnophelesPerHouse, null, 'density');
      }

      logger.info('✅ Metrics calculated and stored');

      // Step 7: Calculate completeness metrics
      logger.info('\n✅ STEP 7: Calculating completeness metrics...');
      const completeness = completenessMetric.calculateOverallCompleteness(yearMonth);
      
      // Store completeness metrics
      database.insertMetric(yearMonth, 'completeness_submission_rate', completeness.submissionRate, null, 'completeness');
      database.insertMetric(yearMonth, 'completeness_rate', completeness.completenessRate, null, 'completeness');
      database.insertMetric(yearMonth, 'completeness_details', 0, JSON.stringify(completeness), 'completeness');

      logger.info(`✅ Overall completeness: ${completeness.completenessRate.toFixed(1)}%`);

      // Step 8: Update user tracking
      logger.info('\n👥 STEP 8: Updating user tracking...');
      userTracking.initialize();

      // Summary
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info('\n' + '='.repeat(80));
      logger.info('✅ Pipeline completed successfully!');
      logger.info(`⏱️  Duration: ${duration} seconds`);
      logger.info(`📊 Surveillance records: ${cleanedSurveillance.length}`);
      logger.info(`🦟 Specimen records: ${cleanedSpecimens.length}`);
      logger.info(`✅ Completeness rate: ${completeness.completenessRate.toFixed(1)}%`);
      logger.info('='.repeat(80));

      return {
        success: true,
        stats: {
          surveillanceRecords: cleanedSurveillance.length,
          specimenRecords: cleanedSpecimens.length,
          completenessRate: completeness.completenessRate,
          duration: duration
        }
      };

    } catch (error) {
      logger.error('='.repeat(80));
      logger.error('❌ Pipeline failed!');
      logger.error(`Error: ${error.message}`);
      logger.error('='.repeat(80));
      logger.error(error.stack);

      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Main function to fetch and process data
 */
async function fetchAndProcessData() {
  const pipeline = new DataPipeline();
  return await pipeline.run();
}

// If run directly
if (require.main === module) {
  fetchAndProcessData()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { fetchAndProcessData, DataPipeline };

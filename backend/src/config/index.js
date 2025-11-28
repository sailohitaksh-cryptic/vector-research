/**
 * Backend Configuration
 * Loads environment variables and exports configuration
 */

require('dotenv').config();
const path = require('path');

const config = {
  // Server
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // VectorCam API
  vectorcam: {
    baseUrl: process.env.VECTORCAM_API_URL || 'https://test.api.vectorcam.org',
    apiSecretKey: process.env.API_SECRET_KEY || process.env.VECTORCAM_API_SECRET,
    email: process.env.VECTORCAM_API_EMAIL,
    password: process.env.VECTORCAM_API_PASSWORD,
    endpoints: {
      surveillance: '/sessions/export/surveillance-forms/csv',
      specimens: '/specimens/export/csv',
      login: '/auth/login'
    }
  },

  // AWS S3 (Optional - system works without it)
  aws: {
    enabled: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET_NAME),
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3: {
      bucket: process.env.S3_BUCKET_NAME,
      folders: {
        raw: 'raw/',
        processed: 'processed/',
        reports: 'reports/'
      }
    }
  },

  // Database
  database: {
    path: process.env.DATABASE_PATH || path.join(__dirname, '../../data/vectorinsight.db'),
    backup: true
  },

  // Data Processing
  processing: {
    batchSize: 1000,
    maxRetries: 3,
    retryDelay: 5000 // ms
  },

  // Cron Schedule (daily at 2 AM UTC)
  cronSchedule: process.env.CRON_SCHEDULE || '0 2 * * *',

  // Completeness Metric Configuration
  completeness: {
    requiredFields: {
      session: [
        'collectorName',
        'collectionDate',
        'collectionMethod'
      ],
      surveillance: [
        'numPeopleSleptInHouse',
        'wasIrsConducted',
        'numLlinsAvailable'
      ],
      specimens: {
        minCount: 0, // Minimum specimens per session (0 = optional)
        requireImages: false
      }
    },
    // This can be updated later based on MEL metrics
    fieldWeights: {
      collectorName: 1.0,
      collectionDate: 1.0,
      collectionMethod: 1.0,
      numPeopleSleptInHouse: 1.0,
      wasIrsConducted: 0.8,
      numLlinsAvailable: 0.8
    }
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: path.join(__dirname, '../../logs')
  }
};

// Validation
function validateConfig() {
  const required = [
    { 
      key: 'vectorcam.auth', 
      value: config.vectorcam.apiSecretKey || (config.vectorcam.email && config.vectorcam.password),
      name: 'API_SECRET_KEY or (VECTORCAM_API_EMAIL + VECTORCAM_API_PASSWORD)' 
    }
  ];

  const missing = required.filter(item => !item.value);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(item => console.error(`   - ${item.name}`));
    console.error('\nThe application cannot start without these credentials.');
    process.exit(1);
  }

  // Optional AWS S3 - warn if not configured
  if (!config.aws.enabled) {
    console.warn('⚠️  AWS S3 is not ss configured - CSV exports will only be stored locally');
    console.warn('   To enable S3: Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME');
  } else {
    console.log('✅ AWS S3 is configured and enabled');
  }
}

validateConfig();

module.exports = config;

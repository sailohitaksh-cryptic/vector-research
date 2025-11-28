/**
 * Main Express Server
 * Handles API routes and server initialization
 */

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const config = require('./config');
const logger = require('./utils/logger');
const cron = require('node-cron');

// Import routes
const surveillanceRoutes = require('./routes/surveillance');
const specimensRoutes = require('./routes/specimens');
const metricsRoutes = require('./routes/metrics');
const collectorsRoutes = require('./routes/collectors');
const dataRoutes = require('./routes/data');
const exportRoutes = require('./routes/export');

// Import services
const { fetchAndProcessData } = require('./scripts/fetchData');

const app = express();

// Middleware
app.use(helmet());
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://vectorresearch-dashboard.vercel.app',
    'https://*.vercel.app'  // Allows Vercel preview deployments
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition']
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// API Routes
app.use('/api/surveillance', surveillanceRoutes);
app.use('/api/specimens', specimensRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/collectors', collectorsRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/export', exportRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      status: 404
    }
  });
});

// Schedule daily data fetch (2 AM UTC)
if (config.nodeEnv === 'production') {
  cron.schedule(config.cronSchedule, async () => {
    logger.info('🕐 Starting scheduled data fetch...');
    try {
      await fetchAndProcessData();
      logger.info('✅ Scheduled data fetch completed');
    } catch (error) {
      logger.error('❌ Scheduled data fetch failed:', error);
    }
  });
  logger.info(`⏰ Cron job scheduled: ${config.cronSchedule}`);
}

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${config.nodeEnv}`);
  logger.info(`🗄️  Database: ${config.database.path}`);
});

module.exports = app;

/**
 * VectorCam API Service
 * Handles authentication and data fetching from VectorCam API
 */

const axios = require('axios');
const Papa = require('papaparse');
const config = require('../config');
const logger = require('../utils/logger');

class VectorCamService {
  constructor() {
    this.baseURL = config.vectorcam.baseUrl;
    this.apiSecretKey = config.vectorcam.apiSecretKey;
    this.email = config.vectorcam.email;
    this.password = config.vectorcam.password;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Authenticate with VectorCam API and get access token
   * Supports both Bearer token and email/password auth
   */
  async authenticate() {
    // If API_SECRET_KEY is provided, use it directly (no need to authenticate)
    if (this.apiSecretKey) {
      logger.info('🔐 Using provided API Secret Key...');
      this.accessToken = this.apiSecretKey;
      this.tokenExpiry = Date.now() + (365 * 24 * 60 * 60 * 1000); // 1 year
      logger.info('✅ API Key configured');
      return this.accessToken;
    }

    // Otherwise, authenticate with email/password
    try {
      logger.info('🔐 Authenticating with VectorCam API using email/password...');

      const response = await axios.post(
        `${this.baseURL}${config.vectorcam.endpoints.login}`,
        {
          email: this.email,
          password: this.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.tokens && response.data.tokens.accessToken) {
        this.accessToken = response.data.tokens.accessToken;
        // Tokens typically expire in 1 hour, set expiry to 50 minutes to be safe
        this.tokenExpiry = Date.now() + (50 * 60 * 1000);
        logger.info('✅ Authentication successful');
        return this.accessToken;
      } else {
        throw new Error('No access token in response');
      }
    } catch (error) {
      logger.error('❌ Authentication failed:', error.message);
      throw new Error(`VectorCam authentication failed: ${error.message}`);
    }
  }

  /**
   * Ensure we have a valid token
   */
  async ensureAuthenticated() {
    if (!this.accessToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  /**
   * Fetch CSV data from an endpoint
   */
  async fetchCSV(endpoint, dataType) {
    try {
      await this.ensureAuthenticated();

      logger.info(`📥 Fetching ${dataType} data from ${endpoint}...`);

      const response = await axios.get(
        `${this.baseURL}${endpoint}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'text/csv'
          },
          timeout: 120000 // 2 minutes timeout
        }
      );

      if (!response.data) {
        throw new Error('No data received from API');
      }

      // Parse CSV to JSON
      const parsed = Papa.parse(response.data, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false, // Keep strings as-is, don't auto-convert types
        transformHeader: (header) => header.trim()
      });

      if (parsed.errors && parsed.errors.length > 0) {
        logger.warn(`⚠️  CSV parsing warnings for ${dataType}:`, parsed.errors);
      }

      logger.info(`✅ Fetched ${parsed.data.length} rows of ${dataType} data`);
      return parsed.data;
    } catch (error) {
      logger.error(`❌ Failed to fetch ${dataType} data:`, error.message);
      throw new Error(`Failed to fetch ${dataType} data: ${error.message}`);
    }
  }

  /**
   * Fetch surveillance data
   */
  async fetchSurveillanceData() {
    return await this.fetchCSV(
      config.vectorcam.endpoints.surveillance,
      'surveillance'
    );
  }

  /**
   * Fetch specimens data
   */
  async fetchSpecimensData() {
    return await this.fetchCSV(
      config.vectorcam.endpoints.specimens,
      'specimens'
    );
  }

  /**
   * Fetch all data (surveillance + specimens)
   */
  async fetchAllData() {
    try {
      logger.info('📊 Fetching all data from VectorCam API...');

      const [surveillance, specimens] = await Promise.all([
        this.fetchSurveillanceData(),
        this.fetchSpecimensData()
      ]);

      logger.info('✅ All data fetched successfully');
      return { surveillance, specimens };
    } catch (error) {
      logger.error('❌ Failed to fetch all data:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new VectorCamService();
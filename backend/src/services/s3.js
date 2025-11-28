/**
 * AWS S3 Service
 * Handles uploading and downloading files to/from S3
 */

const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const Papa = require('papaparse');
const config = require('../config');
const logger = require('../utils/logger');

class S3Service {
  constructor() {
    this.client = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey
      }
    });
    this.bucket = config.aws.s3.bucket;
  }

  /**
   * Upload CSV data to S3
   */
  async uploadCSV(data, key, folder = 'raw') {
    try {
      logger.info(`☁️  Uploading to S3: ${folder}${key}`);

      // Convert JSON to CSV
      const csv = Papa.unparse(data);

      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: `${config.aws.s3.folders[folder]}${key}`,
          Body: csv,
          ContentType: 'text/csv',
          Metadata: {
            uploadedAt: new Date().toISOString(),
            recordCount: data.length.toString()
          }
        }
      });

      await upload.done();
      logger.info(`✅ Successfully uploaded to S3: ${folder}/${key}`);

      return {
        bucket: this.bucket,
        key: `${config.aws.s3.folders[folder]}${key}`,
        url: `https://${this.bucket}.s3.${config.aws.region}.amazonaws.com/${config.aws.s3.folders[folder]}${key}`
      };
    } catch (error) {
      logger.error(`❌ Failed to upload to S3:`, error.message);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Download CSV from S3 and parse to JSON
   */
  async downloadCSV(key, folder = 'raw') {
    try {
      logger.info(`☁️  Downloading from S3: ${folder}${key}`);

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: `${config.aws.s3.folders[folder]}${key}`
      });

      const response = await this.client.send(command);

      // Convert stream to string
      const streamToString = (stream) =>
        new Promise((resolve, reject) => {
          const chunks = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        });

      const csvString = await streamToString(response.Body);

      // Parse CSV to JSON
      const parsed = Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
      });

      logger.info(`✅ Downloaded ${parsed.data.length} rows from S3`);
      return parsed.data;
    } catch (error) {
      logger.error(`❌ Failed to download from S3:`, error.message);
      throw new Error(`S3 download failed: ${error.message}`);
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folder = 'raw') {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: config.aws.s3.folders[folder]
      });

      const response = await this.client.send(command);

      return response.Contents?.map(item => ({
        key: item.Key,
        size: item.Size,
        lastModified: item.LastModified
      })) || [];
    } catch (error) {
      logger.error(`❌ Failed to list S3 files:`, error.message);
      throw new Error(`S3 list failed: ${error.message}`);
    }
  }

  /**
   * Upload surveillance data with timestamp
   */
  async uploadSurveillanceData(data) {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return await this.uploadCSV(data, `surveillance_${timestamp}.csv`, 'raw');
  }

  /**
   * Upload specimens data with timestamp
   */
  async uploadSpecimensData(data) {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return await this.uploadCSV(data, `specimens_${timestamp}.csv`, 'raw');
  }

  /**
   * Upload processed/cleaned data
   */
  async uploadProcessedData(data, filename) {
    return await this.uploadCSV(data, filename, 'processed');
  }

  /**
   * Upload report CSV
   */
  async uploadReport(data, filename) {
    return await this.uploadCSV(data, filename, 'reports');
  }
}

// Export singleton instance
module.exports = new S3Service();

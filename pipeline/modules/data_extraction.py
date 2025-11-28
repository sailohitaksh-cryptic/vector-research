"""
Data Extraction Module
Handles API calls to VectorCam backend
"""
import requests
import pandas as pd
from datetime import datetime
from pathlib import Path
import logging
from typing import Tuple, Optional

import config

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(config.LOGS_DIR / 'pipeline.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class DataExtractor:
    """Handles data extraction from VectorCam API"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize DataExtractor
        
        Args:
            api_key: API secret key. If None, uses config.API_SECRET_KEY
        """
        self.api_key = api_key or config.API_SECRET_KEY
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Accept': 'text/csv'
        }
        
    def _fetch_csv(self, endpoint: str, data_type: str) -> Optional[pd.DataFrame]:
        """
        Fetch CSV data from API endpoint
        
        Args:
            endpoint: API endpoint URL
            data_type: Type of data being fetched (for logging)
            
        Returns:
            DataFrame with fetched data or None if error
        """
        try:
            logger.info(f"Fetching {data_type} data from {endpoint}")
            response = requests.get(endpoint, headers=self.headers, timeout=120)
            response.raise_for_status()
            
            # Parse CSV into DataFrame
            from io import StringIO
            df = pd.read_csv(StringIO(response.text))
            
            logger.info(f"Successfully fetched {len(df)} rows of {data_type} data")
            return df
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch {data_type} data: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error parsing {data_type} data: {str(e)}")
            return None
    
    def fetch_surveillance_data(self) -> Optional[pd.DataFrame]:
        """
        Fetch surveillance/session data
        
        Returns:
            DataFrame with surveillance data or None if error
        """
        return self._fetch_csv(config.SURVEILLANCE_ENDPOINT, "surveillance")
    
    def fetch_specimens_data(self) -> Optional[pd.DataFrame]:
        """
        Fetch specimens data
        
        Returns:
            DataFrame with specimens data or None if error
        """
        return self._fetch_csv(config.SPECIMENS_ENDPOINT, "specimens")
    
    def fetch_all_data(self) -> Tuple[Optional[pd.DataFrame], Optional[pd.DataFrame]]:
        """
        Fetch both surveillance and specimens data
        
        Returns:
            Tuple of (surveillance_df, specimens_df)
        """
        surveillance_df = self.fetch_surveillance_data()
        specimens_df = self.fetch_specimens_data()
        
        return surveillance_df, specimens_df
    
    def save_raw_data(self, 
                      surveillance_df: pd.DataFrame, 
                      specimens_df: pd.DataFrame,
                      timestamp: Optional[str] = None) -> Tuple[Path, Path]:
        """
        Save raw data as Parquet files with timestamp
        
        Args:
            surveillance_df: Surveillance data
            specimens_df: Specimens data
            timestamp: Optional timestamp string. If None, uses current time
            
        Returns:
            Tuple of (surveillance_path, specimens_path)
        """
        if timestamp is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Create monthly snapshot naming (YYYY_MM format)
        year_month = datetime.now().strftime('%Y_%m')
        
        surveillance_path = config.RAW_DATA_DIR / f"surveillance_{year_month}.parquet"
        specimens_path = config.RAW_DATA_DIR / f"specimens_{year_month}.parquet"
        
        # Save as Parquet (more efficient than CSV)
        surveillance_df.to_parquet(surveillance_path, index=False)
        specimens_df.to_parquet(specimens_path, index=False)
        
        logger.info(f"Saved raw surveillance data to {surveillance_path}")
        logger.info(f"Saved raw specimens data to {specimens_path}")
        
        # Also save timestamped backup
        backup_surveillance = config.RAW_DATA_DIR / f"surveillance_{timestamp}.parquet"
        backup_specimens = config.RAW_DATA_DIR / f"specimens_{timestamp}.parquet"
        
        surveillance_df.to_parquet(backup_surveillance, index=False)
        specimens_df.to_parquet(backup_specimens, index=False)
        
        logger.info(f"Saved backup files with timestamp {timestamp}")
        
        return surveillance_path, specimens_path


def extract_data(save_raw: bool = True) -> Tuple[Optional[pd.DataFrame], Optional[pd.DataFrame]]:
    """
    Main function to extract data from API
    
    Args:
        save_raw: Whether to save raw data files
        
    Returns:
        Tuple of (surveillance_df, specimens_df)
    """
    extractor = DataExtractor()
    surveillance_df, specimens_df = extractor.fetch_all_data()
    
    if surveillance_df is not None and specimens_df is not None:
        if save_raw:
            extractor.save_raw_data(surveillance_df, specimens_df)
    
    return surveillance_df, specimens_df


if __name__ == "__main__":
    # Test the extraction
    logger.info("Starting data extraction test...")
    surveillance, specimens = extract_data(save_raw=True)
    
    if surveillance is not None and specimens is not None:
        logger.info(f"Extraction successful!")
        logger.info(f"Surveillance records: {len(surveillance)}")
        logger.info(f"Specimens records: {len(specimens)}")
    else:
        logger.error("Extraction failed!")

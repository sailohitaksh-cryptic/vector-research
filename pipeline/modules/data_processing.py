"""
Data Processing Module
Handles data cleaning, transformation, and preparation
"""
import pandas as pd
import numpy as np
from datetime import datetime
import logging
from typing import Tuple
from pathlib import Path

# Import config for paths
import sys
sys.path.append(str(Path(__file__).parent.parent))
import config

logger = logging.getLogger(__name__)


class DataProcessor:
    """Processes and cleans raw surveillance and specimen data"""
    
    def __init__(self):
        """Initialize DataProcessor"""
        self.exports_dir = config.EXPORTS_DIR  # ✅ Use config path
    
    def clean_surveillance_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean and process surveillance data
        
        Args:
            df: Raw surveillance DataFrame
            
        Returns:
            Cleaned DataFrame
        """
        logger.info(f"Cleaning surveillance data: {len(df)} records")
        
        # Make a copy to avoid modifying original
        df = df.copy()
        
        # Convert date columns to datetime
        date_columns = [
            'SessionCollectionDate', 'SessionCreatedAt', 'SessionCompletedAt',
            'SessionSubmittedAt', 'SessionUpdatedAt', 'CreatedAt', 'UpdatedAt'
        ]
        
        for col in date_columns:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors='coerce')
        
        # Handle numeric columns
        numeric_columns = [
            'NumPeopleSleptInHouse', 'MonthsSinceIrs', 'NumLlinsAvailable',
            'NumPeopleSleptUnderLlin', 'SessionID', 'SiteID', 'ProgramID', 'ID'
        ]
        
        for col in numeric_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Clean Yes/No fields
        if 'WasIrsConducted' in df.columns:
            df['WasIrsConducted'] = df['WasIrsConducted'].fillna('Unknown')
        
        # Handle N/A values in categorical columns
        categorical_columns = [
            'LlinType', 'LlinBrand', 'SiteDistrict', 'SessionCollectionMethod',
            'SessionSpecimenCondition', 'ProgramCountry'
        ]
        
        for col in categorical_columns:
            if col in df.columns:
                df[col] = df[col].fillna('Unknown')
        
        # Add derived columns
        if 'SessionCollectionDate' in df.columns:
            df['CollectionYear'] = df['SessionCollectionDate'].dt.year
            df['CollectionMonth'] = df['SessionCollectionDate'].dt.month
            df['CollectionYearMonth'] = df['SessionCollectionDate'].dt.strftime('%Y-%m')
            df['CollectionQuarter'] = df['SessionCollectionDate'].dt.quarter
        
        # Calculate LLIN usage rate (percentage of people using nets)
        if 'NumPeopleSleptUnderLlin' in df.columns and 'NumPeopleSleptInHouse' in df.columns:
            df['LlinUsageRate'] = (
                df['NumPeopleSleptUnderLlin'] / df['NumPeopleSleptInHouse'] * 100
            ).fillna(0)
        
        # Flag data quality issues
        df['DataQualityFlag'] = 'OK'
        
        # Flag if people slept under more nets than available
        if 'NumPeopleSleptUnderLlin' in df.columns and 'NumLlinsAvailable' in df.columns:
            mask = (df['NumPeopleSleptUnderLlin'] > df['NumLlinsAvailable'] * 2)
            df.loc[mask, 'DataQualityFlag'] = 'Suspicious: More people than nets'
        
        # Flag unusual household sizes
        if 'NumPeopleSleptInHouse' in df.columns:
            mask = (df['NumPeopleSleptInHouse'] > 50)
            df.loc[mask, 'DataQualityFlag'] = 'Suspicious: Large household'
        
        logger.info(f"Cleaned surveillance data: {len(df)} records")
        logger.info(f"Data quality flags: {df['DataQualityFlag'].value_counts().to_dict()}")
        
        return df
    
    def clean_specimens_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and process specimens data"""
        logger.info(f"Cleaning specimens data: {len(df)} records")
        
        # Make a copy
        df = df.copy()

        # ✅ FIXED - Normalize species names
        if 'Species' in df.columns:
            # Convert to string and strip whitespace
            df['Species'] = df['Species'].astype(str).str.strip()
            
            # Normalize common variations
            species_mapping = {
                # Non-mosquito variations
                'non-mosquito': 'Non-Mosquito',
                'non mosquito': 'Non-Mosquito',
                'Non mosquito': 'Non-Mosquito',
                'non-Mosquito': 'Non-Mosquito',
                'NON-MOSQUITO': 'Non-Mosquito',
                'NON MOSQUITO': 'Non-Mosquito',
                
                # Unknown variations
                'unknown': 'Unknown',
                'Unknown ': 'Unknown',
                ' Unknown': 'Unknown',
                'UNKNOWN': 'Unknown',
                
                # Anopheles variations
                'anopheles gambiae': 'Anopheles gambiae',
                'Anopheles Gambiae': 'Anopheles gambiae',
                'ANOPHELES GAMBIAE': 'Anopheles gambiae',
                
                'anopheles funestus': 'Anopheles funestus',
                'Anopheles Funestus': 'Anopheles funestus',
                'ANOPHELES FUNESTUS': 'Anopheles funestus',
                
                'anopheles other': 'Anopheles other',
                'Anopheles Other': 'Anopheles other',
                'ANOPHELES OTHER': 'Anopheles other',
                
                # Culex variations
                'culex': 'Culex',
                'CULEX': 'Culex',
                'Culex ': 'Culex',
                
                # Mansonia variations
                'mansonia': 'Mansonia',
                'MANSONIA': 'Mansonia',
                'Mansonia ': 'Mansonia',
                
                # Aedes variations
                'aedes': 'Aedes',
                'AEDES': 'Aedes',
                'Aedes ': 'Aedes',
            }
            
            # Apply mapping
            df['Species'] = df['Species'].replace(species_mapping)
            
            # Replace empty strings and 'nan' with 'Unknown'
            df.loc[df['Species'].isin(['', 'nan', 'None', 'null']), 'Species'] = 'Unknown'
        
        # Convert date columns to datetime
        date_columns = [
            'CapturedAt', 'ImageSubmittedAt', 'ImageUpdatedAt',
            'SessionCollectionDate', 'SessionCreatedAt', 'SessionCompletedAt',
            'SessionSubmittedAt', 'SessionUpdatedAt'
        ]
        
        for col in date_columns:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors='coerce')
        
        # Handle numeric columns
        numeric_columns = ['SessionID', 'SiteID', 'ProgramID', 'ImageID']
        
        for col in numeric_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Clean categorical fields
        categorical_columns = [
            'Species', 'Sex', 'AbdomenStatus', 'SessionCollectionMethod',
            'SiteDistrict', 'ProgramCountry'
        ]
        
        for col in categorical_columns:
            if col in df.columns:
                df[col] = df[col].fillna('Unknown')
        
        # Add derived columns
        if 'CapturedAt' in df.columns:
            df['CaptureYear'] = df['CapturedAt'].dt.year
            df['CaptureMonth'] = df['CapturedAt'].dt.month
            df['CaptureYearMonth'] = df['CapturedAt'].dt.strftime('%Y-%m')
            df['CaptureQuarter'] = df['CapturedAt'].dt.quarter
        
        # Create species groups
        if 'Species' in df.columns:
            df['SpeciesGroup'] = df['Species'].apply(self._categorize_species)
        
        # Create blood-feeding status flag
        if 'AbdomenStatus' in df.columns:
            df['IsFed'] = df['AbdomenStatus'].isin(['Fully Fed', 'Half Gravid', 'Gravid'])
            df['IsUnfed'] = df['AbdomenStatus'] == 'Unfed'
        
        # Flag quality issues
        df['DataQualityFlag'] = 'OK'
        
        # Flag if species is N/A but should be identified
        mask = (df['Species'].isin(['N/A', 'Unknown'])) & (df['Sex'] != 'N/A')
        df.loc[mask, 'DataQualityFlag'] = 'Missing species ID'
        
        logger.info(f"Cleaned specimens data: {len(df)} records")
        logger.info(f"Species distribution: {df['Species'].value_counts().head(10).to_dict()}")
        
        return df
    
    def _categorize_species(self, species: str) -> str:
        """Categorize species into broader groups"""
        if pd.isna(species) or species in ['N/A', 'Unknown']:
            return 'Unknown'
        
        species_lower = str(species).lower()
        
        if 'gambiae' in species_lower:
            return 'Anopheles gambiae complex'
        elif 'funestus' in species_lower:
            return 'Anopheles funestus group'
        elif 'arabiensis' in species_lower:
            return 'Anopheles arabiensis'
        elif 'anopheles' in species_lower:
            return 'Other Anopheles'
        elif 'culex' in species_lower:
            return 'Culex (nuisance)'
        elif 'aedes' in species_lower:
            return 'Aedes (arbovirus vector)'
        elif 'non-mosquito' in species_lower or 'non mosquito' in species_lower:
            return 'Non-mosquito'
        else:
            return 'Other'
    
    def merge_data(self, surveillance_df: pd.DataFrame, 
                   specimens_df: pd.DataFrame) -> pd.DataFrame:
        """Merge surveillance and specimens data"""
        logger.info("Merging surveillance and specimens data")
        
        # Select key columns from surveillance for merging
        session_cols = [
            'SessionID', 'SessionCollectionMethod', 'SessionCollectionDate',
            'NumPeopleSleptInHouse', 'SiteDistrict', 'ProgramCountry',
            'WasIrsConducted', 'NumLlinsAvailable', 'LlinUsageRate'
        ]
        
        # Filter to columns that exist
        session_cols = [col for col in session_cols if col in surveillance_df.columns]
        
        # Merge on SessionID
        merged_df = specimens_df.merge(
            surveillance_df[session_cols],
            on='SessionID',
            how='left',
            suffixes=('', '_session')
        )
        
        logger.info(f"Merged data: {len(merged_df)} records")
        
        return merged_df
    
    def export_to_csv(self, surveillance_df: pd.DataFrame, specimens_df: pd.DataFrame, 
                     output_dir: str = None) -> Tuple[str, str]:
        """
        Export cleaned data to CSV files
        
        Args:
            surveillance_df: Cleaned surveillance DataFrame
            specimens_df: Cleaned specimens DataFrame  
            output_dir: Directory to save CSV files (uses config.EXPORTS_DIR if None)
            
        Returns:
            Tuple of (surveillance_filepath, specimens_filepath)
        """
        # Use config exports directory if not specified
        if output_dir is None:
            output_dir = str(self.exports_dir)
        
        # Create exports directory if it doesn't exist
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        # ✅ FIXED: Use format YYYY-MM-DD instead of YYYYMMDD
        timestamp = datetime.now().strftime('%Y-%m-%d')
        
        # Export clean CSVs
        surveillance_file = str(Path(output_dir) / f'cleaned_surveillance_{timestamp}.csv')
        specimens_file = str(Path(output_dir) / f'cleaned_specimens_{timestamp}.csv')
        
        surveillance_df.to_csv(surveillance_file, index=False)
        specimens_df.to_csv(specimens_file, index=False)
        
        logger.info(f"Exported clean surveillance CSV: {surveillance_file}")
        logger.info(f"Exported clean specimens CSV: {specimens_file}")
        
        return surveillance_file, specimens_file
    
    def export_report_format(self, surveillance_df: pd.DataFrame, 
                           specimens_df: pd.DataFrame,
                           output_dir: str = None) -> str:
        """
        Export data in VectorCam report format (house-by-house with counts)
        
        Args:
            surveillance_df: Cleaned surveillance data
            specimens_df: Cleaned specimens data
            output_dir: Output directory (uses config.EXPORTS_DIR if None)
            
        Returns:
            Path to exported report file
        """
        # Use config exports directory if not specified
        if output_dir is None:
            output_dir = str(self.exports_dir)
        
        # Create exports directory if it doesn't exist
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        logger.info("Generating VectorCam report format")
        
        # Match column names from surveillance data
        country_col = 'ProgramCountry' if 'ProgramCountry' in surveillance_df.columns else None
        district_col = 'SiteDistrict' if 'SiteDistrict' in surveillance_df.columns else None
        method_col = 'SessionCollectionMethod' if 'SessionCollectionMethod' in surveillance_df.columns else None
        date_col = 'SessionCollectionDate' if 'SessionCollectionDate' in surveillance_df.columns else None
        
        report_rows = []
        
        # Group by SessionID to get per-house data
        for session_id in surveillance_df['SessionID'].unique():
            # Get session info
            session_info = surveillance_df[surveillance_df['SessionID'] == session_id].iloc[0]
            
            # Get specimens for this session
            session_specimens = specimens_df[specimens_df['SessionID'] == session_id]
            
            # Initialize counters
            counts = {
                'total': 0,
                'totalAnopheles': 0,
                'totalOtherMosquitoes': 0,
                'maleAnopheles': 0,
                # Anopheles gambiae by status
                'anGambiaeUF': 0, 'anGambiaeF': 0, 'anGambiaeG': 0,
                'AnGambiaeMale': 0, 'AnGambiaeFemale': 0,
                # Anopheles funestus by status  
                'anFunestusUF': 0, 'anFunestusF': 0, 'anFunestusG': 0,
                'AnFunestusMale': 0, 'AnFunestusFemale': 0,
                # Other Anopheles by status
                'anOtherUF': 0, 'anOtherF': 0, 'anOtherG': 0,
                'AnOtherMale': 0, 'AnOtherFemale': 0,
                # Culex
                'CulexUF': 0, 'CulexF': 0, 'CulexG': 0,
                'culexMale': 0, 'culexFemale': 0,
                # Aedes
                'AedesUF': 0, 'AedesF': 0, 'AedesG': 0,
                'aedesMale': 0, 'aedesFemale': 0,
                # Mansonia
                'MansoniaUF': 0, 'MansoniaF': 0, 'MansoniaG': 0,
                'mansoniaMale': 0, 'mansoniaFemale': 0,
            }
            
            # Count specimens by species, sex, and status
            for _, specimen in session_specimens.iterrows():
                counts['total'] += 1
                
                species = str(specimen.get('Species', '')).lower()
                sex = str(specimen.get('Sex', '')).lower()
                abdomen = str(specimen.get('AbdomenStatus', '')).lower()
                
                # Determine feeding status suffix
                if 'unfed' in abdomen:
                    status = 'UF'
                elif 'fed' in abdomen or 'blood' in abdomen:
                    status = 'F'
                elif 'gravid' in abdomen:
                    status = 'G'
                else:
                    status = 'UF'  # default
                
                is_anopheles = False
                
                # Count by species and status
                if 'gambiae' in species:
                    is_anopheles = True
                    counts[f'anGambiae{status}'] += 1
                    if 'male' in sex:
                        counts['AnGambiaeMale'] += 1
                        counts['maleAnopheles'] += 1
                    elif 'female' in sex:
                        counts['AnGambiaeFemale'] += 1
                        
                elif 'funestus' in species:
                    is_anopheles = True
                    counts[f'anFunestus{status}'] += 1
                    if 'male' in sex:
                        counts['AnFunestusMale'] += 1
                        counts['maleAnopheles'] += 1
                    elif 'female' in sex:
                        counts['AnFunestusFemale'] += 1
                        
                elif 'anopheles' in species:
                    is_anopheles = True
                    counts[f'anOther{status}'] += 1
                    if 'male' in sex:
                        counts['AnOtherMale'] += 1
                        counts['maleAnopheles'] += 1
                    elif 'female' in sex:
                        counts['AnOtherFemale'] += 1
                        
                elif 'culex' in species:
                    counts[f'Culex{status}'] += 1
                    if 'male' in sex:
                        counts['culexMale'] += 1
                    elif 'female' in sex:
                        counts['culexFemale'] += 1
                        
                elif 'aedes' in species:
                    counts[f'Aedes{status}'] += 1
                    if 'male' in sex:
                        counts['aedesMale'] += 1
                    elif 'female' in sex:
                        counts['aedesFemale'] += 1
                        
                elif 'mansonia' in species:
                    counts[f'Mansonia{status}'] += 1
                    if 'male' in sex:
                        counts['mansoniaMale'] += 1
                    elif 'female' in sex:
                        counts['mansoniaFemale'] += 1
                
                # Update totals
                if is_anopheles:
                    counts['totalAnopheles'] += 1
                else:
                    counts['totalOtherMosquitoes'] += 1
            
            # Build row
            row = {
                'country': session_info.get(country_col, '') if country_col and country_col in session_info.index else '',
                'district': session_info.get(district_col, '') if district_col and district_col in session_info.index else '',
                'site': session_info.get('SiteID', '') if 'SiteID' in session_info.index else '',
                'houseNumber': session_info.get('SessionHouseNumber', session_id) if 'SessionHouseNumber' in session_info.index else session_id,
                'collectionMethod': session_info.get(method_col, '') if method_col and method_col in session_info.index else '',
                'date': session_info.get(date_col, '') if date_col and date_col in session_info.index else '',
                
                # Counts
                'total': counts['total'],
                'totalAnopheles': counts['totalAnopheles'],
                'totalOtherMosquitoes': counts['totalOtherMosquitoes'],
                'maleAnopheles': counts['maleAnopheles'],
                
                # Anopheles gambiae
                'anGambiaeUF': counts['anGambiaeUF'],
                'anGambiaeF': counts['anGambiaeF'],
                'anGambiaeG': counts['anGambiaeG'],
                'AnGambiaeMale': counts['AnGambiaeMale'],
                'AnGambiaeFemale': counts['AnGambiaeFemale'],
                
                # Anopheles funestus
                'anFunestusUF': counts['anFunestusUF'],
                'anFunestusF': counts['anFunestusF'],
                'anFunestusG': counts['anFunestusG'],
                'AnFunestusMale': counts['AnFunestusMale'],
                'AnFunestusFemale': counts['AnFunestusFemale'],
                
                # Other Anopheles
                'anOtherUF': counts['anOtherUF'],
                'anOtherF': counts['anOtherF'],
                'anOtherG': counts['anOtherG'],
                'AnOtherMale': counts['AnOtherMale'],
                'AnOtherFemale': counts['AnOtherFemale'],
                
                # Culex
                'CulexUF': counts['CulexUF'],
                'CulexF': counts['CulexF'],
                'CulexG': counts['CulexG'],
                'culexMale': counts['culexMale'],
                'culexFemale': counts['culexFemale'],
                
                # Aedes
                'AedesUF': counts['AedesUF'],
                'AedesF': counts['AedesF'],
                'AedesG': counts['AedesG'],
                'aedesMale': counts['aedesMale'],
                'aedesFemale': counts['aedesFemale'],
                
                # Mansonia
                'MansoniaUF': counts['MansoniaUF'],
                'MansoniaF': counts['MansoniaF'],
                'MansoniaG': counts['MansoniaG'],
                'mansoniaMale': counts['mansoniaMale'],
                'mansoniaFemale': counts['mansoniaFemale'],
                
                # House metadata
                'peopleSlept': session_info.get('NumPeopleSleptInHouse', '') if 'NumPeopleSleptInHouse' in session_info.index else '',
                'irsSprayed': session_info.get('WasIrsConducted', '') if 'WasIrsConducted' in session_info.index else '',
                'monthsAgo': session_info.get('MonthsSinceIrs', '') if 'MonthsSinceIrs' in session_info.index else '',
                'totalLLIN': session_info.get('NumLlinsAvailable', '') if 'NumLlinsAvailable' in session_info.index else '',
                'llinType': session_info.get('LlinType', '') if 'LlinType' in session_info.index else '',
                'llinBrand': session_info.get('LlinBrand', '') if 'LlinBrand' in session_info.index else '',
                'peopleSleptUnderLlin': session_info.get('NumPeopleSleptUnderLlin', '') if 'NumPeopleSleptUnderLlin' in session_info.index else '',
                
                # Additional fields
                'name': session_info.get('SessionCollectorName', '') if 'SessionCollectorName' in session_info.index else '',
                'site code': session_info.get('SiteID', '') if 'SiteID' in session_info.index else '',
                'health centre': session_info.get('SiteHealthCenter', '') if 'SiteHealthCenter' in session_info.index else '',
                'parish': session_info.get('SiteParish', '') if 'SiteParish' in session_info.index else '',
                'village': '',
                'coded house number': '',
                'Latitude': '',
                'Longitude': '',
                'House Type': '',
                'Title of Officer': session_info.get('SessionCollectorTitle', '') if 'SessionCollectorTitle' in session_info.index else ''
            }
            
            report_rows.append(row)
        
        # Create DataFrame
        report_df = pd.DataFrame(report_rows)
        
        # ✅ FIXED: Use format YYYY-MM-DD instead of YYYYMMDD
        timestamp = datetime.now().strftime('%Y-%m-%d')
        report_file = str(Path(output_dir) / f'vectorcam_report_{timestamp}.csv')
        
        report_df.to_csv(report_file, index=False)
        
        logger.info(f"Exported report format CSV: {report_file}")
        logger.info(f"Report contains {len(report_df)} houses with species counts")
        
        return report_file
    
    def process_all(self, surveillance_df: pd.DataFrame, 
                   specimens_df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Process all data: clean and merge"""
        clean_surveillance = self.clean_surveillance_data(surveillance_df)
        clean_specimens = self.clean_specimens_data(specimens_df)
        merged = self.merge_data(clean_surveillance, clean_specimens)
        
        return clean_surveillance, clean_specimens, merged


def process_data(surveillance_df: pd.DataFrame, 
                specimens_df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Main function to process raw data
    
    Args:
        surveillance_df: Raw surveillance DataFrame
        specimens_df: Raw specimens DataFrame
        
    Returns:
        Tuple of (clean_surveillance, clean_specimens, merged_data)
    """
    processor = DataProcessor()
    return processor.process_all(surveillance_df, specimens_df)
"""
Metrics Calculator Module
Calculates all entomological metrics for the dashboard
"""
import pandas as pd
import numpy as np
import json
from datetime import datetime
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class MetricsCalculator:
    """Calculates entomological metrics from surveillance and specimen data"""
    
    def __init__(self, surveillance_df: pd.DataFrame, specimens_df: pd.DataFrame, 
                 merged_df: Optional[pd.DataFrame] = None):
        """
        Initialize MetricsCalculator
        
        Args:
            surveillance_df: Cleaned surveillance data
            specimens_df: Cleaned specimens data
            merged_df: Optional pre-merged data
        """
        self.surveillance = surveillance_df
        self.specimens = specimens_df
        self.merged = merged_df
    
    def calculate_all_metrics(self) -> Dict[str, Any]:
        """
        Calculate all metrics
        
        Returns:
            Dictionary containing all calculated metrics
        """
        logger.info("Calculating all metrics...")
        
        metrics = {
            'summary': self.calculate_summary_metrics(),
            'temporal': self.calculate_temporal_metrics(),
            'species': self.calculate_species_metrics(),
            'collection_methods': self.calculate_collection_method_metrics(),
            'interventions': self.calculate_intervention_metrics(),
            'blood_feeding': self.calculate_blood_feeding_metrics(),
            'indoor_density': self.calculate_indoor_resting_density(),
            'geographic': self.calculate_geographic_metrics(),
            'data_quality': self.calculate_data_quality_metrics(),
        }
        
        logger.info("All metrics calculated successfully")
        return metrics
    
    def calculate_summary_metrics(self) -> Dict[str, Any]:
        """Calculate overall summary statistics"""
        return {
            'total_collections': len(self.surveillance),
            'total_specimens': len(self.specimens),
            'date_range': {
                'start': str(self.surveillance['SessionCollectionDate'].min()),
                'end': str(self.surveillance['SessionCollectionDate'].max())
            },
            'unique_sites': self.surveillance['SiteDistrict'].nunique(),
            'unique_collectors': self.surveillance['SessionCollectorName'].nunique(),
            'countries': self.surveillance['ProgramCountry'].unique().tolist(),
        }
    
    def calculate_temporal_metrics(self) -> Dict[str, Any]:
        """Calculate time-based metrics"""
        # Collections by month
        monthly_collections = (
            self.surveillance.groupby('CollectionYearMonth')
            .size()
            .to_dict()
        )
        
        # Specimens by month
        monthly_specimens = (
            self.specimens.groupby('CaptureYearMonth')
            .size()
            .to_dict()
        )
        
        # Collections by quarter
        quarterly_collections = (
            self.surveillance.groupby(['CollectionYear', 'CollectionQuarter'])
            .size()
            .to_dict()
        )
        
        return {
            'collections_by_month': monthly_collections,
            'specimens_by_month': monthly_specimens,
            'collections_by_quarter': quarterly_collections,
        }
    
    def calculate_species_metrics(self) -> Dict[str, Any]:
        """Calculate species composition metrics"""
        # Overall species distribution
        species_counts = self.specimens['Species'].value_counts().to_dict()
        
        # Species groups
        species_group_counts = (
            self.specimens['SpeciesGroup'].value_counts().to_dict() 
            if 'SpeciesGroup' in self.specimens.columns else {}
        )
        
        # Anopheles species only
        anopheles_df = self.specimens[
            self.specimens['Species'].str.contains('Anopheles', na=False, case=False)
        ]
        anopheles_counts = anopheles_df['Species'].value_counts().to_dict()
        
        # Sex ratio (for Anopheles)
        anopheles_sex = anopheles_df['Sex'].value_counts().to_dict() if len(anopheles_df) > 0 else {}
        
        # Species by month
        species_by_month = (
            self.specimens.groupby(['CaptureYearMonth', 'Species'])
            .size()
            .unstack(fill_value=0)
            .to_dict()
        )
        
        return {
            'species_counts': species_counts,
            'species_groups': species_group_counts,
            'anopheles_counts': anopheles_counts,
            'anopheles_sex_ratio': anopheles_sex,
            'species_by_month': species_by_month,
            'total_anopheles': len(anopheles_df),
            'anopheles_percentage': (len(anopheles_df) / len(self.specimens) * 100) if len(self.specimens) > 0 else 0
        }
    
    def calculate_collection_method_metrics(self) -> Dict[str, Any]:
        """Calculate metrics by collection method"""
        # Collections by method
        method_collections = (
            self.surveillance['SessionCollectionMethod']
            .value_counts()
            .to_dict()
        )
        
        # Specimens by method
        method_specimens = (
            self.specimens['SessionCollectionMethod']
            .value_counts()
            .to_dict()
        )
        
        # Specimens per collection by method
        specimens_per_collection = {}
        for method in self.surveillance['SessionCollectionMethod'].unique():
            n_collections = (self.surveillance['SessionCollectionMethod'] == method).sum()
            n_specimens = (self.specimens['SessionCollectionMethod'] == method).sum()
            if n_collections > 0:
                specimens_per_collection[method] = n_specimens / n_collections
        
        # Species composition by method
        species_by_method = (
            self.specimens.groupby(['SessionCollectionMethod', 'Species'])
            .size()
            .unstack(fill_value=0)
            .to_dict()
        )
        
        return {
            'collections_by_method': method_collections,
            'specimens_by_method': method_specimens,
            'specimens_per_collection': specimens_per_collection,
            'species_by_method': species_by_method,
        }
    
    def calculate_intervention_metrics(self) -> Dict[str, Any]:
        """Calculate LLIN and IRS intervention metrics"""
        # IRS coverage
        irs_conducted = (
            self.surveillance['WasIrsConducted'].value_counts().to_dict()
        )
        
        irs_rate = (
            (self.surveillance['WasIrsConducted'] == 'Yes').sum() / 
            len(self.surveillance) * 100
        ) if len(self.surveillance) > 0 else 0
        
        # LLIN metrics
        llin_coverage = {
            'total_llins': self.surveillance['NumLlinsAvailable'].sum(),
            'avg_llins_per_house': self.surveillance['NumLlinsAvailable'].mean(),
            'houses_with_llins': (self.surveillance['NumLlinsAvailable'] > 0).sum(),
        }
        
        # LLIN usage rate
        avg_usage_rate = self.surveillance['LlinUsageRate'].mean() if 'LlinUsageRate' in self.surveillance.columns else 0
        
        # LLIN types
        llin_types = (
            self.surveillance[self.surveillance['LlinType'] != 'Unknown']['LlinType']
            .value_counts()
            .to_dict()
        )
        
        # LLIN brands
        llin_brands = (
            self.surveillance[self.surveillance['LlinBrand'] != 'Unknown']['LlinBrand']
            .value_counts()
            .to_dict()
        )
        
        return {
            'irs_coverage': irs_conducted,
            'irs_rate_percent': irs_rate,
            'llin_coverage': llin_coverage,
            'avg_llin_usage_rate': avg_usage_rate,
            'llin_types': llin_types,
            'llin_brands': llin_brands,
        }
    
    def calculate_blood_feeding_metrics(self) -> Dict[str, Any]:
        """Calculate blood-feeding status metrics"""
        # Overall feeding status
        feeding_status = (
            self.specimens['AbdomenStatus'].value_counts().to_dict()
        )
        
        # For Anopheles only
        anopheles_df = self.specimens[
            self.specimens['Species'].str.contains('Anopheles', na=False, case=False)
        ]
        
        anopheles_feeding = (
            anopheles_df['AbdomenStatus'].value_counts().to_dict() 
            if len(anopheles_df) > 0 else {}
        )
        
        # Calculate feeding rates
        if 'IsFed' in self.specimens.columns:
            feeding_rate = (
                self.specimens['IsFed'].sum() / len(self.specimens) * 100
            ) if len(self.specimens) > 0 else 0
            
            anopheles_feeding_rate = (
                anopheles_df['IsFed'].sum() / len(anopheles_df) * 100
            ) if len(anopheles_df) > 0 else 0
        else:
            feeding_rate = 0
            anopheles_feeding_rate = 0
        
        # Feeding status by species
        feeding_by_species = (
            self.specimens.groupby(['Species', 'AbdomenStatus'])
            .size()
            .unstack(fill_value=0)
            .to_dict()
        )
        
        return {
            'overall_feeding_status': feeding_status,
            'anopheles_feeding_status': anopheles_feeding,
            'overall_feeding_rate': feeding_rate,
            'anopheles_feeding_rate': anopheles_feeding_rate,
            'feeding_by_species': feeding_by_species,
        }
    
    def calculate_indoor_resting_density(self) -> Dict[str, Any]:
        """
        Calculate indoor resting density from PSC (Pyrethrum Spray Catch) data
        
        This is a key metric: mosquitoes per house for indoor collections
        """
        # Filter for PSC collections only
        psc_sessions = self.surveillance[
            self.surveillance['SessionCollectionMethod'].str.contains('PSC', na=False, case=False)
        ]
        
        if len(psc_sessions) == 0:
            logger.warning("No PSC collections found for indoor resting density calculation")
            return {
                'total_psc_collections': 0,
                'avg_mosquitoes_per_house': 0,
                'avg_anopheles_per_house': 0,
            }
        
        # Get specimens from PSC collections
        psc_specimens = self.specimens[
            self.specimens['SessionCollectionMethod'].str.contains('PSC', na=False, case=False)
        ]
        
        # Count specimens per session
        specimens_per_session = (
            psc_specimens.groupby('SessionID')
            .size()
            .reset_index(name='mosquito_count')
        )
        
        # Merge with sessions to get house info
        psc_with_counts = psc_sessions.merge(
            specimens_per_session,
            on='SessionID',
            how='left'
        )
        psc_with_counts['mosquito_count'] = psc_with_counts['mosquito_count'].fillna(0)
        
        # Calculate overall density
        avg_mosquitoes_per_house = psc_with_counts['mosquito_count'].mean()
        
        # Calculate for Anopheles only
        anopheles_psc = psc_specimens[
            psc_specimens['Species'].str.contains('Anopheles', na=False, case=False)
        ]
        
        anopheles_per_session = (
            anopheles_psc.groupby('SessionID')
            .size()
            .reset_index(name='anopheles_count')
        )
        
        psc_with_anopheles = psc_sessions.merge(
            anopheles_per_session,
            on='SessionID',
            how='left'
        )
        psc_with_anopheles['anopheles_count'] = psc_with_anopheles['anopheles_count'].fillna(0)
        
        avg_anopheles_per_house = psc_with_anopheles['anopheles_count'].mean()
        
        # Density by district
        density_by_district = (
            psc_with_counts.groupby('SiteDistrict')['mosquito_count']
            .mean()
            .to_dict()
        )
        
        # Density over time
        psc_with_counts['YearMonth'] = pd.to_datetime(psc_with_counts['SessionCollectionDate']).dt.strftime('%Y-%m')
        density_by_month = (
            psc_with_counts.groupby('YearMonth')['mosquito_count']
            .mean()
            .to_dict()
        )
        
        return {
            'total_psc_collections': len(psc_sessions),
            'avg_mosquitoes_per_house': float(avg_mosquitoes_per_house),
            'avg_anopheles_per_house': float(avg_anopheles_per_house),
            'density_by_district': density_by_district,
            'density_by_month': density_by_month,
        }
    
    def calculate_geographic_metrics(self) -> Dict[str, Any]:
        """Calculate metrics by geographic location"""
        # Collections by district
        district_collections = (
            self.surveillance['SiteDistrict'].value_counts().to_dict()
        )
        
        # Specimens by district
        district_specimens = (
            self.specimens['SiteDistrict'].value_counts().to_dict()
        )
        
        # Species composition by district
        species_by_district = (
            self.specimens.groupby(['SiteDistrict', 'Species'])
            .size()
            .unstack(fill_value=0)
            .to_dict()
        )
        
        return {
            'collections_by_district': district_collections,
            'specimens_by_district': district_specimens,
            'species_by_district': species_by_district,
        }
    
    def calculate_data_quality_metrics(self) -> Dict[str, Any]:
        """Calculate data quality indicators"""
        # Quality flags from surveillance
        quality_flags = (
            self.surveillance['DataQualityFlag'].value_counts().to_dict()
            if 'DataQualityFlag' in self.surveillance.columns else {}
        )
        
        # Missing data analysis
        surveillance_missing = (
            self.surveillance.isnull().sum() / len(self.surveillance) * 100
        ).to_dict()
        
        specimens_missing = (
            self.specimens.isnull().sum() / len(self.specimens) * 100
        ).to_dict()
        
        # Completeness score
        surveillance_completeness = 100 - (
            self.surveillance.isnull().sum().sum() / 
            (len(self.surveillance) * len(self.surveillance.columns)) * 100
        )
        
        specimens_completeness = 100 - (
            self.specimens.isnull().sum().sum() / 
            (len(self.specimens) * len(self.specimens.columns)) * 100
        )
        
        return {
            'quality_flags': quality_flags,
            'surveillance_completeness': surveillance_completeness,
            'specimens_completeness': specimens_completeness,
            'surveillance_missing_pct': {k: v for k, v in surveillance_missing.items() if v > 0},
            'specimens_missing_pct': {k: v for k, v in specimens_missing.items() if v > 0},
        }
    
    def calculate_mosquitoes_per_person_per_night(self) -> Dict[str, Any]:
        """
        Calculate mosquitoes per person per night
        Key metric for exposure assessment
        """
        # This requires specimens linked to surveillance data
        if self.merged is None:
            logger.warning("Merged data not available for mosquitoes per person per night calculation")
            return {}
        
        # Filter for indoor collections with people data
        indoor_methods = ['PSC', 'CDC']
        indoor_data = self.merged[
            self.merged['SessionCollectionMethod'].str.contains('|'.join(indoor_methods), na=False, case=False)
        ]
        
        indoor_data = indoor_data[indoor_data['NumPeopleSleptInHouse'] > 0]
        
        if len(indoor_data) == 0:
            return {
                'avg_mosquitoes_per_person_per_night': 0,
                'by_method': {}
            }
        
        # Calculate per session
        session_metrics = (
            indoor_data.groupby('SessionID')
            .agg({
                'SpecimenID': 'count',
                'NumPeopleSleptInHouse': 'first',
                'SessionCollectionMethod': 'first'
            })
            .rename(columns={'SpecimenID': 'mosquito_count'})
        )
        
        session_metrics['mosquitoes_per_person'] = (
            session_metrics['mosquito_count'] / session_metrics['NumPeopleSleptInHouse']
        )
        
        # Overall average
        avg_per_person = session_metrics['mosquitoes_per_person'].mean()
        
        # By collection method
        by_method = (
            session_metrics.groupby('SessionCollectionMethod')['mosquitoes_per_person']
            .mean()
            .to_dict()
        )
        
        return {
            'avg_mosquitoes_per_person_per_night': float(avg_per_person),
            'by_method': by_method,
        }


def calculate_metrics(surveillance_df: pd.DataFrame, 
                     specimens_df: pd.DataFrame,
                     merged_df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
    """
    Main function to calculate all metrics
    
    Args:
        surveillance_df: Cleaned surveillance data
        specimens_df: Cleaned specimens data
        merged_df: Optional merged data
        
    Returns:
        Dictionary with all metrics
    """
    calculator = MetricsCalculator(surveillance_df, specimens_df, merged_df)
    return calculator.calculate_all_metrics()


if __name__ == "__main__":
    # Test metrics calculation
    import sys
    sys.path.append('..')
    from modules.data_processing import process_data
    
    logging.basicConfig(level=logging.INFO)
    logger.info("Testing metrics calculation...")
    
    # Load and process sample data
    surv = pd.read_csv('/mnt/user-data/uploads/surveillance.csv')
    spec = pd.read_csv('/mnt/user-data/uploads/specimens.csv')
    
    clean_surv, clean_spec, merged = process_data(surv, spec)
    
    # Calculate metrics
    metrics = calculate_metrics(clean_surv, clean_spec, merged)
    
    logger.info("Metrics calculated!")
    logger.info(f"Summary: {metrics['summary']}")

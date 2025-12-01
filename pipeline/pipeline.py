"""
VectorInsight Data Pipeline
Main orchestration script that runs the complete pipeline
"""
import logging
from datetime import datetime
import json
from pathlib import Path
import sys



# Add modules to path
sys.path.append(str(Path(__file__).parent))

import config
from modules.data_extraction import extract_data
from modules.data_processing import DataProcessor
from modules.metrics_calculator import calculate_metrics
from modules.database import VectorInsightDB
from modules.user_tracking import update_user_logs
from modules.data_processing import (
    process_data,
    filter_surveillance_sessions,
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(config.LOGS_DIR / f'pipeline_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class VectorInsightPipeline:
    """Main pipeline orchestrator"""
    
    def __init__(self):
        """Initialize pipeline"""
        self.db = VectorInsightDB()
        self.processor = DataProcessor()
        self.start_time = datetime.now()
        
    def run(self, skip_extraction: bool = False):
        """
        Run the complete pipeline
        
        Args:
            skip_extraction: If True, loads from existing files instead of API
        """
        logger.info("="*80)
        logger.info("Starting VectorInsight Data Pipeline")
        logger.info(f"Timestamp: {self.start_time}")
        logger.info("="*80)
        
        try:
            # Step 1: Data Extraction
            if skip_extraction:
                logger.info("Skipping extraction - loading from existing files")
                surveillance_df, specimens_df = self._load_existing_data()
            else:
                logger.info("STEP 1: Extracting data from API")
                surveillance_df, specimens_df = extract_data(save_raw=True)
                
                if surveillance_df is None or specimens_df is None:
                    logger.error("Data extraction failed!")
                    return False
                
            from modules.data_processing import filter_surveillance_sessions

            # Filter surveillance to only include completed sessions
            logger.info("Applying SURVEILLANCE filter to specimens data")
            specimens_df = filter_surveillance_sessions(specimens_df)

            # Keep only specimens that belong to those sessions
            if 'session_id' in specimens_df.columns and 'session_id' in surveillance_df.columns:
                surveillance_session_ids = set(surveillance_df['session_id'].unique())
                specimens_df = specimens_df[specimens_df['session_id'].isin(surveillance_session_ids)].copy()
            #
            
            # Step 2: Data Processing
            logger.info("STEP 2: Processing and cleaning data")
            clean_surveillance, clean_specimens, merged_data = process_data(
                surveillance_df, specimens_df
            )
            
            # Step 3: Store in Database
            logger.info("STEP 3: Storing data in database")
            self.db.create_tables()
            self.db.insert_surveillance_data(clean_surveillance, replace=True)
            self.db.insert_specimens_data(clean_specimens, replace=True)
            
            # Step 4: Export CSV Files
            logger.info("STEP 4: Exporting CSV files")
            surv_file, spec_file = self.processor.export_to_csv(
                clean_surveillance, clean_specimens
            )
            report_file = self.processor.export_report_format(
                clean_surveillance, clean_specimens
            )
            logger.info(f"Clean surveillance CSV: {surv_file}")
            logger.info(f"Clean specimens CSV: {spec_file}")
            logger.info(f"VectorCam report CSV: {report_file}")
            
            # Step 5: Calculate Metrics
            logger.info("STEP 5: Calculating metrics")
            metrics = calculate_metrics(clean_surveillance, clean_specimens, merged_data)
            
            # Step 6: Store Metrics
            logger.info("STEP 6: Storing calculated metrics")
            self._store_metrics(metrics)
            
            # Step 7: Generate Summary Report
            logger.info("STEP 7: Generating summary report")
            self._generate_summary_report(metrics)
            
            # Pipeline Complete
            end_time = datetime.now()
            duration = (end_time - self.start_time).total_seconds()
            
            logger.info("="*80)
            logger.info("Pipeline completed successfully!")
            logger.info(f"Duration: {duration:.2f} seconds")
            logger.info(f"Surveillance records: {len(clean_surveillance)}")
            logger.info(f"Specimen records: {len(clean_specimens)}")
            logger.info("="*80)
            
            return True
            
        except Exception as e:
            logger.error(f"Pipeline failed with error: {str(e)}", exc_info=True)
            return False
    
    def _load_existing_data(self):
        """Load data from existing Parquet files"""
        import pandas as pd
        
        # Find most recent files
        raw_files = list(config.RAW_DATA_DIR.glob('*.parquet'))
        
        if not raw_files:
            logger.error("No existing data files found!")
            return None, None
        
        # Get most recent surveillance and specimens files
        surv_files = [f for f in raw_files if 'surveillance' in f.name]
        spec_files = [f for f in raw_files if 'specimens' in f.name]
        
        if not surv_files or not spec_files:
            logger.error("Missing surveillance or specimens files!")
            return None, None
        
        # Sort by modification time and get most recent
        surv_file = sorted(surv_files, key=lambda x: x.stat().st_mtime)[-1]
        spec_file = sorted(spec_files, key=lambda x: x.stat().st_mtime)[-1]
        
        logger.info(f"Loading surveillance data from: {surv_file}")
        logger.info(f"Loading specimens data from: {spec_file}")
        
        surveillance_df = pd.read_parquet(surv_file)
        specimens_df = pd.read_parquet(spec_file)
        
        return surveillance_df, specimens_df
    
    def _store_metrics(self, metrics: dict):
        """Store calculated metrics in database"""
        year_month = datetime.now().strftime('%Y-%m')
        
        # Store summary metrics
        summary = metrics.get('summary', {})
        for key, value in summary.items():
            if isinstance(value, (int, float)):
                self.db.insert_metric(
                    year_month=year_month,
                    metric_name=key,
                    metric_value=float(value),
                    category='summary'
                )
        
        # Store temporal metrics with JSON
        temporal = metrics.get('temporal', {})
        for key, value in temporal.items():
            # Convert tuple keys to strings for JSON serialization
            if isinstance(value, dict):
                value = {str(k): v for k, v in value.items()}
            
            self.db.insert_metric(
                year_month=year_month,
                metric_name=key,
                metric_value=0,  # placeholder
                metric_json=json.dumps(value),
                category='temporal'
            )
        
        # Store intervention metrics
        interventions = metrics.get('interventions', {})
        if 'irs_rate_percent' in interventions:
            self.db.insert_metric(
                year_month=year_month,
                metric_name='irs_coverage_rate',
                metric_value=interventions['irs_rate_percent'],
                category='interventions'
            )
        
        if 'avg_llin_usage_rate' in interventions:
            self.db.insert_metric(
                year_month=year_month,
                metric_name='llin_usage_rate',
                metric_value=interventions['avg_llin_usage_rate'],
                category='interventions'
            )
        
        # Store indoor density
        indoor_density = metrics.get('indoor_density', {})
        if 'avg_mosquitoes_per_house' in indoor_density:
            self.db.insert_metric(
                year_month=year_month,
                metric_name='avg_mosquitoes_per_house',
                metric_value=indoor_density['avg_mosquitoes_per_house'],
                category='indoor_density'
            )
        
        if 'avg_anopheles_per_house' in indoor_density:
            self.db.insert_metric(
                year_month=year_month,
                metric_name='avg_anopheles_per_house',
                metric_value=indoor_density['avg_anopheles_per_house'],
                category='indoor_density'
            )
        
        logger.info("Metrics stored in database")
    
    def _generate_summary_report(self, metrics: dict):
        """Generate a summary report file"""
        report_path = config.LOGS_DIR / f'summary_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt'
        
        with open(report_path, 'w') as f:
            f.write("="*80 + "\n")
            f.write("VectorInsight Pipeline Summary Report\n")
            f.write(f"Generated: {datetime.now()}\n")
            f.write("="*80 + "\n\n")
            
            # Summary metrics
            f.write("SUMMARY STATISTICS\n")
            f.write("-"*80 + "\n")
            summary = metrics.get('summary', {})
            for key, value in summary.items():
                f.write(f"{key}: {value}\n")
            
            # Species composition
            f.write("\n\nSPECIES COMPOSITION (Top 10)\n")
            f.write("-"*80 + "\n")
            species = metrics.get('species', {}).get('species_counts', {})
            for species_name, count in sorted(species.items(), key=lambda x: x[1], reverse=True)[:10]:
                f.write(f"{species_name}: {count}\n")
            
            # Collection methods
            f.write("\n\nCOLLECTION METHODS\n")
            f.write("-"*80 + "\n")
            methods = metrics.get('collection_methods', {}).get('collections_by_method', {})
            for method, count in sorted(methods.items(), key=lambda x: x[1], reverse=True):
                f.write(f"{method}: {count}\n")
            
            # Indoor resting density
            f.write("\n\nINDOOR RESTING DENSITY (PSC)\n")
            f.write("-"*80 + "\n")
            density = metrics.get('indoor_density', {})
            f.write(f"Average mosquitoes per house: {density.get('avg_mosquitoes_per_house', 0):.2f}\n")
            f.write(f"Average Anopheles per house: {density.get('avg_anopheles_per_house', 0):.2f}\n")
            
            # Interventions
            f.write("\n\nINTERVENTION COVERAGE\n")
            f.write("-"*80 + "\n")
            interventions = metrics.get('interventions', {})
            f.write(f"IRS Coverage Rate: {interventions.get('irs_rate_percent', 0):.1f}%\n")
            f.write(f"LLIN Usage Rate: {interventions.get('avg_llin_usage_rate', 0):.1f}%\n")
            
        logger.info(f"Summary report generated: {report_path}")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='VectorInsight Data Pipeline')
    parser.add_argument(
        '--skip-extraction', 
        action='store_true',
        help='Skip API extraction and use existing data files'
    )
    
    args = parser.parse_args()
    
    # Check if API key is configured
    if not args.skip_extraction and not config.API_SECRET_KEY:
        logger.error("API_SECRET_KEY not configured!")
        logger.error("Please create a .env file with your API key or use --skip-extraction")
        sys.exit(1)
    
    # Run pipeline
    pipeline = VectorInsightPipeline()
    success = pipeline.run(skip_extraction=args.skip_extraction)
    
    # IMPORTANT: Update user tracking BEFORE sys.exit()!
    if success:
        logger.info("\n" + "="*80)
        logger.info("STEP 8: Updating user tracking")
        logger.info("="*80)
        try:
            update_user_logs()
            logger.info("✓ User tracking updated successfully")
        except Exception as e:
            logger.warning(f"⚠ User tracking warning: {e}")
            logger.warning("Pipeline will continue without user tracking")
    
    # Now exit
    if success:
        logger.info("\n" + "="*80)
        logger.info("Pipeline completed successfully!")
        logger.info("Next step: Run the dashboard with:")
        logger.info("  streamlit run dashboard/app.py")
        logger.info("="*80)
        sys.exit(0)
    else:
        logger.error("Pipeline failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()

    
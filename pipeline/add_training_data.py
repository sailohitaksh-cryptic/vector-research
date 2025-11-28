"""
Script to populate sample training data for field collectors
Run this after pipeline to add training information
"""

from modules.user_tracking import UserTracker
from datetime import datetime, timedelta
import random

def add_sample_training_data():
    """Add sample training records for collectors"""
    
    tracker = UserTracker()
    
    # Get all registered collectors
    collectors = tracker.get_collector_summary()
    
    if len(collectors) == 0:
        print("No collectors found. Run the pipeline first.")
        return
    
    print(f"Adding training data for {len(collectors)} collectors...")
    
    # Training types
    training_types = [
        'Initial Training',
        'Refresher Training', 
        'Species Identification',
        'PSC Methodology',
        'CDC Light Trap Training',
        'Data Quality Workshop'
    ]
    
    trainers = [
        'Dr. Sarah Kato',
        'Prof. James Okello',
        'Ms. Betty Namuddu',
        'Mr. Patrick Opio'
    ]
    
    # Add training records
    for _, collector in collectors.iterrows():
        # Initial training (3-12 months ago)
        initial_days_ago = random.randint(90, 365)
        initial_date = (datetime.now() - timedelta(days=initial_days_ago)).strftime('%Y-%m-%d')
        
        tracker.add_training_record(
            collector_name=collector['collector_name'],
            training_date=initial_date,
            training_type='Initial Training',
            trainer_name=random.choice(trainers),
            topics='Mosquito collection methods, Species identification, Data recording, Safety protocols',
            score=random.uniform(75, 100),
            certification='Certified'
        )
        
        # Some get refresher training (if initial was >180 days ago)
        if initial_days_ago > 180 and random.random() > 0.5:
            refresher_days_ago = random.randint(30, 90)
            refresher_date = (datetime.now() - timedelta(days=refresher_days_ago)).strftime('%Y-%m-%d')
            
            tracker.add_training_record(
                collector_name=collector['collector_name'],
                training_date=refresher_date,
                training_type=random.choice(training_types[1:]),
                trainer_name=random.choice(trainers),
                topics='Advanced techniques, Quality control, New protocols',
                score=random.uniform(80, 100),
                certification='Certified'
            )
    
    print("✓ Sample training data added successfully!")
    
    # Show updated summary
    summary = tracker.get_collector_summary()
    print(f"\nSummary:")
    print(f"Total collectors: {len(summary)}")
    print(f"With training records: {summary['last_training_date'].notna().sum()}")
    print(f"Need refresher training: {(summary['training_status'] == 'Due for Refresher (90-180 days)').sum()}")
    print(f"Need training: {(summary['training_status'] == 'Needs Training (> 180 days)').sum()}")


if __name__ == "__main__":
    add_sample_training_data()
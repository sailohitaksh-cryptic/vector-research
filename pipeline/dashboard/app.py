"""
VectorResearch Interactive Dashboard
Main Streamlit application
"""
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

import config
from modules.database import VectorInsightDB
from modules.user_tracking import UserTracker


# Page configuration
st.set_page_config(
    page_title="VectorResearch Dashboard",
    page_icon="🦟",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
    <style>
    .main-header {
        font-size: 3rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 2rem;
    }
    .metric-card {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
    }
    .stMetric {
        background-color: #ffffff;
        padding: 1rem;
        border-radius: 0.5rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    </style>
""", unsafe_allow_html=True)


@st.cache_resource
def load_database():
    """Load database connection"""
    return VectorInsightDB()


@st.cache_data(ttl=3600)
def load_data():
    """Load data from database with caching"""
    db = load_database()
    
    surveillance = db.get_surveillance_data()
    specimens = db.get_specimens_data()
    metrics = db.get_metrics()
    
    # Convert date columns to datetime
    date_columns = ['SessionCollectionDate', 'SessionCreatedAt', 'SessionCompletedAt', 
                    'SessionSubmittedAt', 'SessionUpdatedAt', 'CreatedAt', 'UpdatedAt']
    for col in date_columns:
        if col in surveillance.columns:
            surveillance[col] = pd.to_datetime(surveillance[col], errors='coerce', utc=True).dt.tz_localize(None)
    
    date_columns_spec = ['CapturedAt', 'ImageSubmittedAt', 'ImageUpdatedAt',
                         'SessionCollectionDate', 'SessionCreatedAt', 'SessionCompletedAt',
                         'SessionSubmittedAt', 'SessionUpdatedAt']
    for col in date_columns_spec:
        if col in specimens.columns:
            specimens[col] = pd.to_datetime(specimens[col], errors='coerce', utc=True).dt.tz_localize(None)
    
    return surveillance, specimens, metrics


def apply_filters(surveillance_df, specimens_df, date_range, districts, methods, species_list):
    """Apply user-selected filters to data"""
    # Date filtering
    if date_range:
        start_date, end_date = date_range
        surveillance_df = surveillance_df[
            (surveillance_df['SessionCollectionDate'] >= pd.Timestamp(start_date)) &
            (surveillance_df['SessionCollectionDate'] <= pd.Timestamp(end_date))
        ]
        specimens_df = specimens_df[
            (specimens_df['CapturedAt'] >= pd.Timestamp(start_date)) &
            (specimens_df['CapturedAt'] <= pd.Timestamp(end_date))
        ]
    
    # District filtering
    if districts and 'All' not in districts:
        surveillance_df = surveillance_df[surveillance_df['SiteDistrict'].isin(districts)]
        specimens_df = specimens_df[specimens_df['SiteDistrict'].isin(districts)]
    
    # Collection method filtering
    if methods and 'All' not in methods:
        surveillance_df = surveillance_df[surveillance_df['SessionCollectionMethod'].isin(methods)]
        specimens_df = specimens_df[specimens_df['SessionCollectionMethod'].isin(methods)]
    
    # Species filtering
    if species_list and 'All' not in species_list:
        specimens_df = specimens_df[specimens_df['Species'].isin(species_list)]
    
    return surveillance_df, specimens_df


def main():
    """Main dashboard application"""
    
    # Header
    st.markdown('<p class="main-header">🦟 VectorResearch Dashboard</p>', unsafe_allow_html=True)
    st.markdown("**Entomological Surveillance & Vector Control Analytics**")
    st.markdown("---")
    
    # Load data
    try:
        surveillance_df, specimens_df, metrics_df = load_data()
        
        if surveillance_df.empty or specimens_df.empty:
            st.error("⚠️ No data available. Please run the pipeline first: `python pipeline.py`")
            return
            
    except Exception as e:
        st.error(f"⚠️ Error loading data: {str(e)}")
        st.info("Please run the pipeline first: `python pipeline.py`")
        return
    
    # Sidebar filters
    st.sidebar.header("🔍 Filters")
    
    # Date range filter
    st.sidebar.subheader("Date Range")
    date_col = 'SessionCollectionDate' if 'SessionCollectionDate' in surveillance_df.columns else surveillance_df.columns[0]
    
    if date_col in surveillance_df.columns:
        min_date = surveillance_df[date_col].min()
        max_date = surveillance_df[date_col].max()
        
        date_range = st.sidebar.date_input(
            "Select date range",
            value=(min_date, max_date),
            min_value=min_date,
            max_value=max_date
        )
    else:
        date_range = None
    
    # District filter
    st.sidebar.subheader("Geographic Location")
    if 'SiteDistrict' in surveillance_df.columns:
        districts = ['All'] + sorted(surveillance_df['SiteDistrict'].dropna().unique().tolist())
        selected_districts = st.sidebar.multiselect(
            "Select districts",
            districts,
            default=['All']
        )
    else:
        selected_districts = ['All']
    
    # Collection method filter
    st.sidebar.subheader("Collection Method")
    if 'SessionCollectionMethod' in surveillance_df.columns:
        methods = ['All'] + sorted(surveillance_df['SessionCollectionMethod'].dropna().unique().tolist())
        selected_methods = st.sidebar.multiselect(
            "Select methods",
            methods,
            default=['All']
        )
    else:
        selected_methods = ['All']
    
    # Species filter
    st.sidebar.subheader("Species")
    if 'Species' in specimens_df.columns:
        # Exclude Unknown species from filter options
        all_species = specimens_df['Species'].dropna().unique().tolist()
        known_species = [s for s in all_species if 'unknown' not in s.lower()]
        species = ['All'] + sorted(known_species)
        selected_species = st.sidebar.multiselect(
            "Select species",
            species,
            default=['All']
        )
    else:
        selected_species = ['All']
    
    # Apply filters
    filtered_surveillance, filtered_specimens = apply_filters(
        surveillance_df, specimens_df,
        date_range, selected_districts, selected_methods, selected_species
    )
    
    # CSV Download Section
    st.sidebar.markdown("---")
    st.sidebar.header("📥 Download Report")
    
    # Download VectorCam Report Format
    st.sidebar.subheader("📊 Complete Analysis Report")
    
    # Check if report exists in exports folder
    import glob
    import os
    
    export_dir = Path(__file__).parent.parent / 'data' / 'exports'
    report_files = sorted(glob.glob(str(export_dir / 'vectorcam_report_*.csv')), reverse=True)
    
    if report_files:
        # Get most recent report
        latest_report = report_files[0]
        report_filename = os.path.basename(latest_report)
        report_date = report_filename.replace('vectorcam_report_', '').replace('.csv', '')
        
        st.sidebar.info(f"📅 Latest report: {report_date}")
        
        # Read the report file
        try:
            with open(latest_report, 'rb') as f:
                report_data = f.read()
            
            st.sidebar.download_button(
                label="📊 Download Full Report",
                data=report_data,
                file_name=report_filename,
                mime="text/csv",
                type="primary",
                help="Download the complete VectorCam aggregated report (generated by pipeline)"
            )
            
            # Show report stats
            report_df = pd.read_csv(latest_report)
            st.sidebar.success(f"✅ {len(report_df)} houses in report")
            
        except Exception as e:
            st.sidebar.error(f"Error reading report: {str(e)}")
    else:
        st.sidebar.warning("⚠️ No report found. Run pipeline first: `python pipeline.py`")
    
    st.sidebar.info(f"💾 Showing {len(filtered_surveillance)} collections & {len(filtered_specimens)} specimens")
    
    # Summary metrics row
    st.header("📊 Key Metrics Overview")
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.metric(
            "Total Collections",
            f"{len(filtered_surveillance):,}",
            delta=None
        )
    
    with col2:
        st.metric(
            "Total Number of Images",
            f"{len(filtered_specimens):,}",
            delta=None
        )
    
    with col3:
        anopheles_count = len(filtered_specimens[
            filtered_specimens['Species'].str.contains('Anopheles', na=False, case=False)
        ]) if 'Species' in filtered_specimens.columns else 0
        st.metric(
            "Anopheles Collected",
            f"{anopheles_count:,}",
            delta=None
        )
    
    with col4:
        unique_sites = filtered_surveillance['SiteDistrict'].nunique() if 'SiteDistrict' in filtered_surveillance.columns else 0
        st.metric(
            "Unique Sites",
            f"{unique_sites}",
            delta=None
        )
    
    with col5:
        avg_per_collection = len(filtered_specimens) / len(filtered_surveillance) if len(filtered_surveillance) > 0 else 0
        st.metric(
            "Avg Specimens/Collection",
            f"{avg_per_collection:.1f}",
            delta=None
        )
    
    st.markdown("---")
    
    # Main dashboard content
    tab1, tab2, tab3, tab4, tab5, tab6, tab7 = st.tabs([
    "📈 Temporal Trends",
    "🦟 Species Composition", 
    "🏠 Indoor Density",
    "🛡️ Interventions",
    "🔬 Collection Methods",
    "🗺️ Geographic",
    "👥 Field Team Activity"  # NEW TAB
    ])
    
    # Tab 1: Temporal Trends
    with tab1:
        st.header("Collections Over Time")
        
        if 'CollectionYearMonth' in filtered_surveillance.columns:
            monthly_data = filtered_surveillance.groupby('CollectionYearMonth').size().reset_index(name='count')
            monthly_data = monthly_data.sort_values('CollectionYearMonth')
            
            fig = px.line(
                monthly_data,
                x='CollectionYearMonth',
                y='count',
                title='Collections by Month',
                labels={'CollectionYearMonth': 'Month', 'count': 'Number of Collections'},
                markers=True
            )
            fig.update_layout(height=400)
            st.plotly_chart(fig, use_container_width=True)
        
        st.subheader("Specimens Over Time")
        
        if 'CaptureYearMonth' in filtered_specimens.columns:
            monthly_specimens = filtered_specimens.groupby('CaptureYearMonth').size().reset_index(name='count')
            monthly_specimens = monthly_specimens.sort_values('CaptureYearMonth')
            
            fig2 = px.bar(
                monthly_specimens,
                x='CaptureYearMonth',
                y='count',
                title='Specimens Collected by Month',
                labels={'CaptureYearMonth': 'Month', 'count': 'Number of Specimens'},
                color='count',
                color_continuous_scale='Blues'
            )
            fig2.update_layout(height=400)
            st.plotly_chart(fig2, use_container_width=True)
    
    # Tab 2: Species Composition
    with tab2:
        st.header("Species Distribution")
        
        if 'Species' in filtered_specimens.columns:
            # Filter out Unknown species
            known_specimens = filtered_specimens[
                ~filtered_specimens['Species'].str.contains('Unknown', na=False, case=False)
            ]
            
            species_counts = known_specimens['Species'].value_counts().reset_index()
            species_counts.columns = ['Species', 'Count']
            
            col1, col2 = st.columns(2)
            
            with col1:
                fig = px.pie(
                    species_counts.head(10),
                    values='Count',
                    names='Species',
                    title='Top 10 Species (Pie Chart)',
                    hole=0.3
                )
                st.plotly_chart(fig, use_container_width=True)
            
            with col2:
                fig2 = px.bar(
                    species_counts.head(15),
                    x='Count',
                    y='Species',
                    orientation='h',
                    title='Top Species (Bar Chart)',
                    labels={'Count': 'Number of Specimens', 'Species': 'Species'},
                    color='Count',
                    color_continuous_scale='Viridis'
                )
                fig2.update_layout(yaxis={'categoryorder': 'total ascending'})
                st.plotly_chart(fig2, use_container_width=True)
            
            # Anopheles breakdown
            st.subheader("Anopheles Species Detail")
            anopheles_df = known_specimens[
                known_specimens['Species'].str.contains('Anopheles', na=False, case=False)
            ]
            
            if len(anopheles_df) > 0:
                anopheles_counts = anopheles_df['Species'].value_counts().reset_index()
                anopheles_counts.columns = ['Species', 'Count']
                
                fig3 = px.bar(
                    anopheles_counts,
                    x='Species',
                    y='Count',
                    title='Anopheles Species Breakdown',
                    labels={'Count': 'Number of Specimens'},
                    color='Count',
                    color_continuous_scale='Reds'
                )
                st.plotly_chart(fig3, use_container_width=True)
            
            # Temporal Species Trends
            st.subheader("Species Trends Over Time")
            
            if 'CaptureYearMonth' in known_specimens.columns or 'CaptureYear' in known_specimens.columns:
                # Prepare temporal data
                temporal_col = 'CaptureYearMonth' if 'CaptureYearMonth' in known_specimens.columns else 'CaptureYear'
                
                # Get top 5 species by total count (excluding Unknown)
                top_species = known_specimens['Species'].value_counts().head(5).index.tolist()
                
                # Filter for top species
                top_species_data = known_specimens[known_specimens['Species'].isin(top_species)]
                
                # Group by time period and species
                species_temporal = top_species_data.groupby([temporal_col, 'Species']).size().reset_index(name='Count')
                species_temporal = species_temporal.sort_values(temporal_col)
                
                # Create line chart
                fig_temporal = px.line(
                    species_temporal,
                    x=temporal_col,
                    y='Count',
                    color='Species',
                    title=f'Top 5 Species Trends Over Time',
                    labels={'Count': 'Number of Specimens', temporal_col: 'Time Period'},
                    markers=True
                )
                fig_temporal.update_layout(
                    xaxis_title='Time Period',
                    yaxis_title='Specimen Count',
                    legend_title='Species',
                    hovermode='x unified'
                )
                st.plotly_chart(fig_temporal, use_container_width=True)
                
                # Optional: Show stacked area chart
                st.subheader("Species Composition Over Time (Stacked)")
                
                fig_area = px.area(
                    species_temporal,
                    x=temporal_col,
                    y='Count',
                    color='Species',
                    title='Species Distribution Over Time (Stacked Area)',
                    labels={'Count': 'Number of Specimens', temporal_col: 'Time Period'}
                )
                fig_area.update_layout(
                    xaxis_title='Time Period',
                    yaxis_title='Cumulative Specimen Count',
                    legend_title='Species',
                    hovermode='x unified'
                )
                st.plotly_chart(fig_area, use_container_width=True)
            else:
                st.info("Temporal data not available. Ensure collection dates are properly processed.")
    
    # Tab 3: Indoor Density
    with tab3:
        st.header("Indoor Resting Density (PSC Collections)")
        
        # Filter for PSC collections
        psc_surveillance = filtered_surveillance[
            filtered_surveillance['SessionCollectionMethod'].str.contains('PSC', na=False, case=False)
        ]
        
        if len(psc_surveillance) > 0:
            # Count specimens per session
            psc_sessions = psc_surveillance['SessionID'].unique()
            psc_specimens = filtered_specimens[filtered_specimens['SessionID'].isin(psc_sessions)]
            
            specimens_per_session = psc_specimens.groupby('SessionID').size().reset_index(name='mosquito_count')
            psc_with_counts = psc_surveillance.merge(specimens_per_session, on='SessionID', how='left')
            psc_with_counts['mosquito_count'] = psc_with_counts['mosquito_count'].fillna(0)
            
            avg_density = psc_with_counts['mosquito_count'].mean()
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric("Average Mosquitoes per House", f"{avg_density:.2f}")
            
            with col2:
                anopheles_psc = psc_specimens[
                    psc_specimens['Species'].str.contains('Anopheles', na=False, case=False)
                ]
                anopheles_per_session = anopheles_psc.groupby('SessionID').size().mean()
                st.metric("Average Anopheles per House", f"{anopheles_per_session:.2f}")
            
            with col3:
                st.metric("PSC Collections", f"{len(psc_surveillance)}")
            
            # Density over time
            if 'CollectionYearMonth' in psc_with_counts.columns:
                st.subheader("Indoor Density Trends")
                density_by_month = psc_with_counts.groupby('CollectionYearMonth')['mosquito_count'].mean().reset_index()
                density_by_month = density_by_month.sort_values('CollectionYearMonth')
                
                fig = px.line(
                    density_by_month,
                    x='CollectionYearMonth',
                    y='mosquito_count',
                    title='Average Mosquitoes per House Over Time',
                    labels={'CollectionYearMonth': 'Month', 'mosquito_count': 'Avg Mosquitoes/House'},
                    markers=True
                )
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No PSC collections found in filtered data.")
    
    # Tab 4: Interventions
    with tab4:
        st.header("LLIN & IRS Coverage")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("IRS Coverage")
            if 'WasIrsConducted' in filtered_surveillance.columns:
                irs_data = filtered_surveillance['WasIrsConducted'].value_counts().reset_index()
                irs_data.columns = ['IRS Status', 'Count']
                
                fig = px.pie(
                    irs_data,
                    values='Count',
                    names='IRS Status',
                    title='IRS Coverage Distribution',
                    color_discrete_sequence=px.colors.sequential.RdBu
                )
                st.plotly_chart(fig, use_container_width=True)
                
                irs_rate = (filtered_surveillance['WasIrsConducted'] == 'Yes').sum() / len(filtered_surveillance) * 100
                st.metric("IRS Coverage Rate", f"{irs_rate:.1f}%")
        
        with col2:
            st.subheader("LLIN Usage")
            if 'LlinUsageRate' in filtered_surveillance.columns:
                avg_usage = filtered_surveillance['LlinUsageRate'].mean()
                st.metric("Average LLIN Usage Rate", f"{avg_usage:.1f}%")
                
                # LLIN usage distribution
                fig2 = px.histogram(
                    filtered_surveillance,
                    x='LlinUsageRate',
                    nbins=20,
                    title='LLIN Usage Rate Distribution',
                    labels={'LlinUsageRate': 'LLIN Usage Rate (%)', 'count': 'Number of Households'},
                    color_discrete_sequence=['#636EFA']
                )
                st.plotly_chart(fig2, use_container_width=True)
        
        # LLIN Types
        st.subheader("LLIN Types Used")
        if 'LlinType' in filtered_surveillance.columns:
            llin_types = filtered_surveillance[
                filtered_surveillance['LlinType'] != 'Unknown'
            ]['LlinType'].value_counts().reset_index()
            llin_types.columns = ['LLIN Type', 'Count']
            
            fig3 = px.bar(
                llin_types,
                x='LLIN Type',
                y='Count',
                title='Distribution of LLIN Types',
                labels={'Count': 'Number of Households'},
                color='Count',
                color_continuous_scale='Greens'
            )
            st.plotly_chart(fig3, use_container_width=True)
    
    # Tab 5: Collection Methods
    with tab5:
        st.header("Collection Methods Analysis")
        
        if 'SessionCollectionMethod' in filtered_surveillance.columns:
            method_counts = filtered_surveillance['SessionCollectionMethod'].value_counts().reset_index()
            method_counts.columns = ['Method', 'Count']
            
            col1, col2 = st.columns(2)
            
            with col1:
                fig = px.pie(
                    method_counts,
                    values='Count',
                    names='Method',
                    title='Collections by Method',
                    hole=0.4
                )
                st.plotly_chart(fig, use_container_width=True)
            
            with col2:
                # Specimens per collection by method
                if 'SessionCollectionMethod' in filtered_specimens.columns:
                    specimens_by_method = filtered_specimens['SessionCollectionMethod'].value_counts().reset_index()
                    specimens_by_method.columns = ['Method', 'Specimens']
                    
                    method_summary = method_counts.merge(specimens_by_method, on='Method', how='left')
                    method_summary['Avg Specimens per Collection'] = (
                        method_summary['Specimens'] / method_summary['Count']
                    )
                    
                    fig2 = px.bar(
                        method_summary,
                        x='Method',
                        y='Avg Specimens per Collection',
                        title='Average Specimens per Collection by Method',
                        labels={'Avg Specimens per Collection': 'Avg Specimens'},
                        color='Avg Specimens per Collection',
                        color_continuous_scale='Blues'
                    )
                    st.plotly_chart(fig2, use_container_width=True)
    
    # Tab 6: Geographic Distribution
    with tab6:
        st.header("Geographic Distribution")
        
        if 'SiteDistrict' in filtered_surveillance.columns:
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader("Collections by District")
                district_counts = filtered_surveillance['SiteDistrict'].value_counts().reset_index()
                district_counts.columns = ['District', 'Collections']
                
                fig = px.bar(
                    district_counts.head(15),
                    x='Collections',
                    y='District',
                    orientation='h',
                    title='Top Districts by Collections',
                    labels={'Collections': 'Number of Collections'},
                    color='Collections',
                    color_continuous_scale='Oranges'
                )
                fig.update_layout(yaxis={'categoryorder': 'total ascending'})
                st.plotly_chart(fig, use_container_width=True)
            
            with col2:
                st.subheader("Specimens by District")
                if 'SiteDistrict' in filtered_specimens.columns:
                    district_specimens = filtered_specimens['SiteDistrict'].value_counts().reset_index()
                    district_specimens.columns = ['District', 'Specimens']
                    
                    fig2 = px.bar(
                        district_specimens.head(15),
                        x='Specimens',
                        y='District',
                        orientation='h',
                        title='Top Districts by Specimens',
                        labels={'Specimens': 'Number of Specimens'},
                        color='Specimens',
                        color_continuous_scale='Purples'
                    )
                    fig2.update_layout(yaxis={'categoryorder': 'total ascending'})
                    st.plotly_chart(fig2, use_container_width=True)

    with tab7:
        st.header("Field Team Performance & Activity Tracking")
        
        # Import user tracking
        import sys
        sys.path.append(str(Path(__file__).parent.parent))
        
        
        tracker = UserTracker()
        
        # Get collector summary
        collector_summary = tracker.get_collector_summary()
        
        if len(collector_summary) == 0:
            st.warning("No collector data available. Run the pipeline first to populate user tracking.")
        else:
            # ===== OVERVIEW METRICS =====
            st.subheader("📊 Overview")
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                total_collectors = len(collector_summary)
                st.metric("Total Field Collectors", total_collectors)
            
            with col2:
                active_collectors = len(collector_summary[collector_summary['activity_status'] == 'Active (< 7 days)'])
                st.metric("Active Collectors", active_collectors, 
                        delta=f"{(active_collectors/total_collectors*100):.0f}%" if total_collectors > 0 else "0%")
            
            with col3:
                no_submission = len(collector_summary[collector_summary['activity_status'] == 'No Submissions'])
                st.metric("Never Submitted", no_submission, delta_color="inverse")
            
            with col4:
                needs_training = len(collector_summary[
                    collector_summary['training_status'].isin(['Due for Refresher (90-180 days)', 'Needs Training (> 180 days)', 'No Training Record'])
                ])
                st.metric("Need Training", needs_training, delta_color="inverse")
            
            # ===== ACTIVITY STATUS =====
            st.subheader("👥 Collector Activity Status")
            
            col1, col2 = st.columns(2)
            
            with col1:
                # Activity status pie chart
                activity_counts = collector_summary['activity_status'].value_counts().reset_index()
                activity_counts.columns = ['Status', 'Count']
                
                fig = px.pie(
                    activity_counts,
                    values='Count',
                    names='Status',
                    title='Activity Status Distribution',
                    color='Status',
                    color_discrete_map={
                        'Active (< 7 days)': '#28a745',
                        'Inactive (7-30 days)': '#ffc107',
                        'Dormant (> 30 days)': '#dc3545',
                        'No Submissions': '#6c757d'
                    }
                )
                st.plotly_chart(fig, use_container_width=True)
            
            with col2:
                # Training status pie chart
                training_counts = collector_summary['training_status'].value_counts().reset_index()
                training_counts.columns = ['Status', 'Count']
                
                fig2 = px.pie(
                    training_counts,
                    values='Count',
                    names='Status',
                    title='Training Status Distribution',
                    color='Status',
                    color_discrete_map={
                        'Recent (< 90 days)': '#28a745',
                        'Due for Refresher (90-180 days)': '#ffc107',
                        'Needs Training (> 180 days)': '#dc3545',
                        'No Training Record': '#6c757d'
                    }
                )
                st.plotly_chart(fig2, use_container_width=True)
            
            # ===== SUBMISSION TRENDS =====
            st.subheader("📅 Submission Activity Over Time")
            
            # Get daily submissions
            daily_submissions = tracker.get_daily_submission_summary()
            
            if len(daily_submissions) > 0:
                fig = px.line(
                    daily_submissions,
                    x='submission_date',
                    y='num_collectors',
                    title='Number of Active Collectors per Day',
                    labels={'submission_date': 'Date', 'num_collectors': 'Active Collectors'},
                    markers=True
                )
                st.plotly_chart(fig, use_container_width=True)
                
                # Specimens collected over time
                fig2 = px.bar(
                    daily_submissions,
                    x='submission_date',
                    y='total_specimens',
                    title='Total Specimens Collected per Day',
                    labels={'submission_date': 'Date', 'total_specimens': 'Specimens Collected'},
                    color='total_specimens',
                    color_continuous_scale='Blues'
                )
                st.plotly_chart(fig2, use_container_width=True)
            
            # ===== TOP PERFORMERS =====
            st.subheader("🏆 Top Performing Collectors")
            
            col1, col2 = st.columns(2)
            
            with col1:
                # By houses collected
                top_by_houses = collector_summary.nlargest(10, 'total_houses_collected')[
                    ['collector_name', 'total_houses_collected', 'district']
                ].copy()
                
                if len(top_by_houses) > 0:
                    fig = px.bar(
                        top_by_houses,
                        x='total_houses_collected',
                        y='collector_name',
                        orientation='h',
                        title='Top 10 by Houses Collected',
                        labels={'total_houses_collected': 'Houses', 'collector_name': 'Collector'},
                        color='total_houses_collected',
                        color_continuous_scale='Greens',
                        hover_data=['district']
                    )
                    fig.update_layout(yaxis={'categoryorder': 'total ascending'})
                    st.plotly_chart(fig, use_container_width=True)
            
            with col2:
                # By specimens collected
                top_by_specimens = collector_summary.nlargest(10, 'total_specimens_collected')[
                    ['collector_name', 'total_specimens_collected', 'district']
                ].copy()
                
                if len(top_by_specimens) > 0:
                    fig = px.bar(
                        top_by_specimens,
                        x='total_specimens_collected',
                        y='collector_name',
                        orientation='h',
                        title='Top 10 by Specimens Collected',
                        labels={'total_specimens_collected': 'Specimens', 'collector_name': 'Collector'},
                        color='total_specimens_collected',
                        color_continuous_scale='Blues',
                        hover_data=['district']
                    )
                    fig.update_layout(yaxis={'categoryorder': 'total ascending'})
                    st.plotly_chart(fig, use_container_width=True)
            
            # ===== COLLECTORS NEEDING ATTENTION =====
            st.subheader("⚠️ Collectors Needing Follow-Up")
            
            needs_attention = tracker.get_collectors_needing_attention()
            
            if len(needs_attention) > 0:
                # Create priority score
                needs_attention['priority_score'] = 0
                needs_attention.loc[needs_attention['activity_status'] == 'No Submissions', 'priority_score'] += 3
                needs_attention.loc[needs_attention['activity_status'] == 'Dormant (> 30 days)', 'priority_score'] += 2
                needs_attention.loc[needs_attention['activity_status'] == 'Inactive (7-30 days)', 'priority_score'] += 1
                needs_attention.loc[needs_attention['training_status'] == 'No Training Record', 'priority_score'] += 3
                needs_attention.loc[needs_attention['training_status'] == 'Needs Training (> 180 days)', 'priority_score'] += 2
                needs_attention.loc[needs_attention['training_status'] == 'Due for Refresher (90-180 days)', 'priority_score'] += 1
                
                needs_attention = needs_attention.sort_values('priority_score', ascending=False)
                
                # Display table
                display_cols = [
                    'collector_name', 'district', 'site', 'activity_status', 
                    'days_since_last_submission', 'training_status', 'days_since_training'
                ]
                
                st.dataframe(
                    needs_attention[display_cols].head(20),
                    use_container_width=True,
                    hide_index=True
                )
                
                st.info(f"📋 Showing {min(20, len(needs_attention))} of {len(needs_attention)} collectors needing follow-up")
            else:
                st.success("✅ All collectors are active and up-to-date with training!")
            
            # ===== DETAILED COLLECTOR TABLE =====
            st.subheader("📋 All Collectors - Detailed View")
            
            # Add filters for the table
            col1, col2, col3 = st.columns(3)
            
            with col1:
                status_filter = st.multiselect(
                    "Filter by Activity Status",
                    options=collector_summary['activity_status'].unique(),
                    default=None
                )
            
            with col2:
                training_filter = st.multiselect(
                    "Filter by Training Status",
                    options=collector_summary['training_status'].unique(),
                    default=None
                )
            
            with col3:
                district_filter = st.multiselect(
                    "Filter by District",
                    options=collector_summary['district'].dropna().unique(),
                    default=None
                )
            
            # Apply filters
            filtered_collectors = collector_summary.copy()
            
            if status_filter:
                filtered_collectors = filtered_collectors[filtered_collectors['activity_status'].isin(status_filter)]
            
            if training_filter:
                filtered_collectors = filtered_collectors[filtered_collectors['training_status'].isin(training_filter)]
            
            if district_filter:
                filtered_collectors = filtered_collectors[filtered_collectors['district'].isin(district_filter)]
            
            # Display table
            display_cols = [
                'collector_name', 'district', 'site', 'status', 
                'last_submission_date', 'days_since_last_submission',
                'total_submission_days', 'total_houses_collected', 
                'total_specimens_collected', 'last_training_date',
                'days_since_training', 'activity_status', 'training_status'
            ]
            
            st.dataframe(
                filtered_collectors[display_cols],
                use_container_width=True,
                hide_index=True
            )
            
            # Download button for collector data
            csv = filtered_collectors.to_csv(index=False).encode('utf-8')
            st.download_button(
                label="📥 Download Collector Data",
                data=csv,
                file_name=f"field_collectors_{datetime.now().strftime('%Y%m%d')}.csv",
                mime="text/csv"
            )
            
            # ===== DISTRICT PERFORMANCE =====
            st.subheader("🗺️ Performance by District")

            # Guard: ensure 'district' column exists
            if 'district' not in collector_summary.columns:
                st.info("No district information available in collector summary.")
            else:
                # Build district summary (keep NaNs as a bucket so shapes match)
                district_summary = (
                    collector_summary
                    .groupby('district', dropna=False)
                    .agg({
                        'collector_name': 'count',
                        'total_houses_collected': 'sum',
                        'total_specimens_collected': 'sum',
                    })
                    .reset_index()
                    .rename(columns={
                        'district': 'District',
                        'collector_name': 'Num Collectors',
                        'total_houses_collected': 'Total Houses',
                        'total_specimens_collected': 'Total Specimens'
                    })
                )

                # Active collectors per district
                active_by_district = (
                    collector_summary[collector_summary['activity_status'] == 'Active (< 7 days)']
                    .groupby('district', dropna=False)
                    .size()
                    .reset_index(name='Active Collectors')
                    .rename(columns={'district': 'District'})
                )

                # Merge safely
                district_summary = district_summary.merge(active_by_district, on='District', how='left')
                district_summary['Active Collectors'] = district_summary['Active Collectors'].fillna(0).astype(int)

                col1, col2 = st.columns(2)

                with col1:
                    fig = px.bar(
                        district_summary,
                        x='District',
                        y=['Num Collectors', 'Active Collectors'],
                        title='Collectors per District (Total vs Active)',
                        labels={'value': 'Count', 'variable': 'Type'},
                        barmode='group'
                    )
                    st.plotly_chart(fig, use_container_width=True)

                with col2:
                    fig = px.bar(
                        district_summary,
                        x='District',
                        y='Total Specimens',
                        title='Total Specimens Collected by District',
                        color='Total Specimens',
                        color_continuous_scale='Viridis'
                    )
                    st.plotly_chart(fig, use_container_width=True)
    
    # Footer
    st.markdown("---")
    st.markdown("""
        <div style='text-align: center; color: #666; padding: 2rem;'>
            <p>VectorResearch Dashboard | Powered by Streamlit & Plotly</p>
            <p>Last updated: {}</p>
        </div>
    """.format(datetime.now().strftime("%Y-%m-%d %H:%M:%S")), unsafe_allow_html=True)


if __name__ == "__main__":
    main()
export interface SurveillanceData {
  SessionID: number;
  SessionCollectorName: string;
  SessionCollectionDate: string;
  SiteDistrict: string;
  SessionCollectionMethod: string;
  NumPeopleSleptInHouse: number;
  NumLlinsAvailable: number;
  WasIrsConducted: string;
  LlinType: string;
  LlinBrand: string;
}

export interface SpecimenData {
  SpecimenID: string;
  SessionID: number;
  Species: string;
  Sex: string;
  AbdomenStatus: string;
  CapturedAt: string;
}

export interface Metrics {
  summary: {
    totalCollections: number;
    totalSpecimens: number;
    dateRange: {
      start: string;
      end: string;
    };
    uniqueSites: number;
    uniqueCollectors: number;
    countries: string[];
  };
  temporal: {
    collectionsByMonth: Record<string, number>;
    specimensByMonth: Record<string, number>;
    collectionsOverTime: Array<{
      date: string;
      yearMonth: string;
    }>;
  };
  species: {
    speciesCounts: Record<string, number>;
    anophelesCounts: Record<string, number>;
    anophelesSexRatio: Record<string, number>;
    totalAnopheles: number;
    anophelesPercentage: number;
  };
  collectionMethods: {
    collectionsByMethod: Record<string, number>;
    specimensByMethod: Record<string, number>;
    specimensPerCollection: Record<string, number>;
  };
  geographic: {
    collectionsByDistrict: Record<string, number>;
    specimensByDistrict: Record<string, number>;
    districts: string[];
  };
  interventions: {
    irsCoverage: Record<string, number>;
    irsRatePercent: number;
    llinCoverage: {
      totalLlins: number;
      avgLlinsPerHouse: number;
      housesWithLlins: number;
    };
    avgLlinUsageRate: number;
    llinTypes: Record<string, number>;
  };
  indoorDensity: {
    totalPscCollections: number;
    avgMosquitoesPerHouse: number;
    avgAnophelesPerHouse: number;
  };
  bloodFeeding: {
    overallFeedingStatus: Record<string, number>;
    anophelesFeedingStatus: Record<string, number>;
    overallFeedingRate: number;
    anophelesFeedingRate: number;
  };
  dataQuality: {
    qualityFlags: Record<string, number>;
    missingData: Record<string, number>;
    completenessRate: number;
  };
}

export interface CompletenessData {
  district: string;
  totalHouses: number;
  housesWithData: number;
  housesWithCompleteData: number;
  submissionRate: number;
  completenessRate: number;
  fieldCompleteness: Record<string, number>;
}

export interface Collector {
  collector_name: string;
  district: string;
  total_submissions: number;
  activity_status: string;
  training_status: string;
  last_submission: string;
}
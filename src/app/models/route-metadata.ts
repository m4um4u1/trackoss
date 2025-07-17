/**
 * Route metadata interfaces for enhanced route information
 */

export interface RouteMetadata {
  // Surface and terrain
  surface?: SurfaceType;
  terrain?: TerrainType;
  roadTypes?: RoadType[]; // Multiple road types for a route

  // Difficulty and ratings
  difficulty?: DifficultyLevel;
  scenicRating?: Rating;
  safetyRating?: Rating;

  // Traffic and infrastructure
  trafficLevel?: TrafficLevel;
  bikeInfrastructure?: BikeInfrastructure[];

  // Environmental conditions
  weatherConditions?: WeatherConditions;
  bestTimeOfDay?: TimeOfDay[];
  bestSeason?: Season[];

  // Route characteristics
  maxGradient?: number; // percentage
  averageGradient?: number; // percentage
  technicalDifficulty?: TechnicalDifficulty;

  // Points of interest
  pointsOfInterest?: PointOfInterest[];

  // Additional notes
  notes?: string;
  tags?: string[];
}

export enum SurfaceType {
  ASPHALT = 'asphalt',
  CONCRETE = 'concrete',
  GRAVEL = 'gravel',
  DIRT = 'dirt',
  SAND = 'sand',
  GRASS = 'grass',
  MIXED = 'mixed',
  UNKNOWN = 'unknown',
}

export enum TerrainType {
  FLAT = 'flat',
  ROLLING = 'rolling',
  HILLY = 'hilly',
  MOUNTAINOUS = 'mountainous',
  MIXED = 'mixed',
}

export enum RoadType {
  HIGHWAY = 'highway',
  ARTERIAL = 'arterial',
  COLLECTOR = 'collector',
  LOCAL_STREET = 'local_street',
  RESIDENTIAL = 'residential',
  BIKE_PATH = 'bike_path',
  BIKE_LANE = 'bike_lane',
  SHARED_USE_PATH = 'shared_use_path',
  TRAIL = 'trail',
  SINGLE_TRACK = 'single_track',
  FIRE_ROAD = 'fire_road',
  GRAVEL_ROAD = 'gravel_road',
  DIRT_ROAD = 'dirt_road',
  PAVED_ROAD = 'paved_road',
  BRIDGE = 'bridge',
  TUNNEL = 'tunnel',
  FERRY = 'ferry',
  BOARDWALK = 'boardwalk',
  STAIRS = 'stairs',
  PEDESTRIAN_ONLY = 'pedestrian_only',
}

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;
export type Rating = 1 | 2 | 3 | 4 | 5;

export enum TrafficLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

export enum BikeInfrastructure {
  BIKE_LANE = 'bike_lane',
  PROTECTED_BIKE_LANE = 'protected_bike_lane',
  SHARED_PATH = 'shared_path',
  BIKE_PATH = 'bike_path',
  SHARED_ROAD = 'shared_road',
  MOUNTAIN_TRAIL = 'mountain_trail',
  GRAVEL_PATH = 'gravel_path',
}

export interface WeatherConditions {
  temperature?: number; // Celsius
  windSpeed?: number; // km/h
  windDirection?: string;
  humidity?: number; // percentage
  conditions?: WeatherType;
}

export enum WeatherType {
  SUNNY = 'sunny',
  PARTLY_CLOUDY = 'partly_cloudy',
  CLOUDY = 'cloudy',
  RAINY = 'rainy',
  WINDY = 'windy',
  FOGGY = 'foggy',
}

export enum TimeOfDay {
  EARLY_MORNING = 'early_morning',
  MORNING = 'morning',
  MIDDAY = 'midday',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
  NIGHT = 'night',
}

export enum Season {
  SPRING = 'spring',
  SUMMER = 'summer',
  AUTUMN = 'autumn',
  WINTER = 'winter',
}

export enum TechnicalDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

export interface PointOfInterest {
  name: string;
  type: POIType;
  description?: string;
  latitude: number;
  longitude: number;
}

export enum POIType {
  CAFE = 'cafe',
  RESTAURANT = 'restaurant',
  BIKE_SHOP = 'bike_shop',
  REST_STOP = 'rest_stop',
  VIEWPOINT = 'viewpoint',
  WATER_FOUNTAIN = 'water_fountain',
  TOILET = 'toilet',
  PARKING = 'parking',
  LANDMARK = 'landmark',
  DANGER = 'danger',
  REPAIR_STATION = 'repair_station',
}

/**
 * Helper function to convert RouteMetadata to JSON string for API
 */
export function serializeRouteMetadata(metadata: RouteMetadata): string {
  return JSON.stringify(metadata);
}

/**
 * Helper function to parse JSON string from API to RouteMetadata
 */
export function deserializeRouteMetadata(metadataJson: string): RouteMetadata {
  try {
    return JSON.parse(metadataJson) as RouteMetadata;
  } catch (error) {
    console.warn('Failed to parse route metadata:', error);
    return {};
  }
}

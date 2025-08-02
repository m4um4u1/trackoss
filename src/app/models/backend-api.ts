/**
 * TypeScript interfaces for TrackOSS Backend API
 * Based on OpenAPI 3.0.1 specification
 */

export interface RouteCreateRequest {
  name: string;
  description?: string;
  routeType: RouteType;
  isPublic: boolean;
  points: RoutePointRequest[];
  metadata?: string; // JSON string for additional metadata
  totalDistance?: number; // meters
  totalElevationGain?: number; // meters
  estimatedDuration?: number; // seconds
}

export interface RoutePointRequest {
  latitude: number;
  longitude: number;
  elevation?: number; // meters
  name?: string; // for waypoints
  description?: string;
  pointType: PointType;
}

export interface RouteResponse {
  id: string; // UUID
  name: string;
  description?: string;
  createdAt: number[]; // ISO date-time
  updatedAt: number[]; // ISO date-time
  userId: string;
  totalDistance: number; // meters
  totalElevationGain: number; // meters
  estimatedDuration: number; // seconds
  routeType: RouteType;
  isPublic: boolean;
  metadata?: string; // JSON string
  points: RoutePointResponse[];
  pointCount: number;
}

export interface RoutePointResponse {
  id: string; // UUID
  sequenceOrder: number;
  latitude: number;
  longitude: number;
  elevation?: number; // meters
  timestamp?: string; // ISO date-time
  pointType: PointType;
  name?: string;
  description?: string;
}

export enum RouteType {
  CYCLING = 'CYCLING',
  MOUNTAIN_BIKING = 'MOUNTAIN_BIKING',
  ROAD_CYCLING = 'ROAD_CYCLING',
  GRAVEL = 'GRAVEL',
  E_BIKE = 'E_BIKE',
  HIKING = 'HIKING',
  RUNNING = 'RUNNING',
  WALKING = 'WALKING',
  OTHER = 'OTHER',
}

export enum PointType {
  WAYPOINT = 'WAYPOINT',
  TRACK_POINT = 'TRACK_POINT',
  ROUTE_POINT = 'ROUTE_POINT',
  START_POINT = 'START_POINT',
  END_POINT = 'END_POINT',
}

export interface ApiError {
  timestamp: number;
  status: number;
  error: string;
  path: string;
  message?: string;
}

export interface PageableRequest {
  page: number;
  size: number;
  sort?: string[];
}

export interface PageResponse<T> {
  totalPages: number;
  totalElements: number;
  first: boolean;
  size: number;
  content: T[];
  number: number;
  numberOfElements: number;
  last: boolean;
  empty: boolean;
}

export interface NearbyRoutesRequest {
  latitude: number;
  longitude: number;
  radiusKm: number;
  pageable: PageableRequest;
}

export interface RouteSearchRequest {
  search?: string;
  userId?: string;
  publicOnly?: boolean;
  pageable: PageableRequest;
}

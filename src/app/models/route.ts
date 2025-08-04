import { Coordinates } from './coordinates';

export interface RoutePoint {
  coordinates: Coordinates;
  type: 'start' | 'end' | 'waypoint';
  id?: string;
  name?: string;
  order?: number;
}

export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][]; // [lon, lat] format for GeoJSON
}

export interface RouteFeature {
  type: 'Feature';
  properties: {
    distance?: number;
    duration?: number;
    [key: string]: any;
  };
  geometry: RouteGeometry;
}

export interface RouteData {
  type: 'FeatureCollection';
  features: RouteFeature[];
}

export interface RouteOptions {
  costing?: 'bicycle' | 'pedestrian';
  bicycleType?: 'road' | 'hybrid' | 'city' | 'cross' | 'mountain';
  color?: string;
  width?: number;
}

export interface RouteResult {
  startPoint: Coordinates;
  endPoint: Coordinates;
  routeData: RouteData;
  distance?: number;
  duration?: number;
  rawResponse?: any;
}

export interface MultiWaypointRoute {
  waypoints: RoutePoint[]; // User-defined waypoints only
  routeData: RouteData;
  totalDistance?: number;
  totalDuration?: number;
  legs?: RouteLeg[];
  rawResponse?: any;
}

export interface RouteLeg {
  startPoint: Coordinates;
  endPoint: Coordinates;
  distance?: number;
  duration?: number;
  geometry: RouteGeometry;
}

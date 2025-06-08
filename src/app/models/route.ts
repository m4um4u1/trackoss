import { Coordinates } from './coordinates';

export interface RoutePoint {
  coordinates: Coordinates;
  type: 'start' | 'end' | 'waypoint';
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

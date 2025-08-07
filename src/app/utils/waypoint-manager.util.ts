import { RoutePoint } from '../models/route';

/**
 * Utility class for managing waypoints with consistent type assignment
 */
export class WaypointManager {
  /**
   * Reassign waypoint types based on their position in the array
   */
  static reassignWaypointTypes(waypoints: RoutePoint[]): RoutePoint[] {
    return waypoints.map((waypoint, index) => ({
      ...waypoint,
      order: index,
      type: WaypointManager.getWaypointType(index, waypoints.length),
    }));
  }

  /**
   * Get the appropriate waypoint type based on position
   */
  private static getWaypointType(index: number, totalCount: number): 'start' | 'waypoint' | 'end' {
    if (totalCount === 1) return 'start';
    if (index === 0) return 'start';
    if (index === totalCount - 1) return 'end';
    return 'waypoint';
  }

  /**
   * Create a new waypoint with proper type assignment
   */
  static createWaypoint(
    coordinates: { lat: number; lon: number },
    name: string,
    existingWaypoints: RoutePoint[],
  ): RoutePoint {
    const newOrder = existingWaypoints.length;
    const type = WaypointManager.getWaypointType(newOrder, existingWaypoints.length + 1);

    return {
      coordinates,
      type,
      id: `waypoint-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      order: newOrder,
    };
  }

  /**
   * Add a waypoint to the end of the list with proper type reassignment
   */
  static addWaypoint(
    existingWaypoints: RoutePoint[],
    coordinates: { lat: number; lon: number },
    name: string,
  ): RoutePoint[] {
    const newWaypoint = WaypointManager.createWaypoint(coordinates, name, existingWaypoints);
    const updatedWaypoints = [...existingWaypoints, newWaypoint];
    return WaypointManager.reassignWaypointTypes(updatedWaypoints);
  }

  /**
   * Remove a waypoint by index with proper type reassignment
   */
  static removeWaypoint(waypoints: RoutePoint[], index: number): RoutePoint[] {
    if (index < 0 || index >= waypoints.length) {
      return waypoints;
    }

    const filteredWaypoints = waypoints.filter((_, i) => i !== index);
    return WaypointManager.reassignWaypointTypes(filteredWaypoints);
  }

  /**
   * Reorder waypoints (for drag and drop) with proper type reassignment
   */
  static reorderWaypoints(waypoints: RoutePoint[], previousIndex: number, currentIndex: number): RoutePoint[] {
    if (
      previousIndex < 0 ||
      previousIndex >= waypoints.length ||
      currentIndex < 0 ||
      currentIndex >= waypoints.length
    ) {
      return waypoints;
    }

    const reorderedWaypoints = [...waypoints];
    const [movedWaypoint] = reorderedWaypoints.splice(previousIndex, 1);
    reorderedWaypoints.splice(currentIndex, 0, movedWaypoint);

    return WaypointManager.reassignWaypointTypes(reorderedWaypoints);
  }

  /**
   * Reverse the order of waypoints with proper type reassignment
   */
  static reverseWaypoints(waypoints: RoutePoint[]): RoutePoint[] {
    const reversedWaypoints = [...waypoints].reverse();
    return WaypointManager.reassignWaypointTypes(reversedWaypoints);
  }

  /**
   * Check if waypoints are sufficient for route calculation
   */
  static canCalculateRoute(waypoints: RoutePoint[]): boolean {
    return waypoints.length >= 2;
  }

  /**
   * Get display name for a waypoint
   */
  static getDisplayName(waypoint: RoutePoint): string {
    return waypoint.name || `${waypoint.coordinates.lat.toFixed(4)}, ${waypoint.coordinates.lon.toFixed(4)}`;
  }

  /**
   * Get CSS class for waypoint icon based on type
   */
  static getIconClass(type: string): string {
    switch (type) {
      case 'start':
        return 'waypoint-start';
      case 'end':
        return 'waypoint-end';
      default:
        return 'waypoint-intermediate';
    }
  }
}

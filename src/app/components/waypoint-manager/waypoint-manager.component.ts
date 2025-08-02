import { ChangeDetectionStrategy, Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { MultiWaypointRoute, RoutePoint } from '../../models/route';
import { Coordinates } from '../../models/coordinates';

@Component({
  selector: 'app-waypoint-manager',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './waypoint-manager.component.html',
  styleUrls: ['./waypoint-manager.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaypointManagerComponent {
  @Input() set waypoints(value: RoutePoint[]) {
    this._waypoints.set(value);
  }
  get waypoints(): RoutePoint[] {
    return this._waypoints();
  }
  @Input() multiWaypointRoute: MultiWaypointRoute | null = null;

  // Internal signal for waypoints to make computed signals reactive
  private readonly _waypoints = signal<RoutePoint[]>([]);

  // Output events
  @Output() waypointsChanged = new EventEmitter<RoutePoint[]>();
  @Output() waypointRemoved = new EventEmitter<string>();
  @Output() waypointsCleared = new EventEmitter<void>();
  @Output() routeCalculated = new EventEmitter<void>();

  // Signal-based internal state management
  private readonly _newWaypointText = signal('');
  private readonly _isAddingWaypoint = signal(false);

  // Public readonly signals
  readonly newWaypointText = this._newWaypointText.asReadonly();
  readonly isAddingWaypoint = this._isAddingWaypoint.asReadonly();

  // Computed signals for derived state
  readonly hasWaypoints = computed(() => this._waypoints().length > 0);
  readonly canAddWaypoint = computed(() => this._newWaypointText().trim().length > 0 && !this._isAddingWaypoint());
  readonly canCalculateRoute = computed(() => this._waypoints().length >= 2);
  readonly waypointCount = computed(() => this._waypoints().length);
  readonly totalDistance = computed(() => {
    if (!this.multiWaypointRoute?.legs) return 0;
    return this.multiWaypointRoute.legs.reduce((total, leg) => total + (leg.distance || 0), 0);
  });
  readonly totalDuration = computed(() => {
    if (!this.multiWaypointRoute?.legs) return 0;
    return this.multiWaypointRoute.legs.reduce((total, leg) => total + (leg.duration || 0), 0);
  });

  // Methods to update signals from template
  updateNewWaypointText(value: string): void {
    this._newWaypointText.set(value);
  }

  /**
   * Add a new waypoint by geocoding text input
   */
  async addWaypoint(): Promise<void> {
    if (!this.canAddWaypoint()) return;

    this._isAddingWaypoint.set(true);

    try {
      const coordinates = await this.geocodeLocation(this._newWaypointText());
      if (coordinates) {
        // Create a copy of the current waypoints array
        const updatedWaypoints = [...this._waypoints()];

        const newWaypoint: RoutePoint = {
          coordinates,
          type: updatedWaypoints.length === 0 ? 'start' : 'waypoint',
          id: `waypoint-${Date.now()}`,
          name: this._newWaypointText(),
          order: updatedWaypoints.length,
        };

        // If this is the second waypoint, make it the end point
        if (updatedWaypoints.length === 1) {
          newWaypoint.type = 'end';
        } else if (updatedWaypoints.length > 1) {
          // Update the previous end point to be a waypoint
          const lastWaypoint = updatedWaypoints[updatedWaypoints.length - 1];
          if (lastWaypoint.type === 'end') {
            lastWaypoint.type = 'waypoint';
          }
          newWaypoint.type = 'end';
        }

        updatedWaypoints.push(newWaypoint);

        // Update internal signal immediately
        this._waypoints.set([...updatedWaypoints]);

        // Emit the change - parent will update the waypoints input
        this.waypointsChanged.emit([...updatedWaypoints]);
        this._newWaypointText.set('');
      } else {
        console.error('Failed to geocode location');
      }
    } catch (error) {
      console.error('Error adding waypoint:', error);
    } finally {
      this._isAddingWaypoint.set(false);
    }
  }

  /**
   * Remove a waypoint by ID
   */
  removeWaypoint(waypointId: string): void {
    const updatedWaypoints = this._waypoints().filter((wp) => wp.id !== waypointId);

    // Reassign types and orders
    updatedWaypoints.forEach((wp, index) => {
      wp.order = index;
      if (index === 0) {
        wp.type = 'start';
      } else if (index === updatedWaypoints.length - 1) {
        wp.type = 'end';
      } else {
        wp.type = 'waypoint';
      }
    });

    // Update internal signal immediately
    this._waypoints.set([...updatedWaypoints]);

    // Emit the change - parent will update the waypoints input
    this.waypointsChanged.emit([...updatedWaypoints]);
    this.waypointRemoved.emit(waypointId);
  }

  /**
   * Clear all waypoints
   */
  clearAllWaypoints(): void {
    // Update internal signal immediately
    this._waypoints.set([]);

    this.waypointsChanged.emit([]);
    this.waypointsCleared.emit();
  }

  /**
   * Move waypoint up in the order
   */
  moveWaypointUp(index: number): void {
    if (index > 0) {
      const waypoints = [...this._waypoints()];
      const temp = waypoints[index];
      waypoints[index] = waypoints[index - 1];
      waypoints[index - 1] = temp;
      this.updateWaypointOrdersInArray(waypoints);

      // Update internal signal immediately
      this._waypoints.set([...waypoints]);

      this.waypointsChanged.emit([...waypoints]);
    }
  }

  /**
   * Move waypoint down in the order
   */
  moveWaypointDown(index: number): void {
    if (index < this._waypoints().length - 1) {
      const waypoints = [...this._waypoints()];
      const temp = waypoints[index];
      waypoints[index] = waypoints[index + 1];
      waypoints[index + 1] = temp;
      this.updateWaypointOrdersInArray(waypoints);

      // Update internal signal immediately
      this._waypoints.set([...waypoints]);

      this.waypointsChanged.emit([...waypoints]);
    }
  }

  /**
   * Calculate route through all waypoints
   */
  calculateRoute(): void {
    if (this._waypoints().length >= 2) {
      this.routeCalculated.emit();
    }
  }

  /**
   * Get display name for waypoint
   */
  getWaypointDisplayName(waypoint: RoutePoint): string {
    return (
      waypoint.name ||
      `${waypoint.type} (${waypoint.coordinates.lat.toFixed(4)}, ${waypoint.coordinates.lon.toFixed(4)})`
    );
  }

  /**
   * Format distance for display
   * @param distance Distance in meters
   */
  formatDistance(distance: number): string {
    // Ensure we have a valid number
    if (isNaN(distance)) {
      return 'N/A';
    }

    // If less than 1km, show in meters
    if (distance < 1000) {
      return `${Math.round(distance)} m`;
    }

    // For 1km or more, convert to kilometers
    const distanceInKm = distance / 1000;
    const kilometers = Math.floor(distanceInKm);
    const remainingMeters = Math.round((distanceInKm - kilometers) * 1000);

    if (remainingMeters > 0) {
      return `${kilometers} km ${remainingMeters} m`;
    } else {
      return `${kilometers} km`;
    }
  }

  /**
   * Format duration for display
   */
  formatDuration(duration: number): string {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Get route leg information for a specific waypoint segment
   */
  getRouteLegInfo(index: number): { distance: number; duration: number } | null {
    if (!this.multiWaypointRoute || !this.multiWaypointRoute.legs || index >= this.multiWaypointRoute.legs.length) {
      return null;
    }

    const leg = this.multiWaypointRoute.legs[index];
    return {
      distance: leg.distance || 0,
      duration: leg.duration || 0,
    };
  }

  /**
   * Update waypoint orders and types after reordering
   */
  private updateWaypointOrders(): void {
    const waypoints = [...this._waypoints()];
    this.updateWaypointOrdersInArray(waypoints);
    this.waypointsChanged.emit([...waypoints]);
  }

  /**
   * Update waypoint orders and types in a given array
   */
  private updateWaypointOrdersInArray(waypoints: RoutePoint[]): void {
    waypoints.forEach((wp, index) => {
      wp.order = index;
      if (index === 0) {
        wp.type = 'start';
      } else if (index === waypoints.length - 1) {
        wp.type = 'end';
      } else {
        wp.type = 'waypoint';
      }
    });
  }

  /**
   * Geocode a location string to coordinates
   */
  private async geocodeLocation(locationText: string): Promise<Coordinates | null> {
    const baseUrl = 'https://nominatim.openstreetmap.org/search?q=';
    const format = '&format=json&limit=1';
    const url = `${baseUrl}${encodeURIComponent(locationText)}${format}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data && data.length > 0 && data[0].lat && data[0].lon) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
        };
      }

      throw new Error(`No results found for location: ${locationText}`);
    } catch (error) {
      console.error('Error geocoding location:', error);
      return null;
    }
  }
}

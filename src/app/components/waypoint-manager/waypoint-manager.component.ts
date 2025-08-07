import { ChangeDetectionStrategy, Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { MultiWaypointRoute, RoutePoint } from '../../models/route';
import { Coordinates } from '../../models/coordinates';

@Component({
  selector: 'app-waypoint-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
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
  private readonly _editingId = signal<string | null>(null);
  private readonly _editingName = signal('');
  private readonly _pendingInsertIndex = signal<number | null>(null);

  // Public readonly signals
  readonly newWaypointText = this._newWaypointText.asReadonly();
  readonly isAddingWaypoint = this._isAddingWaypoint.asReadonly();
  readonly editingId = this._editingId.asReadonly();
  readonly editingName = this._editingName.asReadonly();
  readonly pendingInsertIndex = this._pendingInsertIndex.asReadonly();

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

  /** Start inline editing for a waypoint */
  startEditing(waypoint: RoutePoint): void {
    this._editingId.set(waypoint.id ?? null);
    this._editingName.set(waypoint.name ?? '');
  }

  /** Commit inline edit */
  commitEdit(waypoint: RoutePoint): void {
    const name = this._editingName().trim();
    if (this._editingId() && name.length >= 0) {
      const updated = this._waypoints().map((wp) => (wp.id === waypoint.id ? { ...wp, name } : wp));
      this._waypoints.set(updated);
      this.waypointsChanged.emit([...updated]);
    }
    this._editingId.set(null);
    this._editingName.set('');
  }

  /** Cancel inline edit */
  cancelEdit(): void {
    this._editingId.set(null);
    this._editingName.set('');
  }

  /** Update editing name from template */
  onEditingNameChange(value: string): void {
    this._editingName.set(value);
  }

  /** Handle drag and drop reordering */
  drop(event: CdkDragDrop<RoutePoint[]>): void {
    const arr = [...this._waypoints()];
    moveItemInArray(arr, event.previousIndex, event.currentIndex);
    this.updateWaypointOrdersInArray(arr);
    this._waypoints.set(arr);
    this.waypointsChanged.emit([...arr]);
  }

  /** Mark a segment to insert the next waypoint at index */
  requestInsertAt(index: number): void {
    this._pendingInsertIndex.set(index);
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

        const insertIndex = this._pendingInsertIndex();
        if (insertIndex !== null) {
          // Insert at requested position between legs
          updatedWaypoints.splice(insertIndex, 0, newWaypoint);
          this.updateWaypointOrdersInArray(updatedWaypoints);
          this._pendingInsertIndex.set(null);
        } else {
          // Append logic with end reassignment
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
        }

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

  /** Reverse the order of waypoints */
  reverseWaypoints(): void {
    const arr = [...this._waypoints()].reverse();
    this.updateWaypointOrdersInArray(arr);
    this._waypoints.set(arr);
    this.waypointsChanged.emit([...arr]);
  }

  /** Move waypoint up in the order (fallback for non-drag environments) */
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

  /** Move waypoint down in the order (fallback for non-drag environments) */
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

  /** Quick actions to set a waypoint as start or end */
  setAsStart(index: number): void {
    const arr = [...this._waypoints()];
    const [wp] = arr.splice(index, 1);
    arr.unshift(wp);
    this.updateWaypointOrdersInArray(arr);
    this._waypoints.set(arr);
    this.waypointsChanged.emit([...arr]);
  }

  setAsEnd(index: number): void {
    const arr = [...this._waypoints()];
    const [wp] = arr.splice(index, 1);
    arr.push(wp);
    this.updateWaypointOrdersInArray(arr);
    this._waypoints.set(arr);
    this.waypointsChanged.emit([...arr]);
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

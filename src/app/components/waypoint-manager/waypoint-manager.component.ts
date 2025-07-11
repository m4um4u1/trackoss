import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoutePoint, MultiWaypointRoute } from '../../models/route';
import { Coordinates } from '../../models/coordinates';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environments';

@Component({
  selector: 'app-waypoint-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './waypoint-manager.component.html',
  styleUrls: ['./waypoint-manager.component.scss'],
})
export class WaypointManagerComponent {
  @Input() waypoints: RoutePoint[] = [];
  @Input() enableWaypointMode: boolean = false;
  @Input() multiWaypointRoute: MultiWaypointRoute | null = null;

  @Output() waypointsChanged = new EventEmitter<RoutePoint[]>();
  @Output() waypointModeToggled = new EventEmitter<boolean>();
  @Output() waypointRemoved = new EventEmitter<string>();
  @Output() waypointsCleared = new EventEmitter<void>();
  @Output() routeCalculated = new EventEmitter<void>();

  newWaypointText: string = '';
  isAddingWaypoint: boolean = false;

  constructor() {}

  /**
   * Toggle waypoint mode on/off
   */
  toggleWaypointMode(): void {
    this.enableWaypointMode = !this.enableWaypointMode;
    this.waypointModeToggled.emit(this.enableWaypointMode);

    if (!this.enableWaypointMode) {
      this.clearAllWaypoints();
    }
  }

  /**
   * Add a new waypoint by geocoding text input
   */
  async addWaypoint(): Promise<void> {
    if (!this.newWaypointText.trim() || this.isAddingWaypoint) return;

    this.isAddingWaypoint = true;

    try {
      const coordinates = await this.geocodeLocation(this.newWaypointText);
      if (coordinates) {
        // Create a copy of the current waypoints array
        const updatedWaypoints = [...this.waypoints];

        const newWaypoint: RoutePoint = {
          coordinates,
          type: updatedWaypoints.length === 0 ? 'start' : 'waypoint',
          id: `waypoint-${Date.now()}`,
          name: this.newWaypointText,
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

        // Update the local waypoints array and emit the change
        this.waypoints = updatedWaypoints;
        this.waypointsChanged.emit([...updatedWaypoints]);
        this.newWaypointText = '';
      }
    } catch (error) {
      console.error('Error adding waypoint:', error);
    } finally {
      this.isAddingWaypoint = false;
    }
  }

  /**
   * Remove a waypoint by ID
   */
  removeWaypoint(waypointId: string): void {
    const updatedWaypoints = this.waypoints.filter((wp) => wp.id !== waypointId);

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

    this.waypoints = updatedWaypoints;
    this.waypointsChanged.emit([...updatedWaypoints]);
    this.waypointRemoved.emit(waypointId);
  }

  /**
   * Clear all waypoints
   */
  clearAllWaypoints(): void {
    this.waypointsChanged.emit([]);
    this.waypointsCleared.emit();
  }

  /**
   * Move waypoint up in the order
   */
  moveWaypointUp(index: number): void {
    if (index > 0) {
      const temp = this.waypoints[index];
      this.waypoints[index] = this.waypoints[index - 1];
      this.waypoints[index - 1] = temp;
      this.updateWaypointOrders();
      this.waypointsChanged.emit([...this.waypoints]);
    }
  }

  /**
   * Move waypoint down in the order
   */
  moveWaypointDown(index: number): void {
    if (index < this.waypoints.length - 1) {
      const temp = this.waypoints[index];
      this.waypoints[index] = this.waypoints[index + 1];
      this.waypoints[index + 1] = temp;
      this.updateWaypointOrders();
      this.waypointsChanged.emit([...this.waypoints]);
    }
  }

  /**
   * Calculate route through all waypoints
   */
  calculateRoute(): void {
    if (this.waypoints.length >= 2) {
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
   */
  formatDistance(distance: number): string {
    const kilometers = Math.floor(distance);
    const meters = (distance - kilometers) * 1000;

    if (kilometers > 0) {
      return `${kilometers} km ${Math.round(meters)} m`;
    } else {
      return `${Math.round(meters)} m`;
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
    this.waypoints.forEach((wp, index) => {
      wp.order = index;
      if (index === 0) {
        wp.type = 'start';
      } else if (index === this.waypoints.length - 1) {
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

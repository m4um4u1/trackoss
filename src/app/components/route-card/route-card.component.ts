import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RouteResponse, RouteType } from '../../models/backend-api';
import { RouteMetadata } from '../../models/route-metadata';

@Component({
  selector: 'app-route-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './route-card.component.html',
  styleUrl: './route-card.component.scss',
})
export class RouteCardComponent {
  @Input({ required: true }) route!: RouteResponse;
  @Output() routeViewed = new EventEmitter<string>();
  @Output() routeDeleted = new EventEmitter<string>();

  // Expose enums to template
  RouteType = RouteType;

  get parsedMetadata(): RouteMetadata | null {
    if (!this.route.metadata) return null;
    try {
      return JSON.parse(this.route.metadata);
    } catch {
      return null;
    }
  }

  get formattedDistance(): string {
    // Handle null/undefined values
    if (this.route.totalDistance == null) {
      return 'N/A';
    }

    let distanceInMeters: number;

    // Convert to string to handle potential thousands separators
    // Cast to any to handle potential string values from backend
    const distanceValue = this.route.totalDistance as any;
    const distanceStr = distanceValue.toString();

    // Check if it looks like a thousands separator format
    // Pattern: digits.digits where the part after the dot has exactly 3 digits
    const thousandsSeparatorPattern = /^(\d+)\.(\d{3})$/;
    const match = distanceStr.match(thousandsSeparatorPattern);

    if (match) {
      // This looks like a thousands separator (e.g., "32.021" = 32,021)
      distanceInMeters = parseInt(match[1] + match[2]);
    } else {
      // Normal decimal number or other format
      distanceInMeters = parseFloat(distanceStr);
    }

    // If not a valid number, return appropriate message
    if (isNaN(distanceInMeters)) {
      return 'N/A';
    }

    // If less than 1000m, show only in meters
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)} m`;
    }

    // For 1000m or more, show km and remaining meters
    const km = Math.floor(distanceInMeters / 1000);
    const remainingMeters = Math.round(distanceInMeters % 1000);

    if (remainingMeters === 0) {
      return `${km} km`;
    } else {
      return `${km} km ${remainingMeters} m`;
    }
  }

  get formattedDuration(): string {
    const hours = Math.floor(this.route.estimatedDuration / 3600);
    const minutes = Math.floor((this.route.estimatedDuration % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  get formattedElevation(): string {
    return `${this.route.totalElevationGain}m`;
  }

  get routeTypeIcon(): string {
    switch (this.route.routeType) {
      case RouteType.CYCLING:
      case RouteType.ROAD_CYCLING:
      case RouteType.E_BIKE:
        return 'bi-bicycle';
      case RouteType.MOUNTAIN_BIKING:
        return 'bi-bicycle';
      case RouteType.GRAVEL:
        return 'bi-bicycle';
      case RouteType.WALKING:
        return 'bi-person-walking';
      case RouteType.RUNNING:
        return 'bi-person-running';
      case RouteType.HIKING:
        return 'bi-tree';
      case RouteType.OTHER:
        return 'bi-geo-alt';
      default:
        return 'bi-geo-alt';
    }
  }

  get routeTypeColor(): string {
    switch (this.route.routeType) {
      case RouteType.CYCLING:
      case RouteType.ROAD_CYCLING:
      case RouteType.E_BIKE:
        return 'primary';
      case RouteType.MOUNTAIN_BIKING:
        return 'danger';
      case RouteType.GRAVEL:
        return 'warning';
      case RouteType.WALKING:
        return 'success';
      case RouteType.RUNNING:
        return 'warning';
      case RouteType.HIKING:
        return 'info';
      case RouteType.OTHER:
        return 'secondary';
      default:
        return 'dark';
    }
  }

  get difficultyStars(): number[] {
    const difficulty = this.parsedMetadata?.difficulty || 1;
    return Array(5)
      .fill(0)
      .map((_, i) => (i < difficulty ? 1 : 0));
  }

  get surfaceTypeDisplay(): string {
    const surface = this.parsedMetadata?.surface;
    if (!surface) return '';
    return this.formatEnumValue(surface);
  }

  get formattedCreatedAt(): string {
    // Handle PostGIS timestamp array format [YYYY, MM, DD, HH, MM, SS, milliseconds]
    const rawDate = this.route.createdAt;
    const date = Array.isArray(rawDate)
      ? new Date(rawDate[0], rawDate[1] - 1, rawDate[2], rawDate[3], rawDate[4], rawDate[5])
      : new Date(rawDate);

    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
  }

  onViewRoute() {
    this.routeViewed.emit(this.route.id);
  }

  onDeleteRoute() {
    this.routeDeleted.emit(this.route.id);
  }

  formatRouteType(routeType: RouteType): string {
    return this.formatEnumValue(routeType);
  }

  private formatEnumValue(value: string): string {
    return value
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

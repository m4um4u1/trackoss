import { Component, Input, OnDestroy, OnInit } from '@angular/core';

import { combineLatest, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RouteService } from '../../services/route.service';
import { MultiWaypointRoute, RouteResult } from '../../models/route';
import { Coordinates } from '../../models/coordinates';
import { SaveRouteModalComponent } from '../save-route-modal/save-route-modal.component';

@Component({
  selector: 'app-route-display',
  standalone: true,
  imports: [SaveRouteModalComponent],
  templateUrl: './route-display.component.html',
  styleUrls: ['./route-display.component.scss'],
})
export class RouteDisplayComponent implements OnInit, OnDestroy {
  @Input() showActions: boolean = true;
  @Input() showNoRouteMessage: boolean = true;
  @Input() autoUpdate: boolean = true;

  routeResult: RouteResult | null = null;
  multiWaypointRoute: MultiWaypointRoute | null = null;
  private destroy$ = new Subject<void>();

  // Save route modal state
  showSaveModal: boolean = false;

  constructor(private routeService: RouteService) {}

  ngOnInit(): void {
    if (this.autoUpdate) {
      // Combine both route observables into a single subscription
      combineLatest([this.routeService.getCurrentRoute(), this.routeService.getCurrentMultiWaypointRoute()])
        .pipe(takeUntil(this.destroy$))
        .subscribe(([route, multiRoute]) => {
          this.routeResult = route;
          this.multiWaypointRoute = multiRoute;
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatDistance(distance: number | string): string {
    // Handle null/undefined values
    if (distance == null) {
      return 'N/A';
    }

    let distanceInMeters: number;

    // If it's already a number, use it directly
    if (typeof distance === 'number') {
      distanceInMeters = distance;
    } else {
      // If it's a string, handle potential thousands separators
      const distanceStr = distance.toString().replace(/,/g, '').trim();

      // Try to parse as a number
      distanceInMeters = parseFloat(distanceStr);
    }

    // Handle case where the number might be in kilometers (e.g., 1.5 for 1500m)
    // This is a common convention in many systems
    // Only convert if the value is a decimal between 0 and 100
    if (distanceInMeters > 0 && distanceInMeters < 100 && distance.toString().indexOf('.') !== -1) {
      // If it's a small decimal number, it might be in kilometers
      distanceInMeters *= 1000;
    }

    // Ensure we have a valid number
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

  formatDuration(duration: number): string {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  formatCoordinates(coords: Coordinates): string {
    return `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`;
  }

  exportRoute(): void {
    if (!this.routeResult) return;

    const routeData = {
      startPoint: this.routeResult.startPoint,
      endPoint: this.routeResult.endPoint,
      distance: this.routeResult.distance,
      duration: this.routeResult.duration,
      routeData: this.routeResult.routeData,
    };

    const dataStr = JSON.stringify(routeData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'route.json';
    link.click();

    URL.revokeObjectURL(url);
  }

  shareRoute(): void {
    if (!this.routeResult) return;

    const shareData = {
      title: 'Route Information',
      text: `Route from ${this.formatCoordinates(this.routeResult.startPoint)} to ${this.formatCoordinates(this.routeResult.endPoint)}`,
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      // Fallback: copy to clipboard
      const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Route information copied to clipboard!');
      });
    }
  }

  // Multi-waypoint route methods
  exportMultiWaypointRoute(): void {
    if (!this.multiWaypointRoute) return;

    const routeData = {
      waypoints: this.multiWaypointRoute.waypoints,
      totalDistance: this.multiWaypointRoute.totalDistance,
      totalDuration: this.multiWaypointRoute.totalDuration,
      legs: this.multiWaypointRoute.legs,
      routeData: this.multiWaypointRoute.routeData,
    };

    const dataStr = JSON.stringify(routeData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'multi-waypoint-route.json';
    link.click();

    URL.revokeObjectURL(url);
  }

  shareMultiWaypointRoute(): void {
    if (!this.multiWaypointRoute) return;

    const waypointNames = this.multiWaypointRoute.waypoints
      .map((wp) => wp.name || `${wp.coordinates.lat.toFixed(4)}, ${wp.coordinates.lon.toFixed(4)}`)
      .join(' → ');

    const shareData = {
      title: 'Multi-Waypoint Route Information',
      text: `Route through: ${waypointNames}`,
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      // Fallback: copy to clipboard
      const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
      navigator.clipboard.writeText(shareText).then(() => {
        alert('Route information copied to clipboard!');
      });
    }
  }

  // Helper method to check if we have any route to display
  hasRoute(): boolean {
    return !!(this.routeResult || this.multiWaypointRoute);
  }

  // Helper method to get the appropriate distance
  getDistance(): number | undefined {
    return this.multiWaypointRoute?.totalDistance || this.routeResult?.distance;
  }

  // Helper method to get the appropriate duration
  getDuration(): number | undefined {
    return this.multiWaypointRoute?.totalDuration || this.routeResult?.duration;
  }

  // Save route modal methods
  openSaveModal(): void {
    this.showSaveModal = true;
  }

  closeSaveModal(): void {
    this.showSaveModal = false;
  }

  onRouteSaved(): void {
    // Handle successful route save
    console.log('Route saved successfully');
    // You could emit an event here if needed
  }
}

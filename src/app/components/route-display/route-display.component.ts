import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { RouteService } from '../../services/route.service';
import { RouteResult, MultiWaypointRoute } from '../../models/route';
import { Coordinates } from '../../models/coordinates';

@Component({
  selector: 'app-route-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './route-display.component.html',
  styleUrls: ['./route-display.component.scss'],
})
export class RouteDisplayComponent implements OnInit, OnDestroy {
  @Input() showActions: boolean = true;
  @Input() showNoRouteMessage: boolean = true;
  @Input() autoUpdate: boolean = true;

  routeResult: RouteResult | null = null;
  multiWaypointRoute: MultiWaypointRoute | null = null;
  private routeSubscription?: Subscription;
  private multiWaypointRouteSubscription?: Subscription;

  constructor(private routeService: RouteService) {}

  ngOnInit(): void {
    if (this.autoUpdate) {
      this.routeSubscription = this.routeService.getCurrentRoute().subscribe((route) => (this.routeResult = route));

      this.multiWaypointRouteSubscription = this.routeService
        .getCurrentMultiWaypointRoute()
        .subscribe((multiRoute) => (this.multiWaypointRoute = multiRoute));
    }
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    if (this.multiWaypointRouteSubscription) {
      this.multiWaypointRouteSubscription.unsubscribe();
    }
  }

  formatDistance(distance: number): string {
    const kilometers = Math.floor(distance);
    const meters = (distance - kilometers) * 1000;

    if (kilometers > 0) {
      return `${kilometers} km ${Math.round(meters)} m`;
    } else {
      return `${Math.round(meters)} m`;
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
}

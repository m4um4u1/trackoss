import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  computed,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { Subscription } from 'rxjs';

import { Coordinates } from '../../models/coordinates';
import { MultiWaypointRoute, RoutePoint, RouteOptions } from '../../models/route';
import { RouteService } from '../../services/route.service';
import { AuthService } from '../../services/auth.service';
import { SaveRouteModalComponent } from '../save-route-modal/save-route-modal.component';
import { WaypointManager } from '../../utils/waypoint-manager.util';

@Component({
  selector: 'app-sidepanel',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, SaveRouteModalComponent],
  templateUrl: './sidepanel.component.html',
  styleUrls: ['./sidepanel.component.scss'],
})
export class SidepanelComponent implements OnInit, OnDestroy, OnChanges {
  @Input() waypoints: RoutePoint[] = [];

  @Output() waypointsChanged = new EventEmitter<RoutePoint[]>();
  @Output() routeCalculated = new EventEmitter<void>();
  @Output() routeCleared = new EventEmitter<void>();
  @Output() routeOptionsChanged = new EventEmitter<RouteOptions>();

  // UI state signals
  private readonly _newLocationText = signal('');
  private readonly _isGeocoding = signal(false);

  // Route options
  readonly routeOptions: RouteOptions = {
    costing: 'bicycle',
    bicycleType: 'hybrid',
    color: '#007cbf',
    width: 4,
  };

  // Modal state
  showSaveModal = false;

  // Computed properties
  readonly newLocationText = this._newLocationText.asReadonly();
  readonly isGeocoding = this._isGeocoding.asReadonly();
  readonly canAddLocation = computed(() => this._newLocationText().trim().length > 0 && !this._isGeocoding());

  // Computed getters using WaypointManager
  get canCalculateRoute(): boolean {
    return WaypointManager.canCalculateRoute(this.waypoints);
  }

  get hasWaypoints(): boolean {
    return this.waypoints.length > 0;
  }

  // Template access to waypoints
  get currentWaypoints(): RoutePoint[] {
    return this.waypoints;
  }

  // Route data
  currentMultiWaypointRoute: MultiWaypointRoute | null = null;
  private multiWaypointRouteSubscription?: Subscription;

  constructor(
    private routeService: RouteService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.multiWaypointRouteSubscription = this.routeService
      .getCurrentMultiWaypointRoute()
      .subscribe((route) => (this.currentMultiWaypointRoute = route));
  }

  ngOnDestroy(): void {
    this.multiWaypointRouteSubscription?.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // React to waypoint changes if needed
  }

  updateNewLocationText(value: string): void {
    this._newLocationText.set(value);
  }

  addTestWaypoint(): void {
    const testCoordinates = {
      lat: 52.52 + (Math.random() - 0.5) * 0.01, // Random location near Berlin
      lon: 13.405 + (Math.random() - 0.5) * 0.01,
    };
    const testName = `Test Location ${this.waypoints.length + 1}`;

    const updatedWaypoints = WaypointManager.addWaypoint(this.waypoints, testCoordinates, testName);
    this.waypointsChanged.emit(updatedWaypoints);
  }

  async addLocation(): Promise<void> {
    if (!this.canAddLocation()) return;

    this._isGeocoding.set(true);
    try {
      const coordinates = await this.geocodeLocation(this._newLocationText());
      if (coordinates) {
        const updatedWaypoints = WaypointManager.addWaypoint(this.waypoints, coordinates, this._newLocationText());

        this.waypointsChanged.emit(updatedWaypoints);
        this._newLocationText.set('');
      }
    } catch (error) {
      console.error('Error adding location:', error);
    } finally {
      this._isGeocoding.set(false);
    }
  }

  removeWaypoint(index: number): void {
    const updatedWaypoints = WaypointManager.removeWaypoint(this.waypoints, index);

    // Clear route if we're left with fewer than 2 waypoints
    if (updatedWaypoints.length < 2) {
      this.routeService.clearMultiWaypointRoute();
    }

    this.waypointsChanged.emit(updatedWaypoints);
  }

  drop(event: CdkDragDrop<RoutePoint[]>): void {
    const updatedWaypoints = WaypointManager.reorderWaypoints(this.waypoints, event.previousIndex, event.currentIndex);
    this.waypointsChanged.emit(updatedWaypoints);
  }

  calculateRoute(): void {
    if (this.canCalculateRoute) {
      this.routeCalculated.emit();
    }
  }

  clearRoute(): void {
    // Clear the multi-waypoint route when clearing all waypoints
    this.routeService.clearMultiWaypointRoute();
    this.waypointsChanged.emit([]);
    this.routeCleared.emit();
  }

  reverseRoute(): void {
    const reversedWaypoints = WaypointManager.reverseWaypoints(this.waypoints);
    this.waypointsChanged.emit(reversedWaypoints);
  }

  // Route options methods
  updateRouteOption(key: string, value: any): void {
    (this.routeOptions as any)[key] = value;
    this.routeOptionsChanged.emit({ ...this.routeOptions });
  }

  // Save modal methods
  openSaveModal(): void {
    // Only open modal if user is authenticated
    if (this.isUserLoggedIn()) {
      this.showSaveModal = true;
    }
  }

  // Check if user is logged in
  isUserLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  closeSaveModal(): void {
    this.showSaveModal = false;
  }

  onRouteSaved(): void {
    this.closeSaveModal();
    // Optionally show a success message or perform other actions
  }

  // Track function for ngFor
  trackWaypoint(index: number, waypoint: RoutePoint): string {
    return waypoint.id || index.toString();
  }

  // Get CSS class for waypoint icon
  getWaypointIconClass(type: string): string {
    return WaypointManager.getIconClass(type);
  }

  // Get display name for waypoint
  getWaypointDisplayName(waypoint: RoutePoint): string {
    return WaypointManager.getDisplayName(waypoint);
  }

  // Format distance
  formatDistance(distance: number): string {
    // Valhalla returns distance in kilometers
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
  }

  // Format duration
  formatDuration(duration: number): string {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

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
      return null;
    } catch (error) {
      console.error('Error geocoding location:', error);
      return null;
    }
  }
}

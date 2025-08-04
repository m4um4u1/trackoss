import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouteService } from '../../services/route.service';
import { MultiWaypointRoute, RouteResult } from '../../models/route';
import { RouteType } from '../../models/backend-api';
import {
  DifficultyLevel,
  RouteMetadata,
  Season,
  SurfaceType,
  TechnicalDifficulty,
  TerrainType,
  TimeOfDay,
  TrafficLevel,
} from '../../models/route-metadata';

@Component({
  selector: 'app-save-route-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './save-route-modal.component.html',
  styleUrls: ['./save-route-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaveRouteModalComponent implements OnInit {
  @Input() routeResult: RouteResult | null = null;
  @Input() multiWaypointRoute: MultiWaypointRoute | null = null;
  @Input() isVisible: boolean = false;
  @Output() modalClosed = new EventEmitter<void>();
  @Output() routeSaved = new EventEmitter<void>();

  private readonly routeService = inject(RouteService);

  // Signal-based form data
  private readonly _routeName = signal('');
  private readonly _routeDescription = signal('');
  private readonly _routeType = signal<RouteType>(RouteType.CYCLING);
  private readonly _isPublic = signal(false);

  // Signal-based metadata
  private readonly _difficulty = signal<DifficultyLevel>(3);
  private readonly _scenicRating = signal<1 | 2 | 3 | 4 | 5>(3);
  private readonly _safetyRating = signal<1 | 2 | 3 | 4 | 5>(3);
  private readonly _surfaceType = signal<SurfaceType>(SurfaceType.MIXED);
  private readonly _trafficLevel = signal<TrafficLevel>(TrafficLevel.MEDIUM);
  private readonly _technicalDifficulty = signal<TechnicalDifficulty>(TechnicalDifficulty.INTERMEDIATE);
  private readonly _terrain = signal<TerrainType>(TerrainType.MIXED);
  private readonly _bestTimeOfDay = signal<TimeOfDay[]>([]);
  private readonly _bestSeason = signal<Season[]>([]);
  private readonly _notes = signal('');
  private readonly _tags = signal('');

  // Signal-based UI state
  private readonly _isSaving = signal(false);
  private readonly _errorMessage = signal('');
  private readonly _successMessage = signal('');

  // Public readonly signals for template access
  readonly routeName = this._routeName.asReadonly();
  readonly routeDescription = this._routeDescription.asReadonly();
  readonly routeType = this._routeType.asReadonly();
  readonly isPublic = this._isPublic.asReadonly();
  readonly difficulty = this._difficulty.asReadonly();
  readonly scenicRating = this._scenicRating.asReadonly();
  readonly safetyRating = this._safetyRating.asReadonly();
  readonly surfaceType = this._surfaceType.asReadonly();
  readonly trafficLevel = this._trafficLevel.asReadonly();
  readonly technicalDifficulty = this._technicalDifficulty.asReadonly();
  readonly terrain = this._terrain.asReadonly();
  readonly bestTimeOfDay = this._bestTimeOfDay.asReadonly();
  readonly bestSeason = this._bestSeason.asReadonly();
  readonly notes = this._notes.asReadonly();
  readonly tags = this._tags.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly errorMessage = this._errorMessage.asReadonly();
  readonly successMessage = this._successMessage.asReadonly();

  // Computed signals
  readonly isFormValid = computed(() => this._routeName().trim().length > 0);
  readonly processedTags = computed(() =>
    this._tags().trim()
      ? this._tags()
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag)
      : [],
  );
  readonly defaultRouteName = computed(() => {
    const date = new Date().toLocaleDateString();
    return `${this.getRouteTypeLabel(this._routeType())} Route - ${date}`;
  });

  // Enum references for templates
  RouteType = RouteType;
  SurfaceType = SurfaceType;
  TrafficLevel = TrafficLevel;
  TechnicalDifficulty = TechnicalDifficulty;
  TerrainType = TerrainType;
  TimeOfDay = TimeOfDay;
  Season = Season;

  // Options for dropdowns
  routeTypeOptions = [
    { value: RouteType.CYCLING, label: 'Cycling' },
    { value: RouteType.MOUNTAIN_BIKING, label: 'Mountain Biking' },
    { value: RouteType.HIKING, label: 'Hiking' },
    { value: RouteType.RUNNING, label: 'Running' },
    { value: RouteType.WALKING, label: 'Walking' },
  ];

  surfaceTypeOptions = [
    { value: SurfaceType.ASPHALT, label: 'Asphalt' },
    { value: SurfaceType.CONCRETE, label: 'Concrete' },
    { value: SurfaceType.GRAVEL, label: 'Gravel' },
    { value: SurfaceType.DIRT, label: 'Dirt' },
    { value: SurfaceType.SAND, label: 'Sand' },
    { value: SurfaceType.GRASS, label: 'Grass' },
    { value: SurfaceType.MIXED, label: 'Mixed' },
    { value: SurfaceType.UNKNOWN, label: 'Unknown' },
  ];

  trafficLevelOptions = [
    { value: TrafficLevel.NONE, label: 'No Traffic' },
    { value: TrafficLevel.LOW, label: 'Low Traffic' },
    { value: TrafficLevel.MEDIUM, label: 'Medium Traffic' },
    { value: TrafficLevel.HIGH, label: 'High Traffic' },
    { value: TrafficLevel.VERY_HIGH, label: 'Very High Traffic' },
  ];

  technicalDifficultyOptions = [
    { value: TechnicalDifficulty.BEGINNER, label: 'Beginner' },
    { value: TechnicalDifficulty.INTERMEDIATE, label: 'Intermediate' },
    { value: TechnicalDifficulty.ADVANCED, label: 'Advanced' },
    { value: TechnicalDifficulty.EXPERT, label: 'Expert' },
  ];

  terrainOptions = [
    { value: TerrainType.FLAT, label: 'Flat' },
    { value: TerrainType.ROLLING, label: 'Rolling Hills' },
    { value: TerrainType.HILLY, label: 'Hilly' },
    { value: TerrainType.MOUNTAINOUS, label: 'Mountainous' },
    { value: TerrainType.MIXED, label: 'Mixed' },
  ];

  timeOfDayOptions = [
    { value: TimeOfDay.EARLY_MORNING, label: 'Early Morning' },
    { value: TimeOfDay.MORNING, label: 'Morning' },
    { value: TimeOfDay.MIDDAY, label: 'Midday' },
    { value: TimeOfDay.AFTERNOON, label: 'Afternoon' },
    { value: TimeOfDay.EVENING, label: 'Evening' },
    { value: TimeOfDay.NIGHT, label: 'Night' },
  ];

  seasonOptions = [
    { value: Season.SPRING, label: 'Spring' },
    { value: Season.SUMMER, label: 'Summer' },
    { value: Season.AUTUMN, label: 'Autumn' },
    { value: Season.WINTER, label: 'Winter' },
  ];

  ngOnInit(): void {
    // Set default route name based on route type
    this.updateDefaultRouteName();
  }

  private updateDefaultRouteName(): void {
    if (!this._routeName()) {
      this._routeName.set(this.defaultRouteName());
    }
  }

  private getRouteTypeLabel(routeType: RouteType): string {
    const option = this.routeTypeOptions.find((opt) => opt.value === routeType);
    return option ? option.label : 'Route';
  }

  // Signal update methods
  updateRouteName(value: string): void {
    this._routeName.set(value);
  }

  updateRouteDescription(value: string): void {
    this._routeDescription.set(value);
  }

  updateRouteType(value: RouteType): void {
    this._routeType.set(value);
    this.updateDefaultRouteName();
  }

  updateIsPublic(value: boolean): void {
    this._isPublic.set(value);
  }

  updateNotes(value: string): void {
    this._notes.set(value);
  }

  updateTags(value: string): void {
    this._tags.set(value);
  }

  onTimeOfDayChange(timeOfDay: TimeOfDay, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this._bestTimeOfDay();
    if (checked) {
      if (!current.includes(timeOfDay)) {
        this._bestTimeOfDay.set([...current, timeOfDay]);
      }
    } else {
      this._bestTimeOfDay.set(current.filter((t) => t !== timeOfDay));
    }
  }

  onSeasonChange(season: Season, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this._bestSeason();
    if (checked) {
      if (!current.includes(season)) {
        this._bestSeason.set([...current, season]);
      }
    } else {
      this._bestSeason.set(current.filter((s) => s !== season));
    }
  }

  isTimeOfDaySelected(timeOfDay: TimeOfDay): boolean {
    return this._bestTimeOfDay().includes(timeOfDay);
  }

  isSeasonSelected(season: Season): boolean {
    return this._bestSeason().includes(season);
  }

  saveRoute(): void {
    if (!this.isFormValid()) {
      this._errorMessage.set('Route name is required');
      return;
    }

    if (!this.routeResult && !this.multiWaypointRoute) {
      this._errorMessage.set('No route to save');
      return;
    }

    this._isSaving.set(true);
    this._errorMessage.set('');
    this._successMessage.set('');

    const metadata: RouteMetadata = {
      surface: this._surfaceType(),
      terrain: this._terrain(),
      difficulty: this._difficulty(),
      scenicRating: this._scenicRating(),
      safetyRating: this._safetyRating(),
      trafficLevel: this._trafficLevel(),
      technicalDifficulty: this._technicalDifficulty(),
      bestTimeOfDay: this._bestTimeOfDay().length > 0 ? this._bestTimeOfDay() : undefined,
      bestSeason: this._bestSeason().length > 0 ? this._bestSeason() : undefined,
      notes: this._notes().trim() || undefined,
      tags: this.processedTags().length > 0 ? this.processedTags() : undefined,
    };

    const saveObservable = this.multiWaypointRoute
      ? this.routeService.saveMultiWaypointRoute(
          this.multiWaypointRoute,
          this._routeName().trim(),
          this._routeDescription().trim() || undefined,
          this._routeType(),
          this._isPublic(),
          metadata,
        )
      : this.routeService.saveRoute(
          this.routeResult!,
          this._routeName().trim(),
          this._routeDescription().trim() || undefined,
          this._routeType(),
          this._isPublic(),
          metadata,
        );

    saveObservable.subscribe({
      next: (response) => {
        console.log('Route saved successfully:', response);
        this._successMessage.set('Route saved successfully!');
        this.routeSaved.emit();

        // Close modal after a short delay to show success message
        setTimeout(() => {
          this.closeModal();
        }, 1500);
      },
      error: (error) => {
        console.error('Error saving route:', error);
        this._errorMessage.set(error.message || 'Failed to save route. Please try again.');
      },
      complete: () => {
        this._isSaving.set(false);
      },
    });
  }

  closeModal(): void {
    this.resetForm();
    this.modalClosed.emit();
  }

  private resetForm(): void {
    this._routeName.set('');
    this._routeDescription.set('');
    this._routeType.set(RouteType.CYCLING);
    this._isPublic.set(false);
    this._difficulty.set(1);
    this._scenicRating.set(1);
    this._safetyRating.set(1);
    this._surfaceType.set(SurfaceType.MIXED);
    this._terrain.set(TerrainType.FLAT);
    this._trafficLevel.set(TrafficLevel.LOW);
    this._technicalDifficulty.set(TechnicalDifficulty.BEGINNER);
    this._bestTimeOfDay.set([]);
    this._bestSeason.set([]);
    this._notes.set('');
    this._tags.set('');
    this._errorMessage.set(null);
    this._successMessage.set(null);
    this._isSaving.set(false);
  }

  // Helper method to create star rating display
  getStarArray(rating: number): boolean[] {
    return Array(5)
      .fill(false)
      .map((_, index) => index < rating);
  }

  setRating(type: 'difficulty' | 'scenic' | 'safety', rating: number): void {
    switch (type) {
      case 'difficulty':
        this._difficulty.set(rating as DifficultyLevel);
        break;
      case 'scenic':
        this._scenicRating.set(rating as 1 | 2 | 3 | 4 | 5);
        break;
      case 'safety':
        this._safetyRating.set(rating as 1 | 2 | 3 | 4 | 5);
        break;
    }
  }

  // Signal update methods for dropdowns
  updateSurfaceType(value: SurfaceType): void {
    this._surfaceType.set(value);
  }

  updateTrafficLevel(value: TrafficLevel): void {
    this._trafficLevel.set(value);
  }

  updateTechnicalDifficulty(value: TechnicalDifficulty): void {
    this._technicalDifficulty.set(value);
  }

  updateTerrain(value: TerrainType): void {
    this._terrain.set(value);
  }
}

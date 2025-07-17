import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, FormsModule],
  templateUrl: './save-route-modal.component.html',
  styleUrls: ['./save-route-modal.component.scss'],
})
export class SaveRouteModalComponent implements OnInit {
  @Input() routeResult: RouteResult | null = null;
  @Input() multiWaypointRoute: MultiWaypointRoute | null = null;
  @Input() isVisible: boolean = false;
  @Output() modalClosed = new EventEmitter<void>();
  @Output() routeSaved = new EventEmitter<void>();

  // Form data
  routeName: string = '';
  routeDescription: string = '';
  routeType: RouteType = RouteType.CYCLING;
  isPublic: boolean = false;

  // Metadata
  difficulty: DifficultyLevel = 3;
  scenicRating: 1 | 2 | 3 | 4 | 5 = 3;
  safetyRating: 1 | 2 | 3 | 4 | 5 = 3;
  surfaceType: SurfaceType = SurfaceType.MIXED;
  trafficLevel: TrafficLevel = TrafficLevel.MEDIUM;
  technicalDifficulty: TechnicalDifficulty = TechnicalDifficulty.INTERMEDIATE;
  terrain: TerrainType = TerrainType.MIXED;
  bestTimeOfDay: TimeOfDay[] = [];
  bestSeason: Season[] = [];
  notes: string = '';
  tags: string = '';

  // UI state
  isSaving: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

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

  constructor(private routeService: RouteService) {}

  ngOnInit(): void {
    // Set default route name based on route type
    this.updateDefaultRouteName();
  }

  private updateDefaultRouteName(): void {
    if (!this.routeName) {
      const date = new Date().toLocaleDateString();
      this.routeName = `${this.getRouteTypeLabel(this.routeType)} Route - ${date}`;
    }
  }

  private getRouteTypeLabel(routeType: RouteType): string {
    const option = this.routeTypeOptions.find((opt) => opt.value === routeType);
    return option ? option.label : 'Route';
  }

  onRouteTypeChange(): void {
    this.updateDefaultRouteName();
  }

  onTimeOfDayChange(timeOfDay: TimeOfDay, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.bestTimeOfDay.includes(timeOfDay)) {
        this.bestTimeOfDay.push(timeOfDay);
      }
    } else {
      this.bestTimeOfDay = this.bestTimeOfDay.filter((t) => t !== timeOfDay);
    }
  }

  onSeasonChange(season: Season, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.bestSeason.includes(season)) {
        this.bestSeason.push(season);
      }
    } else {
      this.bestSeason = this.bestSeason.filter((s) => s !== season);
    }
  }

  isTimeOfDaySelected(timeOfDay: TimeOfDay): boolean {
    return this.bestTimeOfDay.includes(timeOfDay);
  }

  isSeasonSelected(season: Season): boolean {
    return this.bestSeason.includes(season);
  }

  async saveRoute(): Promise<void> {
    if (!this.routeName.trim()) {
      this.errorMessage = 'Route name is required';
      return;
    }

    if (!this.routeResult && !this.multiWaypointRoute) {
      this.errorMessage = 'No route to save';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const metadata: RouteMetadata = {
        surface: this.surfaceType,
        terrain: this.terrain,
        difficulty: this.difficulty,
        scenicRating: this.scenicRating,
        safetyRating: this.safetyRating,
        trafficLevel: this.trafficLevel,
        technicalDifficulty: this.technicalDifficulty,
        bestTimeOfDay: this.bestTimeOfDay.length > 0 ? this.bestTimeOfDay : undefined,
        bestSeason: this.bestSeason.length > 0 ? this.bestSeason : undefined,
        notes: this.notes.trim() || undefined,
        tags: this.tags.trim()
          ? this.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter((tag) => tag)
          : undefined,
      };

      if (this.multiWaypointRoute) {
        await this.routeService
          .saveMultiWaypointRoute(
            this.multiWaypointRoute,
            this.routeName.trim(),
            this.routeDescription.trim() || undefined,
            this.routeType,
            this.isPublic,
            metadata,
          )
          .toPromise();
      } else if (this.routeResult) {
        await this.routeService
          .saveRoute(
            this.routeResult,
            this.routeName.trim(),
            this.routeDescription.trim() || undefined,
            this.routeType,
            this.isPublic,
            metadata,
          )
          .toPromise();
      }

      this.successMessage = 'Route saved successfully!';
      this.routeSaved.emit();

      // Close modal after a short delay to show success message
      setTimeout(() => {
        this.closeModal();
      }, 1500);
    } catch (error) {
      console.error('Error saving route:', error);
      this.errorMessage = 'Failed to save route. Please try again.';
    } finally {
      this.isSaving = false;
    }
  }

  closeModal(): void {
    this.resetForm();
    this.modalClosed.emit();
  }

  private resetForm(): void {
    this.routeName = '';
    this.routeDescription = '';
    this.routeType = RouteType.CYCLING;
    this.isPublic = false;
    this.difficulty = 3;
    this.scenicRating = 3;
    this.safetyRating = 3;
    this.surfaceType = SurfaceType.MIXED;
    this.trafficLevel = TrafficLevel.MEDIUM;
    this.technicalDifficulty = TechnicalDifficulty.INTERMEDIATE;
    this.terrain = TerrainType.MIXED;
    this.bestTimeOfDay = [];
    this.bestSeason = [];
    this.notes = '';
    this.tags = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.isSaving = false;
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
        this.difficulty = rating as DifficultyLevel;
        break;
      case 'scenic':
        this.scenicRating = rating as 1 | 2 | 3 | 4 | 5;
        break;
      case 'safety':
        this.safetyRating = rating as 1 | 2 | 3 | 4 | 5;
        break;
    }
  }
}

import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Columns, LucideAngularModule } from 'lucide-angular';
import { LibreMapComponent } from '../../libre-map/libre-map.component';
import { MapSidepanelComponent } from '../../map-sidepanel/map-sidepanel.component';
import { Coordinates } from '../../models/coordinates';
import { MultiWaypointRoute, RoutePoint, RouteResult } from '../../models/route';
import { RouteService } from '../../services/route.service';

@Component({
  selector: 'app-map-page',
  imports: [CommonModule, LucideAngularModule, LibreMapComponent, MapSidepanelComponent],
  templateUrl: './map-page.component.html',
  styleUrl: './map-page.component.scss',
  standalone: true,
})
export class MapPageComponent implements OnInit, OnDestroy {
  readonly ColumnsIcon = Columns;
  @ViewChild(LibreMapComponent) mapComponent?: LibreMapComponent;

  public currentStartPoint?: Coordinates;
  public currentEndPoint?: Coordinates;
  public currentWaypoints: RoutePoint[] = [];

  // Responsive properties
  public isMobile: boolean = false;
  public isTablet: boolean = false;
  public isSidepanelOpen: boolean = true; // Default to open on desktop

  constructor(
    private routeService: RouteService,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    this.checkScreenSize();
    this.updateCSSProperties();
  }

  ngOnDestroy(): void {
    // Restore body scroll on component destroy
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkScreenSize();
  }

  public toggleSidepanel(): void {
    this.isSidepanelOpen = !this.isSidepanelOpen;
    this.handleBodyScroll();
    this.updateCSSProperties();
    this.resizeMapAfterToggle();
  }

  public onBackdropClick(): void {
    // Only close on backdrop click for mobile (desktop doesn't have backdrop)
    if (this.isMobile && this.isSidepanelOpen) {
      this.toggleSidepanel();
    }
  }

  public onSidepanelTouchStart(event: TouchEvent): void {
    // iOS Safari needs a touchstart event to properly recognize scrollable areas
    // This "primes" the touch events for proper scrolling behavior
    if (this.isMobile && this.isSidepanelOpen) {
      // Store initial touch position for better touch handling
      const touch = event.touches[0];
      (event.currentTarget as any)._initialTouchY = touch.clientY;
    }
  }

  public onSidepanelTouchMove(event: TouchEvent): void {
    // Allow scrolling within the sidepanel but prevent it from propagating to the body
    if (this.isMobile && this.isSidepanelOpen) {
      const target = event.currentTarget as HTMLElement;
      const scrollTop = target.scrollTop;
      const scrollHeight = target.scrollHeight;
      const height = target.clientHeight;

      // Only prevent default for overscroll situations, not normal scrolling
      const isScrollable = scrollHeight > height;
      if (isScrollable) {
        const touch = event.touches[0];
        const initialTouchY = (target as any)._initialTouchY || touch.clientY;
        const deltaY = touch.clientY - initialTouchY;

        // Only prevent overscroll at the very top and bottom
        const isAtTop = scrollTop <= 0;
        const isAtBottom = scrollTop + height >= scrollHeight - 1;

        if ((isAtTop && deltaY > 0) || (isAtBottom && deltaY < 0)) {
          event.preventDefault();
        }
      }
    }
  }

  private checkScreenSize(): void {
    const wasMobile = this.isMobile;
    const wasTablet = this.isTablet;

    // Define breakpoints
    const width = window.innerWidth;
    this.isMobile = width < 768; // sm breakpoint
    this.isTablet = width >= 768 && width < 1200; // md-lg range

    // Handle sidepanel state when switching between screen sizes
    if (wasMobile && !this.isMobile) {
      // Switching from mobile to tablet/desktop - open sidepanel
      this.isSidepanelOpen = true;
    } else if (!wasMobile && this.isMobile) {
      // Switching from tablet/desktop to mobile - close sidepanel
      this.isSidepanelOpen = false;
    }

    this.handleBodyScroll();
    this.updateCSSProperties();

    // Resize map when screen size changes
    this.resizeMapAfterToggle();
  }

  private updateCSSProperties(): void {
    const hostElement = this.elementRef.nativeElement;

    // Only set mobile sidepanel width - desktop/tablet use grid system
    if (this.isMobile) {
      hostElement.style.setProperty('--mobile-sidepanel-width', '85%');
    }
  }

  private resizeMapAfterToggle(): void {
    // Resize the map after sidepanel toggle to ensure proper dimensions
    if (this.mapComponent) {
      this.mapComponent.resizeMap();
    }
  }

  private handleBodyScroll(): void {
    if (this.isMobile) {
      if (this.isSidepanelOpen) {
        // Prevent body scroll when sidepanel is open
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
      } else {
        // Restore body scroll when sidepanel is closed
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
      }
    }
  }

  public onRoutePointsUpdated(points: { start?: Coordinates; end?: Coordinates }): void {
    this.currentStartPoint = points.start;
    this.currentEndPoint = points.end;
  }

  public onWaypointsChanged(waypoints: RoutePoint[]): void {
    this.currentWaypoints = waypoints;
  }

  public onStartPointChanged(startPoint: Coordinates): void {
    this.currentStartPoint = startPoint;
  }

  public onEndPointChanged(endPoint: Coordinates): void {
    this.currentEndPoint = endPoint;
  }

  public onRouteCalculated(routeResult: RouteResult): void {
    // The route service will automatically update the map through the LibreMapComponent
    // which subscribes to route changes, but we can also manually trigger map updates if needed
    console.log('Route calculated:', routeResult);
  }

  public onMultiWaypointRouteCalculated(multiWaypointRoute: MultiWaypointRoute): void {
    // The route service will automatically update the map through the LibreMapComponent
    console.log('Multi-waypoint route calculated:', multiWaypointRoute);
  }
}

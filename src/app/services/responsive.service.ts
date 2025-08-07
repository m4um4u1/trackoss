import { Injectable, signal, computed } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
}

@Injectable({
  providedIn: 'root',
})
export class ResponsiveService {
  private readonly _screenWidth = signal(window.innerWidth);

  // Computed responsive states
  readonly screenWidth = this._screenWidth.asReadonly();
  readonly isMobile = computed(() => this._screenWidth() < 768);
  readonly isTablet = computed(() => this._screenWidth() >= 768 && this._screenWidth() < 1200);
  readonly isDesktop = computed(() => this._screenWidth() >= 1200);

  // Convenience computed state object
  readonly state = computed<ResponsiveState>(() => ({
    isMobile: this.isMobile(),
    isTablet: this.isTablet(),
    isDesktop: this.isDesktop(),
    screenWidth: this.screenWidth(),
  }));

  constructor(private breakpointObserver: BreakpointObserver) {
    this.setupBreakpointObserver();
  }

  private setupBreakpointObserver(): void {
    // Use CDK BreakpointObserver for more reliable breakpoint detection
    this.breakpointObserver
      .observe([
        Breakpoints.XSmall, // < 600px
        Breakpoints.Small, // 600px - 959px
        Breakpoints.Medium, // 960px - 1279px
        Breakpoints.Large, // 1280px - 1919px
        Breakpoints.XLarge, // >= 1920px
      ])
      .pipe(map(() => window.innerWidth))
      .subscribe((width) => {
        this._screenWidth.set(width);
      });

    // Fallback for window resize (in case CDK doesn't catch it)
    window.addEventListener('resize', () => {
      this._screenWidth.set(window.innerWidth);
    });
  }

  /**
   * Get the appropriate sidepanel column class based on screen size
   */
  getSidepanelColumnClass(): string {
    if (this.isTablet()) return 'col-4';
    if (this.isDesktop()) return 'col-3';
    return ''; // Mobile doesn't use grid system
  }

  /**
   * Determine if sidepanel should be open by default
   */
  shouldSidepanelBeOpenByDefault(): boolean {
    return !this.isMobile();
  }
}

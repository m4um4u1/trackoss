import { Injectable, signal, computed, effect } from '@angular/core';
import { ResponsiveService } from './responsive.service';

@Injectable({
  providedIn: 'root',
})
export class LayoutStateService {
  private readonly _isSidepanelOpen = signal(true);

  // Public readonly signals
  readonly isSidepanelOpen = this._isSidepanelOpen.asReadonly();

  // Computed states
  readonly sidepanelClasses = computed(() => {
    const responsive = this.responsiveService.state();
    const isOpen = this.isSidepanelOpen();
    const classes: string[] = [];

    if (responsive.isMobile) {
      classes.push('mobile-sidepanel');
      classes.push(isOpen ? 'open' : 'closed');
    } else {
      classes.push('desktop-sidepanel');
      classes.push(isOpen ? 'open' : 'closed');

      // Add responsive column classes
      const columnClass = this.responsiveService.getSidepanelColumnClass();
      if (columnClass) {
        classes.push(columnClass);
      }
    }

    return classes.join(' ');
  });

  readonly mapClasses = computed(() => {
    const responsive = this.responsiveService.state();
    const classes: string[] = [];

    if (responsive.isMobile) {
      classes.push('mobile-map');
    } else {
      classes.push('desktop-map', 'col');
    }

    return classes.join(' ');
  });

  readonly toggleButtonClasses = computed(() => {
    const responsive = this.responsiveService.state();
    const classes = ['toggle-btn'];

    if (responsive.isMobile) {
      classes.push('mobile-toggle');
    } else {
      classes.push('desktop-toggle');
    }

    return classes.join(' ');
  });

  readonly rootClasses = computed(() => {
    const responsive = this.responsiveService.state();
    const isOpen = this.isSidepanelOpen();
    const classes: string[] = ['position-relative', 'h-100', 'overflow-hidden'];

    if (responsive.isMobile) classes.push('mobile-mode');
    if (responsive.isTablet) classes.push('tablet-mode');
    if (responsive.isDesktop) classes.push('desktop-mode');
    if (isOpen) classes.push('sidepanel-open');
    if (!isOpen) classes.push('sidepanel-closed');

    return classes.join(' ');
  });

  constructor(private responsiveService: ResponsiveService) {
    this.setupResponsiveEffects();
  }

  private setupResponsiveEffects(): void {
    // Auto-adjust sidepanel state based on screen size changes
    effect(() => {
      const responsive = this.responsiveService.state();

      // Open sidepanel by default on desktop/tablet, close on mobile
      if (responsive.isMobile) {
        this._isSidepanelOpen.set(false);
      } else {
        this._isSidepanelOpen.set(true);
      }
    });
  }

  toggleSidepanel(): void {
    this._isSidepanelOpen.update((current) => !current);
  }

  openSidepanel(): void {
    this._isSidepanelOpen.set(true);
  }

  closeSidepanel(): void {
    this._isSidepanelOpen.set(false);
  }

  /**
   * Handle body scroll lock for mobile sidepanel
   */
  updateBodyScrollLock(): void {
    const shouldLock = this.responsiveService.isMobile() && this.isSidepanelOpen();

    if (shouldLock) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
  }
}

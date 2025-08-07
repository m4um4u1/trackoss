import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appMobileTouchScroll]',
  standalone: true,
})
export class MobileTouchScrollDirective {
  private initialTouchY: number = 0;

  constructor(private el: ElementRef<HTMLElement>) {}

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    // Store initial touch position for iOS scrolling optimization
    const touch = event.touches[0];
    this.initialTouchY = touch.clientY;

    // Enable hardware acceleration for smooth scrolling
    this.el.nativeElement.style.transform = 'translate3d(0, 0, 0)';
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    const target = this.el.nativeElement;
    const { scrollTop, scrollHeight, clientHeight } = target;

    // Only prevent overscroll, allow normal scrolling
    const isScrollable = scrollHeight > clientHeight;

    if (isScrollable) {
      const touch = event.touches[0];
      const deltaY = touch.clientY - this.initialTouchY;

      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      // Prevent overscroll bounce
      if ((isAtTop && deltaY > 0) || (isAtBottom && deltaY < 0)) {
        event.preventDefault();
      }
    }
  }

  @HostListener('touchend')
  onTouchEnd(): void {
    // Clean up transform after touch ends
    this.el.nativeElement.style.transform = '';
  }
}

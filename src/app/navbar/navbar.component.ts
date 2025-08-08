import { Component, inject, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { User } from '../models/auth.models';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  standalone: true,
})
export class NavbarComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private subscription = new Subscription();

  currentUser: User | null = null;

  constructor() {
    this.subscription.add(
      this.authService.currentUser$.subscribe((user) => {
        this.currentUser = user;
      }),
    );
  }

  logout(event: Event): void {
    event.preventDefault();
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}

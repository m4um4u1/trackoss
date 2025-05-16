import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LibreMapComponent } from './libre-map.component';

describe('LibreMapComponent', () => {
  let component: LibreMapComponent;
  let fixture: ComponentFixture<LibreMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LibreMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LibreMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

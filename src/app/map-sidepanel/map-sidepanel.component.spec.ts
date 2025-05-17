import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapSidepanelComponent } from './map-sidepanel.component';

describe('MapSidepanelComponent', () => {
  let component: MapSidepanelComponent;
  let fixture: ComponentFixture<MapSidepanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapSidepanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapSidepanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

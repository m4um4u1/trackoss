import {
  deserializeRouteMetadata,
  DifficultyLevel,
  POIType,
  Rating,
  RoadType,
  RouteMetadata,
  Season,
  serializeRouteMetadata,
  SurfaceType,
  TechnicalDifficulty,
  TerrainType,
  TimeOfDay,
  TrafficLevel,
  WeatherType,
  BikeInfrastructure,
} from './route-metadata';

// Mock console methods to suppress warnings during tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Mock console methods to suppress warnings during tests
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('RouteMetadata Helper Functions', () => {
  describe('serializeRouteMetadata', () => {
    it('should serialize a complete RouteMetadata object to JSON string', () => {
      const metadata: RouteMetadata = {
        surface: SurfaceType.ASPHALT,
        terrain: TerrainType.HILLY,
        roadTypes: [RoadType.BIKE_LANE, RoadType.SHARED_USE_PATH, RoadType.BRIDGE],
        difficulty: 3 as DifficultyLevel,
        scenicRating: 4 as Rating,
        safetyRating: 5 as Rating,
        trafficLevel: TrafficLevel.LOW,
        bikeInfrastructure: [BikeInfrastructure.PROTECTED_BIKE_LANE, BikeInfrastructure.BIKE_PATH],
        weatherConditions: {
          temperature: 22,
          windSpeed: 10,
          windDirection: 'NW',
          humidity: 65,
          conditions: WeatherType.PARTLY_CLOUDY,
        },
        bestTimeOfDay: [TimeOfDay.MORNING, TimeOfDay.EVENING],
        bestSeason: [Season.SPRING, Season.AUTUMN],
        maxGradient: 8,
        averageGradient: 4,
        technicalDifficulty: TechnicalDifficulty.INTERMEDIATE,
        pointsOfInterest: [
          {
            name: 'Scenic Overlook',
            type: POIType.VIEWPOINT,
            description: 'Beautiful city view',
            latitude: 52.518,
            longitude: 13.39,
          },
          {
            name: 'Bike Shop',
            type: POIType.BIKE_SHOP,
            description: 'Emergency repairs available',
            latitude: 52.52,
            longitude: 13.392,
          },
        ],
        notes: 'Great route for intermediate cyclists',
        tags: ['scenic', 'urban', 'bike-friendly'],
      };

      const serialized = serializeRouteMetadata(metadata);
      const parsed = JSON.parse(serialized);

      expect(parsed.surface).toBe(SurfaceType.ASPHALT);
      expect(parsed.terrain).toBe(TerrainType.HILLY);
      expect(parsed.roadTypes).toEqual([RoadType.BIKE_LANE, RoadType.SHARED_USE_PATH, RoadType.BRIDGE]);
      expect(parsed.difficulty).toBe(3);
      expect(parsed.scenicRating).toBe(4);
      expect(parsed.safetyRating).toBe(5);
      expect(parsed.trafficLevel).toBe(TrafficLevel.LOW);
      expect(parsed.weatherConditions.temperature).toBe(22);
      expect(parsed.pointsOfInterest).toHaveLength(2);
      expect(parsed.tags).toContain('scenic');
    });

    it('should serialize a minimal RouteMetadata object', () => {
      const metadata: RouteMetadata = {
        difficulty: 1 as DifficultyLevel,
      };

      const serialized = serializeRouteMetadata(metadata);
      const parsed = JSON.parse(serialized);

      expect(parsed.difficulty).toBe(1);
      expect(parsed.surface).toBeUndefined();
      expect(parsed.terrain).toBeUndefined();
      expect(parsed.roadTypes).toBeUndefined();
    });

    it('should serialize an empty RouteMetadata object', () => {
      const metadata: RouteMetadata = {};

      const serialized = serializeRouteMetadata(metadata);
      const parsed = JSON.parse(serialized);

      expect(parsed).toEqual({});
    });

    it('should handle special characters in string fields', () => {
      const metadata: RouteMetadata = {
        notes: 'This route has "quotes" and \\ backslashes',
        tags: ['tag-with-dash', 'tag_with_underscore', 'tag with space'],
      };

      const serialized = serializeRouteMetadata(metadata);
      const parsed = JSON.parse(serialized);

      expect(parsed.notes).toBe('This route has "quotes" and \\ backslashes');
      expect(parsed.tags).toContain('tag with space');
    });

    it('should serialize all enum values correctly', () => {
      const metadata: RouteMetadata = {
        surface: SurfaceType.GRAVEL,
        terrain: TerrainType.MOUNTAINOUS,
        roadTypes: [
          RoadType.HIGHWAY,
          RoadType.ARTERIAL,
          RoadType.COLLECTOR,
          RoadType.LOCAL_STREET,
          RoadType.RESIDENTIAL,
          RoadType.BIKE_PATH,
          RoadType.BIKE_LANE,
          RoadType.SHARED_USE_PATH,
          RoadType.TRAIL,
          RoadType.SINGLE_TRACK,
          RoadType.FIRE_ROAD,
          RoadType.GRAVEL_ROAD,
          RoadType.DIRT_ROAD,
          RoadType.PAVED_ROAD,
          RoadType.BRIDGE,
          RoadType.TUNNEL,
          RoadType.FERRY,
          RoadType.BOARDWALK,
          RoadType.STAIRS,
          RoadType.PEDESTRIAN_ONLY,
        ],
        trafficLevel: TrafficLevel.VERY_HIGH,
        technicalDifficulty: TechnicalDifficulty.EXPERT,
      };

      const serialized = serializeRouteMetadata(metadata);
      const parsed = JSON.parse(serialized);

      expect(parsed.surface).toBe('gravel');
      expect(parsed.terrain).toBe('mountainous');
      expect(parsed.roadTypes).toContain('highway');
      expect(parsed.roadTypes).toContain('pedestrian_only');
      expect(parsed.trafficLevel).toBe('very_high');
      expect(parsed.technicalDifficulty).toBe('expert');
    });

    it('should serialize numeric fields correctly', () => {
      const metadata: RouteMetadata = {
        difficulty: 5 as DifficultyLevel,
        scenicRating: 1 as Rating,
        safetyRating: 3 as Rating,
        maxGradient: 15.5,
        averageGradient: 7.25,
        weatherConditions: {
          temperature: -5,
          windSpeed: 32.5,
          humidity: 100,
        },
      };

      const serialized = serializeRouteMetadata(metadata);
      const parsed = JSON.parse(serialized);

      expect(parsed.difficulty).toBe(5);
      expect(parsed.maxGradient).toBe(15.5);
      expect(parsed.averageGradient).toBe(7.25);
      expect(parsed.weatherConditions.temperature).toBe(-5);
      expect(parsed.weatherConditions.windSpeed).toBe(32.5);
    });

    it('should serialize arrays correctly', () => {
      const metadata: RouteMetadata = {
        roadTypes: [],
        bestTimeOfDay: [TimeOfDay.EARLY_MORNING, TimeOfDay.MORNING, TimeOfDay.MIDDAY],
        bestSeason: [Season.SUMMER],
        tags: [],
      };

      const serialized = serializeRouteMetadata(metadata);
      const parsed = JSON.parse(serialized);

      expect(parsed.roadTypes).toEqual([]);
      expect(parsed.bestTimeOfDay).toHaveLength(3);
      expect(parsed.bestSeason).toHaveLength(1);
      expect(parsed.tags).toEqual([]);
    });
  });

  describe('deserializeRouteMetadata', () => {
    it('should deserialize a complete JSON string to RouteMetadata object', () => {
      const jsonString = JSON.stringify({
        surface: 'asphalt',
        terrain: 'hilly',
        roadTypes: ['bike_lane', 'shared_use_path'],
        difficulty: 3,
        scenicRating: 4,
        safetyRating: 5,
        trafficLevel: 'low',
        weatherConditions: {
          temperature: 22,
          windSpeed: 10,
          windDirection: 'NW',
          humidity: 65,
          conditions: 'partly_cloudy',
        },
        bestTimeOfDay: ['morning', 'evening'],
        bestSeason: ['spring', 'autumn'],
        maxGradient: 8,
        averageGradient: 4,
        technicalDifficulty: 'intermediate',
        pointsOfInterest: [
          {
            name: 'Scenic Overlook',
            type: 'viewpoint',
            description: 'Beautiful city view',
            latitude: 52.518,
            longitude: 13.39,
          },
        ],
        notes: 'Great route for intermediate cyclists',
        tags: ['scenic', 'urban', 'bike-friendly'],
      });

      const metadata = deserializeRouteMetadata(jsonString);

      expect(metadata.surface).toBe('asphalt');
      expect(metadata.terrain).toBe('hilly');
      expect(metadata.roadTypes).toContain('bike_lane');
      expect(metadata.difficulty).toBe(3);
      expect(metadata.scenicRating).toBe(4);
      expect(metadata.safetyRating).toBe(5);
      expect(metadata.trafficLevel).toBe('low');
      expect(metadata.weatherConditions?.temperature).toBe(22);
      expect(metadata.pointsOfInterest).toHaveLength(1);
      expect(metadata.tags).toContain('scenic');
    });

    it('should deserialize a minimal JSON string', () => {
      const jsonString = JSON.stringify({
        difficulty: 1,
      });

      const metadata = deserializeRouteMetadata(jsonString);

      expect(metadata.difficulty).toBe(1);
      expect(metadata.surface).toBeUndefined();
    });

    it('should deserialize an empty JSON string', () => {
      const jsonString = '{}';

      const metadata = deserializeRouteMetadata(jsonString);

      expect(metadata).toEqual({});
    });

    it('should handle invalid JSON gracefully', () => {
      const invalidJson = 'not valid json';

      const metadata = deserializeRouteMetadata(invalidJson);

      expect(metadata).toEqual({});
    });

    it('should handle null and undefined input', () => {
      // Should return empty object for null/undefined without logging
      const nullResult = deserializeRouteMetadata(null);
      expect(nullResult).toEqual({});

      const undefinedResult = deserializeRouteMetadata(undefined);
      expect(undefinedResult).toEqual({});
    });

    it('should handle empty string input', () => {
      const metadata = deserializeRouteMetadata('');

      expect(metadata).toEqual({});
    });

    it('should handle malformed JSON with partial validity', () => {
      const malformedJson = '{"difficulty": 3, "surface": "asphalt"';

      const metadata = deserializeRouteMetadata(malformedJson);

      expect(metadata).toEqual({});
    });

    it('should handle special characters in deserialized strings', () => {
      const jsonString = JSON.stringify({
        notes: 'This route has "quotes" and \\ backslashes',
        tags: ['tag-with-dash', 'tag_with_underscore', 'tag with space'],
      });

      const metadata = deserializeRouteMetadata(jsonString);

      expect(metadata.notes).toBe('This route has "quotes" and \\ backslashes');
      expect(metadata.tags).toContain('tag with space');
    });

    it('should preserve numeric types correctly', () => {
      const jsonString = JSON.stringify({
        difficulty: 5,
        maxGradient: 15.5,
        averageGradient: 7.25,
        weatherConditions: {
          temperature: -5,
          windSpeed: 0,
          humidity: 100,
        },
      });

      const metadata = deserializeRouteMetadata(jsonString);

      expect(metadata.difficulty).toBe(5);
      expect(metadata.maxGradient).toBe(15.5);
      expect(metadata.averageGradient).toBe(7.25);
      expect(metadata.weatherConditions?.temperature).toBe(-5);
      expect(metadata.weatherConditions?.windSpeed).toBe(0);
    });

    it('should handle arrays with mixed content', () => {
      const jsonString = JSON.stringify({
        roadTypes: ['bike_lane', 'trail', 'bridge'],
        tags: ['tag1', 'tag2', 'tag3'],
        pointsOfInterest: [
          {
            name: 'POI 1',
            type: 'cafe',
            latitude: 52.5,
            longitude: 13.4,
          },
          {
            name: 'POI 2',
            type: 'rest_stop',
            description: 'Rest area',
            latitude: 52.6,
            longitude: 13.5,
          },
        ],
      });

      const metadata = deserializeRouteMetadata(jsonString);

      expect(metadata.roadTypes).toHaveLength(3);
      expect(metadata.tags).toHaveLength(3);
      expect(metadata.pointsOfInterest).toHaveLength(2);
      expect(metadata.pointsOfInterest?.[0].description).toBeUndefined();
      expect(metadata.pointsOfInterest?.[1].description).toBe('Rest area');
    });

    it('should handle unexpected fields gracefully', () => {
      const jsonString = JSON.stringify({
        difficulty: 3,
        surface: 'asphalt',
        unexpectedField: 'some value',
        anotherUnexpected: 123,
      });

      const metadata = deserializeRouteMetadata(jsonString);

      expect(metadata.difficulty).toBe(3);
      expect(metadata.surface).toBe('asphalt');
      expect((metadata as any).unexpectedField).toBe('some value');
      expect((metadata as any).anotherUnexpected).toBe(123);
    });
  });

  describe('Round-trip serialization', () => {
    it('should maintain data integrity through serialize/deserialize cycle', () => {
      const original: RouteMetadata = {
        surface: SurfaceType.MIXED,
        terrain: TerrainType.ROLLING,
        roadTypes: [RoadType.BIKE_PATH, RoadType.GRAVEL_ROAD, RoadType.BRIDGE],
        difficulty: 4 as DifficultyLevel,
        scenicRating: 5 as Rating,
        safetyRating: 3 as Rating,
        trafficLevel: TrafficLevel.MEDIUM,
        weatherConditions: {
          temperature: 18,
          windSpeed: 15,
          windDirection: 'SW',
          humidity: 70,
          conditions: WeatherType.CLOUDY,
        },
        bestTimeOfDay: [TimeOfDay.AFTERNOON],
        bestSeason: [Season.SUMMER, Season.AUTUMN],
        maxGradient: 12,
        averageGradient: 6,
        technicalDifficulty: TechnicalDifficulty.ADVANCED,
        pointsOfInterest: [
          {
            name: 'Water Fountain',
            type: POIType.WATER_FOUNTAIN,
            latitude: 52.52,
            longitude: 13.4,
          },
        ],
        notes: 'Challenging route with varied terrain',
        tags: ['challenging', 'mixed-terrain'],
      };

      const serialized = serializeRouteMetadata(original);
      const deserialized = deserializeRouteMetadata(serialized);

      expect(deserialized).toEqual(original);
    });

    it('should handle empty metadata through round-trip', () => {
      const original: RouteMetadata = {};

      const serialized = serializeRouteMetadata(original);
      const deserialized = deserializeRouteMetadata(serialized);

      expect(deserialized).toEqual(original);
    });

    it('should handle metadata with only arrays through round-trip', () => {
      const original: RouteMetadata = {
        roadTypes: [],
        tags: [],
        pointsOfInterest: [],
      };

      const serialized = serializeRouteMetadata(original);
      const deserialized = deserializeRouteMetadata(serialized);

      expect(deserialized).toEqual(original);
    });
  });

  describe('Error handling', () => {
    it('should log warning for invalid JSON in deserializeRouteMetadata', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      deserializeRouteMetadata('invalid json');

      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse route metadata:', expect.any(SyntaxError));

      consoleSpy.mockRestore();
    });

    it('should not throw when deserializing various invalid inputs', () => {
      const testCases = [null, undefined, '', '{}', '[]', 'true', 'false', '123', '"string"'];

      testCases.forEach((testCase) => {
        expect(() => deserializeRouteMetadata(testCase as any)).not.toThrow();
      });
    });
  });

  describe('Type validation', () => {
    it('should correctly type difficulty levels', () => {
      const metadata: RouteMetadata = {
        difficulty: 1 as DifficultyLevel,
      };

      expect(metadata.difficulty).toBe(1);

      metadata.difficulty = 5 as DifficultyLevel;
      expect(metadata.difficulty).toBe(5);
    });

    it('should correctly type rating levels', () => {
      const metadata: RouteMetadata = {
        scenicRating: 1 as Rating,
        safetyRating: 5 as Rating,
      };

      expect(metadata.scenicRating).toBe(1);
      expect(metadata.safetyRating).toBe(5);
    });

    it('should handle all surface types', () => {
      const surfaces = Object.values(SurfaceType);
      surfaces.forEach((surface) => {
        const metadata: RouteMetadata = { surface };
        const serialized = serializeRouteMetadata(metadata);
        const deserialized = deserializeRouteMetadata(serialized);
        expect(deserialized.surface).toBe(surface);
      });
    });

    it('should handle all terrain types', () => {
      const terrains = Object.values(TerrainType);
      terrains.forEach((terrain) => {
        const metadata: RouteMetadata = { terrain };
        const serialized = serializeRouteMetadata(metadata);
        const deserialized = deserializeRouteMetadata(serialized);
        expect(deserialized.terrain).toBe(terrain);
      });
    });

    it('should handle all road types', () => {
      const roadTypes = Object.values(RoadType);
      const metadata: RouteMetadata = { roadTypes };
      const serialized = serializeRouteMetadata(metadata);
      const deserialized = deserializeRouteMetadata(serialized);
      expect(deserialized.roadTypes).toEqual(roadTypes);
    });
  });
});

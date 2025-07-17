import { request } from '@playwright/test';

const BACKEND_BASE_URL = 'http://localhost:8080';
const ROUTES_ENDPOINT = `${BACKEND_BASE_URL}/api/routes`;

export interface RouteCleanupTracker {
  createdRouteIds: Set<string>;
  addRouteId(id: string): void;
  getRouteIds(): string[];
  clear(): void;
}

/**
 * Global route tracker to keep track of routes created during tests
 */
class GlobalRouteTracker implements RouteCleanupTracker {
  public createdRouteIds: Set<string> = new Set();

  addRouteId(id: string): void {
    this.createdRouteIds.add(id);
    console.log(`[Route Cleanup] Tracking route ID: ${id}`);
  }

  getRouteIds(): string[] {
    return Array.from(this.createdRouteIds);
  }

  clear(): void {
    this.createdRouteIds.clear();
  }
}

export const routeTracker = new GlobalRouteTracker();

/**
 * Fetch all routes from the backend
 */
export async function getAllRoutes(): Promise<any[]> {
  try {
    const apiRequestContext = await request.newContext();
    const response = await apiRequestContext.get(ROUTES_ENDPOINT);

    if (!response.ok()) {
      console.error(`[Route Cleanup] Failed to fetch routes: ${response.status()} ${response.statusText()}`);
      return [];
    }

    const data = await response.json();
    await apiRequestContext.dispose();

    // The API returns paginated results with content array
    return data.content || [];
  } catch (error) {
    console.error('[Route Cleanup] Error fetching routes:', error);
    return [];
  }
}

/**
 * Delete a single route by ID
 */
export async function deleteRoute(routeId: string): Promise<boolean> {
  try {
    const apiRequestContext = await request.newContext();
    const response = await apiRequestContext.delete(`${ROUTES_ENDPOINT}/${routeId}`);
    await apiRequestContext.dispose();

    if (response.ok()) {
      console.log(`[Route Cleanup] Successfully deleted route: ${routeId}`);
      return true;
    } else if (response.status() === 404) {
      console.log(`[Route Cleanup] Route not found (already deleted?): ${routeId}`);
      return true; // Consider 404 as success since route doesn't exist
    } else {
      console.error(`[Route Cleanup] Failed to delete route ${routeId}: ${response.status()} ${response.statusText()}`);
      return false;
    }
  } catch (error) {
    console.error(`[Route Cleanup] Error deleting route ${routeId}:`, error);
    return false;
  }
}

/**
 * Delete multiple routes by IDs
 */
export async function deleteRoutes(routeIds: string[]): Promise<{ success: string[]; failed: string[] }> {
  const results = { success: [] as string[], failed: [] as string[] };

  console.log(`[Route Cleanup] Deleting ${routeIds.length} routes...`);

  // Delete routes in parallel with some concurrency control
  const batchSize = 5;
  for (let i = 0; i < routeIds.length; i += batchSize) {
    const batch = routeIds.slice(i, i + batchSize);
    const promises = batch.map(async (routeId) => {
      const success = await deleteRoute(routeId);
      return { routeId, success };
    });

    const batchResults = await Promise.all(promises);

    for (const result of batchResults) {
      if (result.success) {
        results.success.push(result.routeId);
      } else {
        results.failed.push(result.routeId);
      }
    }
  }

  return results;
}

/**
 * Clean up all routes created during tests
 */
export async function cleanupTestRoutes(): Promise<void> {
  const routeIds = routeTracker.getRouteIds();

  if (routeIds.length === 0) {
    console.log('[Route Cleanup] No test routes to clean up');
    return;
  }

  console.log(`[Route Cleanup] Starting cleanup of ${routeIds.length} test routes...`);

  const results = await deleteRoutes(routeIds);

  console.log(`[Route Cleanup] Cleanup completed:`);
  console.log(`  - Successfully deleted: ${results.success.length} routes`);
  console.log(`  - Failed to delete: ${results.failed.length} routes`);

  if (results.failed.length > 0) {
    console.warn('[Route Cleanup] Failed to delete routes:', results.failed);
  }

  // Clear the tracker after cleanup
  routeTracker.clear();
}

/**
 * Delete all routes from the database (use with caution!)
 */
export async function deleteAllRoutes(): Promise<void> {
  console.log('[Route Cleanup] Fetching all routes for deletion...');

  const routes = await getAllRoutes();

  if (routes.length === 0) {
    console.log('[Route Cleanup] No routes found in database');
    return;
  }

  console.log(`[Route Cleanup] Found ${routes.length} routes in database`);

  const routeIds = routes.map((route) => route.id);
  const results = await deleteRoutes(routeIds);

  console.log(`[Route Cleanup] Database cleanup completed:`);
  console.log(`  - Successfully deleted: ${results.success.length} routes`);
  console.log(`  - Failed to delete: ${results.failed.length} routes`);

  if (results.failed.length > 0) {
    console.error('[Route Cleanup] Failed to delete routes:', results.failed);
    throw new Error(`Failed to delete ${results.failed.length} routes from database`);
  }
}

/**
 * Delete routes matching specific criteria (e.g., test routes by name pattern)
 */
export async function deleteRoutesByPattern(namePattern: RegExp): Promise<void> {
  console.log(`[Route Cleanup] Fetching routes matching pattern: ${namePattern}`);

  const routes = await getAllRoutes();
  const matchingRoutes = routes.filter((route) => namePattern.test(route.name || ''));

  if (matchingRoutes.length === 0) {
    console.log('[Route Cleanup] No routes found matching pattern');
    return;
  }

  console.log(`[Route Cleanup] Found ${matchingRoutes.length} routes matching pattern`);

  const routeIds = matchingRoutes.map((route) => route.id);
  const results = await deleteRoutes(routeIds);

  console.log(`[Route Cleanup] Pattern-based cleanup completed:`);
  console.log(`  - Successfully deleted: ${results.success.length} routes`);
  console.log(`  - Failed to delete: ${results.failed.length} routes`);

  if (results.failed.length > 0) {
    console.warn('[Route Cleanup] Failed to delete routes:', results.failed);
  }
}

/**
 * Utility to extract route ID from API response
 */
export function extractRouteIdFromResponse(responseBody: string): string | null {
  try {
    const data = JSON.parse(responseBody);
    return data.id || null;
  } catch (error) {
    console.error('[Route Cleanup] Failed to parse response body:', error);
    return null;
  }
}

/**
 * Helper to track route creation in tests
 */
export function trackRouteCreation(responseBody: string): void {
  const routeId = extractRouteIdFromResponse(responseBody);
  if (routeId) {
    routeTracker.addRouteId(routeId);
  }
}

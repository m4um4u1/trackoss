#!/usr/bin/env ts-node

/**
 * Manual cleanup script for removing routes from the trackoss-backend database
 *
 * Usage:
 *   npm run cleanup:routes:all          # Delete all routes
 *   npm run cleanup:routes:test         # Delete test routes (by pattern)
 *   npm run cleanup:routes:list         # List all routes
 */

import { deleteAllRoutes, deleteRoutesByPattern, getAllRoutes } from '../utils/route-cleanup.js';

async function listRoutes() {
  console.log('📋 Listing all routes in database...\n');

  const routes = await getAllRoutes();

  if (routes.length === 0) {
    console.log('✅ No routes found in database');
    return;
  }

  console.log(`Found ${routes.length} routes:\n`);

  routes.forEach((route, index) => {
    console.log(`${index + 1}. ${route.name || 'Unnamed Route'}`);
    console.log(`   ID: ${route.id}`);
    console.log(`   Type: ${route.routeType || 'Unknown'}`);
    console.log(`   Public: ${route.isPublic ? 'Yes' : 'No'}`);
    console.log(`   Distance: ${route.totalDistance ? `${route.totalDistance.toFixed(2)}m` : 'Unknown'}`);
    console.log(`   Points: ${route.pointCount || 0}`);
    console.log(
      `   Created: ${route.createdAt ? new Date(route.createdAt[0], route.createdAt[1] - 1, route.createdAt[2]).toLocaleDateString() : 'Unknown'}`,
    );
    console.log('');
  });
}

async function deleteAllRoutesConfirm() {
  console.log('⚠️  WARNING: This will delete ALL routes from the database!');
  console.log('This action cannot be undone.\n');

  // In a real scenario, you might want to add a confirmation prompt
  // For now, we'll proceed with a safety check
  const routes = await getAllRoutes();

  if (routes.length === 0) {
    console.log('✅ No routes found in database');
    return;
  }

  console.log(`About to delete ${routes.length} routes...`);

  try {
    await deleteAllRoutes();
    console.log('✅ Successfully deleted all routes from database');
  } catch (error) {
    console.error('❌ Failed to delete all routes:', error);
    process.exit(1);
  }
}

async function deleteTestRoutes() {
  console.log('🧹 Deleting test routes (routes with test-related names)...\n');

  // Pattern to match test routes - adjust as needed
  const testPatterns = [
    /test/i,
    /e2e/i,
    /playwright/i,
    /spec/i,
    /demo/i,
    /sample/i,
    /^Test Route/i,
    /^E2E Test/i,
    /^Complete Test/i,
    /^Multi-Waypoint Test/i,
    /^Network Test/i,
    /^Form Persistence Test/i,
    /^Duplicate Route/i,
    /\d{13}$/, // Routes with timestamp suffixes like "Test Route 1752690201344"
  ];

  try {
    for (const pattern of testPatterns) {
      await deleteRoutesByPattern(pattern);
    }
    console.log('✅ Test route cleanup completed');
  } catch (error) {
    console.error('❌ Failed to delete test routes:', error);
    process.exit(1);
  }
}

async function main() {
  const command = process.argv[2];

  console.log('🚀 TrackOSS Route Cleanup Tool\n');

  switch (command) {
    case 'list':
      await listRoutes();
      break;

    case 'all':
      await deleteAllRoutesConfirm();
      break;

    case 'test':
      await deleteTestRoutes();
      break;

    default:
      console.log('Usage:');
      console.log('  ts-node e2e/scripts/cleanup-routes.ts list    # List all routes');
      console.log('  ts-node e2e/scripts/cleanup-routes.ts all     # Delete all routes');
      console.log('  ts-node e2e/scripts/cleanup-routes.ts test    # Delete test routes');
      console.log('');
      console.log('Or use npm scripts:');
      console.log('  npm run cleanup:routes:list');
      console.log('  npm run cleanup:routes:all');
      console.log('  npm run cleanup:routes:test');
      process.exit(1);
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the script
main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

import { cleanupTestRoutes } from './utils/route-cleanup';

/**
 * Global teardown function that runs after all tests complete
 * This ensures that any routes created during test execution are cleaned up
 */
async function globalTeardown() {
  console.log('\n🧹 Starting global teardown...');

  try {
    // Clean up any routes that were created during test execution
    await cleanupTestRoutes();

    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);

    // Don't fail the entire test run if cleanup fails
    // Just log the error and continue
    console.warn('⚠️  Test cleanup failed, but tests will not be marked as failed');
    console.warn('   You may need to manually clean up test data');
  }
}

export default globalTeardown;

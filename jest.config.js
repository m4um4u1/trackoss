module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/setup-jest.ts', 'jest-extended/all'],
  testMatch: ['**/+(*.)+(spec).+(ts)'],
  testPathIgnorePatterns: ['<rootDir>/e2e/'],
  collectCoverage: true,
  coverageReporters: ['html', 'text-summary', 'lcov'],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '@app/(.*)': '<rootDir>/src/app/$1',
    '@environments/(.*)': '<rootDir>/src/environments/$1',
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
};

export const environment = {
  production: false,
  useConfigService: false, // Use direct URLs for development
  baseUrl: 'http://localhost:8080', // Base URL for local Spring Boot backend
  valhallaUrl: 'https://valhalla1.openstreetmap.de', // URL for local Valhalla backend

  // MapTiler configuration for development
  mapTilerApiKey: '<KEY>',
  mapTilerUrl: 'https://api.maptiler.com/maps',
};

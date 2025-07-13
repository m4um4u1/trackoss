# TrackOSS: Open-Source Track and activity Management System

TrackOSS is an open-source alternative to proprietary platforms like Komoot and Strava, designed for outdoor enthusiasts who want to manage and analyze their tracks without relying on closed-source software. This project focuses on providing a free and open-source solution for tracking, visualizing, and sharing outdoor activities.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.12.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Map Tiles Configuration

TrackOSS now relies on a backend service to securely provide map tiles. The API key for the map tile service (e.g., MapTiler) is managed by this backend, not directly in the frontend application.

**Backend Setup:**

You will need to set up and run the corresponding backend service. Detailed instructions for setting up the Spring Boot backend proxy are provided separately (refer to project documentation or previous communications if this README is part of the frontend-only repository).

**Frontend Configuration:**

The frontend application is configured to connect to this backend service. The URLs are defined in:

- `src/environments/environments.ts` for development (defaults to `http://localhost:8080/api/map-proxy`)
- `src/environments/environment.prod.ts` for production (defaults to `/api/map-proxy`, assuming same-domain deployment or reverse proxy setup)

If your backend runs on a different URL during development or in production, you'll need to update these configuration files accordingly. For example, to change the development backend URL:

Modify `src/environments/environments.ts`:

```typescript
export const environment = {
  production: false,
  // Update this URL to where your backend is running
  mapTileProxyBaseUrl: 'http://your-backend-host:your-backend-port/api/map-proxy',
};
```

**Running the Application:**

1.  Ensure your backend service is running and accessible.
2.  Run the Angular development server: `ng serve`.
3.  Open your browser to `http://localhost:4200/`.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing with Playwright (local development only), run:

```bash
npm run e2e
```

**Additional E2E commands:**

```bash
npm run e2e:headed    # Run with browser UI visible
npm run e2e:ui        # Run with Playwright UI for debugging
npm run e2e:install   # Install Playwright browsers
```

**Note:** E2E tests require local backend services (map proxy and Valhalla routing service) to be running. These tests are not included in the CI/CD pipeline as they depend on locally hosted services.

For debugging with headed browser:

```bash
npm run e2e:headed
```

For interactive UI mode:

```bash
npm run e2e:ui
```

## Docker

### Building the Docker image

```bash
docker build -t trackoss .
```

### Running with Docker Compose

```bash
docker-compose up
```

The application will be available at `http://localhost:8080`.

### Using pre-built images

Pull the latest image from GitHub Container Registry:

```bash
docker pull ghcr.io/m4um4u1/trackoss:latest
docker run -p 8080:80 ghcr.io/m4um4u1/trackoss:latest
```

### Environment Configuration

The Docker image supports runtime configuration using environment variables:

#### Environment Variables

- **`MAP_TILE_PROXY_BASE_URL`**: URL for the map tile proxy service
  - Default: `/api/map-proxy`
  - Example: `http://backend:8080/api/map-proxy`

- **`VALHALLA_URL`**: URL for the Valhalla routing service
  - Default: `/api/valhalla`
  - Example: `http://valhalla:8002`

#### Usage Examples

**With Docker run:**

```bash
docker run -p 8080:80 \
  -e MAP_TILE_PROXY_BASE_URL="http://my-backend:8080/api/map-proxy" \
  -e VALHALLA_URL="http://my-valhalla:8002" \
  ghcr.io/m4um4u1/trackoss:latest
```

**With Docker Compose:**

```yaml
services:
  trackoss:
    image: ghcr.io/m4um4u1/trackoss:latest
    ports:
      - '8080:80'
    environment:
      MAP_TILE_PROXY_BASE_URL: 'http://backend:8080/api/map-proxy'
      VALHALLA_URL: 'http://valhalla:8002'
```

**For same-domain deployment with reverse proxy:**

```bash
docker run -p 8080:80 \
  -e MAP_TILE_PROXY_BASE_URL="/api/map-proxy" \
  -e VALHALLA_URL="/api/valhalla" \
  ghcr.io/m4um4u1/trackoss:latest
```

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration:

### Pull Request Testing

- **Unit Tests**: Jest tests with coverage reporting
- **Code Quality**: Prettier formatting checks and build verification

### Main Branch Build

- **Automated Testing**: Unit tests run on every push to main
- **Docker Build**: Automatic Docker image build and push to GitHub Container Registry
- **Image Tags**:
  - `latest` for the most recent main branch build
  - `main-<commit-sha>` for specific commits
  - Available at `ghcr.io/m4um4u1/trackoss`

### Manual Builds

- Workflow dispatch available for manual Docker builds
- Configurable tags and push options

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

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

- `src/environments/environments.ts` for development (defaults to `http://localhost:8080/api/tiles`)
- `src/environments/environment.prod.ts` for production (defaults to `/api/tiles`, assuming same-domain deployment or reverse proxy setup)

If your backend runs on a different URL during development or in production, you'll need to update these configuration files accordingly. For example, to change the development backend URL:

Modify `src/environments/environments.ts`:

```typescript
export const environment = {
  production: false,
  // Update this URL to where your backend is running
  mapTileProxyBaseUrl: 'http://your-backend-host:your-backend-port/api/tiles',
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

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

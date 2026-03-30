# FaceTrack Client

Frontend application for the FaceTrack facial-recognition attendance platform.

## Overview

This app provides role-based attendance workflows for schools and organizations:

- Students and reps can view attendance records and session details.
- Lecturers can manage attendance sessions and view personal payroll.
- Staff can track their own attendance dashboard.
- Admin and system admin users can manage members, sessions, modules, and staff payroll.
- Kiosk and lecturer-kiosk flows support face-based check-in/check-out.

## Key Features

- Role-based authentication and protected routes.
- Dashboard views by role (student, lecturer, staff, admin).
- Session management with check-in/check-out attendance modes.
- Attendance analytics, charts, and reporting.
- Staff management payroll view with worked-hours and overtime breakdown.
- Admin payroll slip printing from lecturer details.
- Face model assets loaded from public/models.

## Tech Stack

- React 18
- TypeScript
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- shadcn/ui + Radix UI
- Recharts
- face-api.js

## Prerequisites

- Node.js 18+
- npm 9+

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create a .env file in the project root (or set env vars in your shell):

```env
VITE_ENVIRONMENT=development
VITE_API_DEV_URL=http://localhost:4000/api
VITE_API_PROD_URL=https://api.comas.edu.gh/api
```

3. Start development server:

```bash
npm run dev
```

Default dev server runs on:

- http://localhost:5175

## Scripts

- npm run dev: start local development server
- npm run build: production build
- npm run build:dev: development-mode build
- npm run preview: preview production build locally
- npm run lint: run ESLint

## Routing Notes

- Auth page: /auth
- Role-based app routes: /:role/dashboard, /:role/members, /:role/sessions, etc.
- Kiosk route: /kiosk/:sessionId
- Lecturer kiosk route: /kiosk/lecturer/:slotId

## Backend Integration

The frontend expects the FaceTrack backend API to be running and reachable via:

- VITE_API_DEV_URL for development
- VITE_API_PROD_URL for production

If env vars are not provided, the app falls back to:

- Development: http://localhost:4000/api
- Production: https://api.comas.edu.gh/api

## Deployment

The repo includes Vercel SPA rewrites in vercel.json so client-side routes resolve correctly.

Typical deployment flow:

1. Build the app with npm run build.
2. Deploy the dist output to your hosting provider.
3. Configure production environment variables.

## Notes

- Face recognition model files are stored in public/models and should be present in deployments.
- Analytics is enabled via @vercel/analytics.

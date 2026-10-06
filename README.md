# TRACE Client (AthenAI) 🎯

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-v5-FF4154?logo=reactquery&logoColor=white)](https://tanstack.com/query)
[![shadcn/ui](https://img.shields.io/badge/UI-shadcn%2Fui-black)](https://ui.shadcn.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **TRACE (AthenAI)** is an enterprise-grade, role-based biometric attendance and payroll management frontend. It interfaces with deep learning face-recognition pipelines and provides touchless kiosk verification, classroom session tracking, real-time analytics, automated staff overtime and payroll calculations, and institution-wide administration.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [System Features](#-system-features)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Tech Stack](#-tech-stack)
- [Project Architecture & Directory Structure](#-project-architecture--directory-structure)
- [Biometric Kiosk & Verification Flow](#-biometric-kiosk--verification-flow)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running Locally](#running-locally)
- [Available Scripts](#-available-scripts)
- [Routing Reference](#-routing-reference)
- [API & Backend Integration](#-api--backend-integration)
- [Export & Reporting](#-export--reporting)
- [Deployment](#-deployment)
- [Contributing & Code Style](#-contributing--code-style)

---

## 🌟 Overview

The TRACE Client provides a responsive web interface tailored for academic institutions and enterprise organizations. It eliminates proxy attendance and tedious manual roll calls through client-side computer vision assistance (`face-api.js`) and high-throughput vector search verification on the backend.

### Key Highlights
- **Sub-Second Biometric Check-In/Check-Out:** Instant recognition via interactive kiosk interfaces.
- **Dynamic Role-Based Dashboards:** Contextual views tailored for Students, Course Reps, Lecturers, Staff, and Administrators.
- **Session Lifecycle Management:** Supports classes, labs, tutorials, exams, events, and workshifts with geo/time-fenced parameters.
- **Automated Payroll & Overtime Engine:** Computes verified hours worked, overtime rates, and generates printable payslips and Excel rosters.
- **Real-Time Synchronisation:** Live toast notifications, attendance confirmations, and active status monitors.

---

## 🚀 System Features

### 1. 🎭 Touchless Biometric Kiosks
- **Student Kiosk (`/kiosk/:sessionId`)**: High-speed, continuous camera stream processing with face detection bounding boxes and instant feedback (success, duplicate, unrecognized).
- **Lecturer Slot Kiosk (`/kiosk/lecturer/:slotId`)**: Dedicated kiosk for faculty session sign-in and verified slot logging.
- **Virtual Meeting Room (`/meeting/:sessionId`)**: Remote session attendance verification with live attendee feeds.

### 2. 📊 Role-Driven Dashboards
- **Students & Reps**: Overall attendance rate (%), course-wise breakdown, historical session timelines, and class alerts.
- **Lecturers**: Active teaching sessions, student enrollment counts, real-time sign-ins, and personal payroll earnings breakdown.
- **Staff**: Daily workshift tracking, check-in/check-out timers, overtime accumulation, and personal attendance statistics.
- **Admin / System Admin / Owner**: System-wide health metrics, institutional enrollment, session distribution charts, lecturer rate matrices, and master audit logs.

### 3. 👥 Member & Organization Management
- User management across all roles with profile details, biometric enrollment status, and access suspension controls.
- Dedicated Course Rep delegation management for lecturers and department heads.
- Sub-admin role assignment and permissions configuration.

### 4. 💰 Payroll & Reporting System
- Real-time aggregation of attendance hours into verified payable units.
- Configurable hourly rates, overtime multipliers, and deductions.
- **Export Formats**:
  - Direct PDF payslip and report generation via `jspdf` & `jspdf-autotable`.
  - Spreadsheet export via `xlsx` for external accounting and institutional records.

### 5. 🔔 Notifications & Preferences
- In-app notification center categorised by priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- Dark/Light theme switching powered by `next-themes`.

---

## 🔐 Role-Based Access Control (RBAC)

The system enforces strict route guarding and navigation controls based on user roles:

| Role | Access Scope | Primary Capabilities |
| :--- | :--- | :--- |
| **`OWNER`** | Full System Scope | Root configuration, billing, system admin delegation, global audit |
| **`SYSTEM_ADMIN`** | Institutional Scope | User management, institution-wide settings, global analytics |
| **`ADMIN`** | Department / Faculty Scope | Member management, module assignments, payroll computation |
| **`LECTURER`** | Academic / Course Scope | Session creation, live kiosk control, course reps, personal payroll |
| **`STAFF`** | Operational Scope | Shift attendance, worked-hours log, personal metrics |
| **`REP`** | Course Representative Scope | Delegated class attendance review, student roster view |
| **`STUDENT`** | Individual Scope | Personal attendance stats, course records, session history |

---

## 🛠 Tech Stack

### Core Framework & Build Tooling
- **React 18** (`react`, `react-dom`): Component-driven UI architecture with hooks and concurrent features.
- **TypeScript 5.8**: Static typing, strict interfaces, and type safety across all services.
- **Vite 5.4**: Lightning-fast Hot Module Replacement (HMR) and optimized Rollup bundling with `@vitejs/plugin-react-swc`.

### State Management & Data Fetching
- **TanStack Query v5** (`@tanstack/react-query`): Declarative server-state caching, background re-fetching, and optimistic updates.
- **React Context API**: Global state for `AuthContext`, `SessionContext`, and `AttendanceContext`.

### Styling & UI Component System
- **Tailwind CSS 3.4**: Utility-first styling with custom themes and animations (`tailwindcss-animate`).
- **shadcn/ui & Radix UI**: Accessible, unstyled primitives (Dialogs, Tooltips, Dropdowns, Tabs, Popovers, Accordions).
- **Lucide React**: Vector iconography set.
- **Sonner & Toaster**: Animated toast notifications.

### Data Visualization & Utilities
- **Recharts**: Responsive area, bar, pie, and line charts for attendance trends.
- **date-fns**: Date manipulation and formatting.
- **jsPDF & jsPDF-AutoTable**: Client-side PDF payslip and attendance report generator.
- **xlsx**: Excel spreadsheet generation and parsing.
- **face-api.js**: Client-side face detection models loaded from `/public/models`.

---

## 📁 Project Architecture & Directory Structure

```text
new-athenai-client/
├── public/
│   ├── models/                # Pre-trained face-api.js weights (SSD Mobilenet, Landmark, Face Recognition)
│   └── favicon.ico
├── src/
│   ├── apis/
│   │   └── api.ts             # Axios/Fetch HTTP client configuration & interceptors
│   ├── assets/                # Static images, logos, and vector illustrations
│   ├── components/
│   │   ├── admin/             # System admin & institution management components
│   │   ├── auth/              # Auth forms, login screens, and ProtectedRoute guard
│   │   ├── dashboard/         # Role-specific analytics, stat cards, and chart widgets
│   │   ├── layout/            # MainLayout, Sidebar, Navbar, and Mobile Nav
│   │   ├── members/           # User tables, member registration, and profile dialogs
│   │   ├── modules/           # Course modules, academic calendar, and assignment components
│   │   ├── sessions/          # Session creator, live session monitor, attendance rosters
│   │   ├── staff/             # Staff shift trackers, overtime counters, and payroll slips
│   │   └── ui/                # shadcn/ui primitive library (Button, Dialog, Select, etc.)
│   ├── constants/             # Application constants, fallback values, and config maps
│   ├── contexts/
│   │   ├── AuthContext.tsx    # Authentication state, token storage, and session lifecycle
│   │   ├── AttendanceContext.tsx # Active attendance state and check-in listeners
│   │   └── SessionContext.tsx # Current active academic/work session context
│   ├── enums/
│   │   └── enums.ts           # Central TypeScript enums (Role, SessionMode, AttendanceStatus, etc.)
│   ├── hooks/                 # Custom React hooks (useAuth, useAttendance, useMediaQuery, etc.)
│   ├── interface/             # Data models and API request/response contracts
│   ├── lib/                   # Utility helpers (cn class merger, date helpers, formatters)
│   ├── pages/
│   │   ├── AdminManagement.tsx    # Sub-admin & privilege management view
│   │   ├── Auth.tsx               # Login, registration, and password recovery
│   │   ├── CourseRepManagement.tsx# Delegated course representative assignment
│   │   ├── Dashboard.tsx          # Dynamic role-based landing dashboard
│   │   ├── Kiosk.tsx              # Student camera verification kiosk
│   │   ├── LecturerKiosk.tsx      # Lecturer slot check-in kiosk
│   │   ├── MeetingRoom.tsx        # Virtual meeting room attendance monitor
│   │   ├── Members.tsx            # Member directory and enrollment status
│   │   ├── Notifications.tsx      # Notification center
│   │   ├── Sessions.tsx           # Academic & shift session management
│   │   ├── Settings.tsx           # Profile, security, and institutional preferences
│   │   └── NotFound.tsx           # 404 error page
│   ├── services/
│   │   ├── attendance.services.ts # Attendance check-in/out, logs, and query endpoints
│   │   ├── auth.services.ts       # Login, refresh token, password reset API
│   │   ├── courses.services.ts    # Course & curriculum endpoints
│   │   ├── modules.service.ts     # Academic modules and assignments
│   │   ├── notifications.services.ts # Notification fetch and status toggle
│   │   ├── payroll.service.ts     # Hours aggregation, rates, and payroll computation
│   │   ├── sessions.service.ts    # Session lifecycle API (start, end, schedule)
│   │   └── users.services.ts      # User CRUD, role updates, and biometric registration
│   ├── types/                 # Auxiliary TypeScript type declarations
│   ├── App.tsx                # App root with Providers, QueryClient, and Router configuration
│   ├── main.tsx               # DOM mount entrypoint
│   └── index.css              # Global styles, Tailwind directives, and CSS custom variables
├── docker-compose.yaml        # Local containerized orchestration
├── vercel.json                # Vercel SPA rewrite rules for client-side routing
├── vite.config.ts             # Vite build configuration and path aliases (@/*)
├── tailwind.config.ts         # Tailwind design system tokens, themes, and animations
└── tsconfig.json              # TypeScript compiler configuration
```

---

## 👁️ Biometric Kiosk & Verification Flow

The client supports both edge-assisted face detection and backend vector-matched identity verification:

```
+-----------------------------------------------------------------------------------+
|                                  BROWSER CLIENT                                    |
|                                                                                   |
|  [ Camera Stream ] ---> [ face-api.js Canvas Overlay ] ---> [ Frame Extraction ]  |
|                               (SSD Mobilenet BBox)                                |
+-----------------------------------------------------------------------------------+
                                         |
                                         | HTTP POST / WebSocket
                                         v
+-----------------------------------------------------------------------------------+
|                                  BACKEND SERVER                                   |
|                                                                                   |
|  [ RetinaFace Detection ] ---> [ 5-Point Alignment ] ---> [ ArcFace 512-D Embed ] |
|                                                                       |           |
|                                                                       v           |
|  [ Final Decision ] <--- [ Threshold Check >= 0.65 ] <--- [ Qdrant Vector Search ]|
+-----------------------------------------------------------------------------------+
                                         |
                                         | Real-Time Event
                                         v
+-----------------------------------------------------------------------------------+
|  [ Kiosk UI Feedback ] ===> Green Toast ("Welcome, [Name]") / Audio Chime         |
+-----------------------------------------------------------------------------------+
```

---

## 🚦 Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher (or `pnpm` / `yarn`)
- **Backend API**: Running instance of the TRACE Backend Server.

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone https://github.com/techpepson/face-check-client.git
   cd face-check-client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Configuration

Create a `.env` file in the root directory:

```env
# Runtime Environment (development | production)
VITE_ENVIRONMENT=development

# Backend API Base URLs
VITE_API_DEV_URL=http://localhost:4000/api
VITE_API_PROD_URL=https://api.comas.edu.gh/api
```

### Running Locally

Start the Vite development server:
```bash
npm run dev
```

By default, the application will be accessible at:
```
http://localhost:5175
```

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local Vite development server with Hot Module Replacement (HMR) |
| `npm run build` | Compiles and optimizes production assets into the `dist/` directory |
| `npm run build:dev` | Compiles a development-mode build with source maps |
| `npm run preview` | Spins up a local static server to preview the production `dist/` build |
| `npm run lint` | Executes ESLint across all TypeScript and TSX source files |

---

## 🗺️ Routing Reference

| Path | Access Guard | Component | Description |
| :--- | :--- | :--- | :--- |
| `/auth` | Public | `Auth` | Authentication gateway (Login & Password Reset) |
| `/:role/dashboard` | Protected (Role Matched) | `Dashboard` | Role-specific primary analytics and quick actions |
| `/:role/members` | Protected (Role Matched) | `Members` | Organization member roster and status |
| `/:role/sessions` | Protected (Role Matched) | `Sessions` | Session scheduler, history, and active monitors |
| `/:role/notifications` | Protected (Role Matched) | `Notifications` | User alert and activity history center |
| `/:role/settings` | Protected (Role Matched) | `Settings` | Profile, password, and institutional preferences |
| `/:role/admins` | Protected (`OWNER`, `SYS_ADMIN`, `ADMIN`) | `AdminManagement` | Sub-admin creation and privilege management |
| `/:role/course-reps` | Protected (`ADMIN`, `LECTURER`) | `CourseRepManagement` | Class representative assignment and delegations |
| `/kiosk/:sessionId` | Public / Standalone | `Kiosk` | Fullscreen biometric attendance kiosk for students |
| `/kiosk/lecturer/:slotId` | Public / Standalone | `LecturerKiosk` | Faculty session check-in and slot sign-in kiosk |
| `/meeting/:sessionId` | Protected | `MeetingRoom` | Virtual session room attendance feed |
| `*` | Catch-All | `NotFound` | 404 page with navigation fallback |

---

## 🔗 API & Backend Integration

The frontend communicates with the backend via centralized services located in `src/services/`. Every service uses the shared HTTP configuration in `src/apis/api.ts` with:
- Automatic JWT Bearer token attachment via `Authorization` header.
- Global token expiry detection and automatic logout redirection.
- Consistent error toast notifications via `Sonner`.

---

## 📄 Export & Reporting

The client includes reporting capabilities:
1. **Attendance Sheets**: Export class attendance records to Excel (`.xlsx`) or printable PDF (`.pdf`) with student ID, check-in time, and status tags.
2. **Staff / Lecturer Payslips**: Generate formal PDF payslips detailing regular hours, overtime hours, hourly pay rate, gross pay, deductions, and net compensation.

---

## 🚢 Deployment

### Vercel (Recommended)
The repository contains a pre-configured `vercel.json` to handle Single Page Application (SPA) route rewrites:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

1. Connect your repository to Vercel.
2. Set Framework Preset to **Vite**.
3. Configure `VITE_ENVIRONMENT` and `VITE_API_PROD_URL` in the Vercel Dashboard.
4. Deploy.

### Docker Deployment
Build and run using the included `docker-compose.yaml`:
```bash
docker compose up -d --build
```

---

## 🤝 Contributing & Code Style

1. **Path Aliasing**: Always import internal modules using the `@/` alias (e.g. `import { Button } from "@/components/ui/button"`).
2. **Component Architecture**: Keep UI primitives in `src/components/ui/` and business-specific views organized under their respective domain folders (`admin`, `dashboard`, `sessions`, `members`, `staff`).
3. **Type Safety**: Avoid using `any`. Define data models in `src/interface/` or `src/enums/`.
4. **Code Quality**: Run `npm run lint` prior to submitting pull requests.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

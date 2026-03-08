# NUTTERX - Social Networking App

## Overview

NUTTERX is a mobile-first social networking web application (PWA) that allows users to connect with friends, share posts, chat in real-time, and manage notifications. The app features a landing page, authentication, a social feed, friend management, direct messaging, notifications, user profiles, and an admin dashboard.

Key features:
- User registration/login with JWT authentication
- Social feed with posts, likes, and comments
- Friend requests and friend management
- Direct messaging (conversations)
- Notifications system
- User profile management with avatar support
- Admin dashboard for user management and password reset requests
- Dark/light mode theming via CSS variables
- PWA-ready structure

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: `wouter` (lightweight client-side routing)
- **State/Data Fetching**: TanStack React Query v5 for server state, local React state for UI
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode). Custom design system using "New York" style from shadcn/ui
- **UI Components**: shadcn/ui component library (Radix UI primitives), extended with a custom `shared.tsx` component file for app-specific reusable components (Avatar, Card, Button, TimeAgo, Input)
- **Fonts**: Plus Jakarta Sans (body), Syne (display/headings), loaded via Google Fonts
- **Authentication flow**: JWT stored in `localStorage` under key `nutterx_token`. A custom `apiFetch` utility in `client/src/lib/api.ts` attaches the Bearer token to all API requests and handles `401` responses by clearing the token and dispatching an `auth-expired` event
- **Form Validation**: Zod schemas shared between client and server via `shared/schema.ts`
- **Pages**:
  - `/` — Landing page
  - `/auth` — Login / Signup / Forgot password
  - `/home` — Social feed
  - `/friends` — Friend discovery, friend list, and requests
  - `/chats` — Conversations and messaging
  - `/notifications` — Notification center
  - `/profile` — Current user's profile
  - `/profile/:id` — Other users' profiles
  - `/admin` — Admin dashboard (accessed via `?admin=true` query param or `/admin` route)

### Backend Architecture

- **Runtime**: Node.js with Express (TypeScript via `tsx`)
- **Database**: MongoDB via Mongoose ODM (connection string from `MONGO_URI` env var)
- **Authentication**: JWT (`jsonwebtoken`), tokens expire in 7 days. Admin access uses a separate admin key checked via query param or `x-admin-key` header
- **Password hashing**: bcrypt
- **Route definitions**: Type-safe route contracts defined in `shared/routes.ts` using Zod schemas, consumed by both the server handlers and frontend hooks
- **Dev server**: Vite middleware integrated into Express for HMR in development; serves static build in production
- **Build**: Client built by Vite, server bundled by esbuild into `dist/index.cjs`

### Data Models (MongoDB/Mongoose)

- **User**: name, username, phone, email, password (hashed), profilePicture, isAdmin, status (active/restricted), friends[], friendRequests[], sentRequests[]
- **Post**: authorId (ref User), content, likes[] (ref User)
- **Comment**: postId (ref Post), authorId (ref User), content
- **Message**: conversationId (ref Conversation), senderId (ref User), content
- **Conversation**: participants[] (ref User)
- **Notification**: recipientId, senderId, type (like/comment/friend_request/friend_accept/friend_post/system), postId, content, read
- **ForgotPassword**: userId, username, desiredPassword, status

### Shared Schema Layer

`shared/schema.ts` and `shared/routes.ts` define Zod validation schemas and API route contracts (method, path, input, response shapes) used on both client and server. This eliminates duplication and keeps the API contract strongly typed end-to-end.

### Note on Drizzle

The repo includes `drizzle.config.ts` and a `shared/schema.ts` that also exports Drizzle-compatible types for PostgreSQL, and a `server/storage.ts` with an in-memory storage fallback. However, the **active database is MongoDB via Mongoose** — Drizzle/Postgres is scaffolded but not currently wired into the running application.

### Real-time / Polling

- Chat messages use simple polling (3-second interval via React Query `refetchInterval`)
- Notifications use 10-second polling
- No WebSocket layer is currently implemented

## External Dependencies

### Core Runtime
| Dependency | Purpose |
|---|---|
| `express` | HTTP server |
| `mongoose` | MongoDB ODM |
| `jsonwebtoken` | JWT generation and verification |
| `bcrypt` | Password hashing |
| `zod` | Runtime schema validation (shared client/server) |

### Frontend
| Dependency | Purpose |
|---|---|
| `react` / `react-dom` | UI framework |
| `wouter` | Client-side routing |
| `@tanstack/react-query` | Server state management and data fetching |
| `@radix-ui/*` | Accessible UI primitives (via shadcn/ui) |
| `tailwindcss` | Utility-first CSS |
| `lucide-react` | Icon library |
| `class-variance-authority` + `clsx` + `tailwind-merge` | Dynamic class name utilities |
| `react-hook-form` + `@hookform/resolvers` | Form management |
| `date-fns` | Date formatting utilities |

### Build & Dev Tools
| Dependency | Purpose |
|---|---|
| `vite` | Frontend bundler and dev server |
| `tsx` | TypeScript execution for server dev |
| `esbuild` | Server production bundler |
| `drizzle-kit` | Database migration tooling (scaffolded, not active) |
| `@replit/vite-plugin-runtime-error-modal` | Replit dev overlay |
| `@replit/vite-plugin-cartographer` | Replit code mapping (dev only) |

### External Services
- **MongoDB Atlas**: Primary database (`MONGO_URI` environment variable, defaults to a hardcoded Atlas cluster — **must be overridden in production**)
- **Google Fonts**: Typography (Plus Jakarta Sans, Syne, DM Sans, Fira Code, Geist Mono)

### Environment Variables
| Variable | Purpose | Default |
|---|---|---|
| `MONGO_URI` | MongoDB connection string | Hardcoded Atlas URI (change in production) |
| `JWT_SECRET` | JWT signing secret | `nutterx_super_secret_key_12345` (change in production) |
| `ADMIN_KEY` | Admin dashboard access key | `nutterx-admin-123` (change in production) |
| `DATABASE_URL` | PostgreSQL URL (for Drizzle, if activated) | Required only if using Drizzle |

> ⚠️ **Security note**: The default values for `JWT_SECRET`, `ADMIN_KEY`, and `MONGO_URI` are hardcoded fallbacks and must be replaced with secure environment variables in any production deployment.
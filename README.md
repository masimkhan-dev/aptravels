# Akbar Pura Travels Suite

**A modern, full-stack travel agency management system** built for Akbar Pura International Travels & Tours — Nowshera, KPK.

> Your Journey, Our Responsibility.

---

## Project Overview

The Akbar Pura Travels Suite is a complete digital operations platform comprising:

- A **public-facing portal** (landing page, services, gallery, packages, inquiry form)
- A **secure admin dashboard** for back-office operations (bookings, customers, payments, staff, expenses)
- A **Supabase-powered backend** (PostgreSQL database, Row Level Security, Deno Edge Functions)

The system handles the full lifecycle of travel bookings — Umrah packages, airline tickets, and UAE/international visa processing — with integrated financial ledgering, agent settlement tracking, and multi-role staff access control.

---

## Features

| Module | Description |
|--------|-------------|
| **Public Portal** | Landing page with hero section, services, gallery, Umrah/Hajj packages, testimonials, and inquiry form |
| **Admin Dashboard** | KPI metrics, booking summaries, and financial overview |
| **Booking Management** | Create and manage Ticket, Visa, and Umrah bookings with multi-step workflow tracking |
| **Customer Directory** | Full customer profiles with CNIC/Passport, contact history, and booking ledger |
| **Payment Ledger** | Double-entry payment recording with void/reversal support |
| **Expense Tracker** | Outgoing payment logging linked to bookings and suppliers |
| **Agent Ledger** | Agent balance tracking, settlement records, and printable statements |
| **Staff Management** | Secure staff onboarding via Supabase Edge Functions with role assignment |
| **Role-Based Access Control** | `admin`, `manager`, `sales`, `ops` roles with granular permission gates |
| **Gallery Management** | Admin-controlled gallery with categorized image uploads |
| **Packages & Services** | Dynamic Umrah package and service management |
| **Site Settings** | Admin-editable contact info, agency details, and about content |
| **Help & Guide** | Built-in system guide for all staff roles |

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | v18.3 | UI library |
| TypeScript | v5.8 | Type safety |
| Vite | v5.4 | Build tool & dev server |
| Tailwind CSS | v3.4 | Utility-first styling |
| Shadcn UI + Radix UI | — | Accessible component system |
| Framer Motion | v12 | Fluid animations |
| React Router DOM | v6.30 | Client-side routing |
| TanStack Query | v5.83 | Server state management |
| React Hook Form + Zod | — | Form handling & validation |
| Recharts | v2 | Dashboard analytics charts |
| Sonner | v1.7 | Toast notifications |
| Lucide React | v0.462 | Icon set |

### Backend & Infrastructure

| Technology | Purpose |
|------------|---------|
| Supabase | PostgreSQL database, authentication, storage, real-time |
| Supabase Auth | Email/password authentication for admin staff |
| Row Level Security (RLS) | Database-level access control |
| Deno Edge Functions | Secure serverless logic (staff creation, admin bootstrapping) |
| Vercel | Recommended deployment platform |

---

## Directory Structure

```
akbar-pura-travels-suite/
├── public/                         # Static assets
│   ├── favicon.png
│   ├── logo-main.png
│   ├── placeholder.svg
│   └── robots.txt
│
├── src/
│   ├── App.tsx                     # Root router and app providers
│   ├── main.tsx                    # Application entry point
│   ├── index.css                   # Global styles, Tailwind, CSS variables
│   │
│   ├── components/
│   │   ├── admin/                  # Admin layout, protected routes, global search
│   │   ├── public/                 # Public-facing landing page sections
│   │   └── ui/                     # Shadcn UI primitives
│   │
│   ├── hooks/                      # Custom React hooks
│   ├── integrations/supabase/      # Typed Supabase client and DB types
│   ├── lib/                        # Constants, utilities, helpers
│   ├── pages/                      # Application views (public + admin)
│   └── services/                   # Service layer (Supabase API abstraction)
│
├── supabase/
│   ├── functions/                  # Deno Edge Functions
│   └── migrations/                 # PostgreSQL migration history
│
├── .env.example                    # Environment variable template
├── package.json
├── vite.config.ts
└── vercel.json
```

---

## Installation

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A **Supabase** project (database + auth configured)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials (see `.env.example` for all required variables).

> **Never commit your `.env` file.** It is already listed in `.gitignore`.

---

## Running Locally

```bash
npm run dev
```

The development server starts at `http://localhost:8080`.

---

## Production Build

```bash
npm run build
```

Compiled output is placed in the `dist/` folder.

---

## Deployment Guide

### Vercel (Recommended)

1. Push the repository to GitHub/GitLab.
2. Import the project in [Vercel](https://vercel.com).
3. Set the Framework Preset to `Vite`.
4. Add environment variables in the Vercel dashboard.
5. Deploy. The `vercel.json` is pre-configured for SPA routing.

### Netlify

1. Connect your Git repository in Netlify.
2. Build command: `npm run build` | Publish directory: `dist`.
3. Add environment variables in site settings.

---

## Deploying Supabase Edge Functions

```bash
npx supabase login
npx supabase link --project-ref your-project-id
npx supabase functions deploy create-staff-user --no-verify-jwt
npx supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project REST API URL | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | Yes |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project reference ID | Optional |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Blank page after deploy | Ensure `vercel.json` is present for SPA routing |
| Auth not working | Verify Supabase URL and anon key are correct |
| Staff cannot log in | Check `user_roles` table and Supabase Email Auth settings |
| Edge functions failing | Redeploy with Supabase CLI and verify secrets |
| 404 on page refresh | Add a catch-all redirect to `index.html` on your host |

---

## Development Team

| Role | Name |
|------|------|
| **Lead Developer** | Iqra Zakir |
| **Former Developer** | M. Asim Khan |

---

## License

MIT License — © 2026 Akbar Pura International Travels & Tours. All rights reserved.

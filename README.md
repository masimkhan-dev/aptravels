# Akbar Pura Travels Suite

A modern, full-stack travel agency management suite designed for Akbar Pura Travels. Built with performance, security, and dynamic workflows in mind, this application provides an interactive portal for clients and a fully comprehensive admin dashboard for back-office operations.

## Features

- **Public Facing Portal**: Beautifully designed landing page, services overview, gallery, and dynamic travel packages.
- **Admin Dashboard**: Dedicated portal for staff members to manage daily operations.
- **Booking & Ledger Management**: Multi-step workflows for Umrah and Visa processing, including invoice generation, ledger tracking, and payment history.
- **Role-Based Access Control (RBAC)**: Secure access tailored to specific roles (`admin`, `manager`, `sales`, `ops`).
- **Staff Management Structure**: Secure edge-function driven staff onboarding avoiding raw API key distributions.
- **Dynamic Content Management**: Easy configuration for service types, gallery image allocations, and pricing metrics.

## Tech Stack

**Front-End Integration:**
- [React (v18)](https://react.dev/) - UI Library
- [Vite](https://vitejs.dev/) - Build Tool & Development Server
- [TypeScript](https://www.typescriptlang.org/) - Type Safety
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first styling
- [Shadcn UI](https://ui.shadcn.com/) & Radix UI - Accessible component system
- [Framer Motion](https://www.framer.com/motion/) - Fluid animations

**Back-End & Database:**
- [Supabase](https://supabase.com/) - PostgreSQL Database, Authentication, and Storage
- **Deno Edge Functions** - For secure serverless tasks (e.g., admin creation workflows).

---

## Directory Structure

```text
akbar-pura-travels-suite-main/
├── public/                 # Static assets (images, icons)
├── src/                    # Main source code
│   ├── assets/             # Global stylesheets and bundled assets
│   ├── components/         # Reusable React components (UI, layouts, forms)
│   ├── hooks/              # Custom React hooks (e.g., useRole)
│   ├── integrations/       # External service utilities (Supabase clients/types)
│   ├── lib/                # Utility functions and shared helpers (e.g., class merging)
│   └── pages/              # Application views 
│       ├── admin/          # Back-office screens (Dashboard, Bookings, Ledger, Staff, etc)
│       └── Index.tsx       # Main public-facing marketing page
├── supabase/               # Backend logic and configuration
│   ├── functions/          # Deno-based Edge Functions
│   │   ├── create-user/    # Secure logic for staff account deployment
│   │   └── setup-admin/    # Bootstrapping initial super admin
│   └── seed.sql            # Base schema structures or migrations
├── package.json            # NPM dependencies and project scripts
├── tailwind.config.ts      # Tailwind CSS theming and constraints
└── vite.config.ts          # Vite build configuration
```

---

## API & Database Integration

The application relies heavily on the Supabase ecosystem mapping directly to PostgreSQL schemas. 

### Core Database Tables:
- `user_roles`: Maps authenticated `user_id` to their functional roles (`admin`, `manager`, `sales`, `ops`). Handles systemic UI access restriction.
- `staff_profiles`: Contains extended user metadata for staff members logging into the dashboard.
- `bookings`: Central ledger storing flight, visa, and Umrah bookings. Tracks complex states like 'Visa Stamping Pipeline'.
- `payments`: Relational mapping of transactions against bookings, including full voiding support and auditing records.
- `packages` / `services` / `gallery_categories`: Content management structures feeding the dynamic front-end platform.

### Edge Functions:

Rather than allowing sign-ups, staff creation is tightly controlled via Deno Edge Functions avoiding JWT leakage.

1. **`create-user`** (Deployed as `create-staff-user`):
   - **Method:** `POST`
   - **Responsibility:** Securely bypasses default Supabase rate limits/auth boundaries by using the Service Role SDK to create new Staff identities, populate their `staff_profiles` rows, and assign exact roles in `user_roles` natively in a single API round-trip.

2. **`setup-admin`**:
   - **Responsibility:** Used exclusively for establishing the primary platform Owner. Runs once to bind the root `admin` policy.

---

## Getting Started

### Prerequisites

You will need the following installed:
- Node.js (v18+)
- Supabase CLI (if developing backend edge functions locally)

### 1. Installation

Clone the repository and install the dependencies:
```bash
# Install dependencies
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory and configure your Supabase instance:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Used exclusively for Supabase CLI & Edge function Deployments
# Do NOT prefix with VITE_
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Running the application

To start the Vite development server:
```bash
npm run dev
```

### 4. Deploying Edge Functions

If modifying backend capabilities (like staff-management), you must deploy them via the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref your_project_id
npx supabase functions deploy create-staff-user --no-verify-jwt

# Push secrets to production edge environment
npx supabase secrets set SUPABASE_URL=your_project_url
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Build for Production

To create an optimized production build:
```bash
npm run build
```
This will compile the TypeScript, bundle assets, and output static files into the `dist/` folder ready for deployment to platforms like Vercel or Netlify.

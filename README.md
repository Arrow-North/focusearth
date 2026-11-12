# Focus Earth Energy Portal

A comprehensive LED lighting solutions and energy management platform.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **State Management**: TanStack Query (React Query)

## Getting Started

### Prerequisites

- Node.js 22.12+ (verified with 22.23.0; install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or yarn
- Supabase CLI (for local development)

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd focusearth

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Environment Variables

Create a `.env.local` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Project Structure

```
focusearth/
├── src/
│   ├── components/     # React components
│   │   ├── estimates/  # Estimate/Order workflow components
│   │   ├── layout/     # Layout components
│   │   ├── shared/     # Shared/reusable components
│   │   └── ui/         # shadcn/ui components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and configurations
│   ├── pages/          # Page components
│   └── types/          # TypeScript type definitions
├── supabase/
│   ├── functions/      # Supabase Edge Functions
│   └── migrations/     # Database migrations
└── public/             # Static assets
```

## Features

- **Estimates & Orders**: Full workflow from estimate creation to order fulfillment
- **Digital Signatures**: Canvas-based electronic signature capture
- **Shipping Management**: Track shipments with sender/receiver details
- **Invoice & Receipt Uploads**: Drag-drop file upload for documentation
- **Email Notifications**: Automated notifications via Supabase Edge Functions
- **Role-based Access**: Admin, Supplier, Real Estate, and EU user types

## Deployment

### Supabase Setup

```sh
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push database migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy send-notification-email

# Set secrets
supabase secrets set RESEND_API_KEY=your-resend-api-key
```

### Frontend Deployment

Build the production bundle:

```sh
npm run build
```

Deploy the `dist/` folder to your hosting provider (Vercel, Netlify, etc.).

### Cloudflare Workers

The frontend uses Workers Static Assets. `wrangler.jsonc` serves the Vite output in `dist/` and falls back to `index.html` for SPA navigation, including catalogue and authentication routes. This explicit configuration avoids Wrangler's automatic Vite-adapter setup, which rejects this project's Vite 5 version. Vite 5.4.19 remains the frontend build tool; no Cloudflare Vite plugin or server Worker is needed for this Supabase-backed SPA. See [Cloudflare SPA configuration](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/).

In **Workers & Pages → your Worker → Settings → Builds**, configure:

| Setting | Value |
| --- | --- |
| Repository branch | `main` |
| Root directory | Repository root |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Build variable `NODE_VERSION` | `22.23.0` |
| Build variable `VITE_SUPABASE_URL` | Your Supabase project URL |
| Build variable `VITE_SUPABASE_ANON_KEY` | Your Supabase public anon key |

The `name` in `wrangler.jsonc` must match your existing Worker name; it currently defaults to `focusearth`. Frontend variables must be configured for the build, since Vite embeds them into the browser bundle. Runtime-only Worker variables do not update a previously built frontend. Keep Dropbox and Supabase service-role credentials in the Supabase backend.

Local verification and deployment commands:

```sh
npm ci
npm run deploy:cloudflare:check
npm run preview:cloudflare
# Publish only when ready:
npm run deploy:cloudflare
```

The check command builds and validates the deployment with `wrangler deploy --dry-run` without publishing. The preview command serves the built files through the local Cloudflare emulator. Production deployment requires Cloudflare authentication. These frontend deployment commands do not apply Supabase migrations or deploy its Edge Functions.

Verified on 2026-11-12 with Node 22.23.0, Vite 5.4.19, and Wrangler 4.161.0: production build, Wrangler deployment dry run, lockfile validation, and local static asset serving passed. Local navigation to `/catalogues/import`, `/catalogues/import/products`, and `/projects/123` returned the SPA entry point. No Cloudflare deployment was performed during verification.

## Supplier Catalogue Imports

Super admins can import supplier CSV catalogues, review duplicates, choose files from Dropbox collections, and upload a required product image manually when necessary. See [catalogue import setup and verification](docs/catalogue-import.md) for deployment, credentials, supported formats, and limits.

## License

Proprietary - All rights reserved.

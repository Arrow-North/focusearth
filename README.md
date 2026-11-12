# Focus Earth Energy Portal

A comprehensive LED lighting solutions and energy management platform.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **State Management**: TanStack Query (React Query)

## Getting Started

### Prerequisites

- Node.js 18+ (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
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

## Supplier Catalogue Imports

Super admins can import supplier CSV catalogues, review duplicates, choose files from Dropbox collections, and upload a required product image manually when necessary. See [catalogue import setup and verification](docs/catalogue-import.md) for deployment, credentials, supported formats, and limits.

## License

Proprietary - All rights reserved.

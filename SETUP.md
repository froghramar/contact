# Setup Instructions

## Initial Setup

1. **Create a Supabase project**
   - Go to https://supabase.com and create a new project
   - Wait for the project to be fully provisioned

2. **Get your Supabase credentials**
   - Go to Project Settings > API
   - Copy the Project URL and anon/public key

3. **Run database migrations**
   - Go to SQL Editor in Supabase dashboard
   - Copy the contents of `supabase/migrations/001_initial_schema.sql`
   - Paste and run it in the SQL Editor
   - This will create all necessary tables, policies, and functions

4. **Configure environment variables**
   - Create a `.env` file in the project root:
     ```env
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

5. **Install dependencies and run**
   ```bash
   npm install
   npm run dev
   ```

## GitHub Actions Setup

To enable automatic deployment:

1. **Add GitHub Secrets** (Settings > Secrets and variables > Actions):
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_ACCESS_TOKEN`: Your Supabase access token (get from Account Settings > Access Tokens)
   - `SUPABASE_PROJECT_ID`: Your Supabase project ID (from project settings URL)

2. **Enable GitHub Pages**
   - Go to repository Settings > Pages
   - Source: GitHub Actions

3. **Push to main branch**
   - The workflow will automatically deploy the UI to GitHub Pages
   - Database migrations will run automatically

## Admin Access

The admin email is hardcoded as `froghramar@gmail.com`. To change it:
1. Update `ADMIN_EMAIL` in `src/lib/supabase.ts`
2. Update all RLS policies in the migration SQL file that check for the admin email

## Creating Announcement Threads

Announcement threads need to be created manually in the database (no UI provided):
- Go to Supabase SQL Editor
- Run: `INSERT INTO announcement_threads (title) VALUES ('Your Thread Title');`


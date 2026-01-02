# Contact Chat App

A fully functional chat application built with React, TypeScript, and Supabase. Users can sign up/login and start chatting with the admin. The admin can view all chat threads, respond to messages, and post announcements with Markdown support.

## Features

- **User Authentication**: Email-based authentication via Supabase Auth
- **Real-time Chat**: Users can chat with the admin in real-time
- **Admin Dashboard**: Admin can view all chat threads and interact with users
- **Message Features**:
  - Emoji support
  - Message reactions
  - Seen tracking
  - Real-time updates
- **Announcements**: Public announcement system with Markdown support (admin can post)
- **Responsive Design**: Modern, mobile-friendly UI

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Real-time + Auth)
- **Deployment**: GitHub Pages (UI) + Supabase Cloud (Backend)

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- GitHub account

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd contact
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project at https://supabase.com
   - Go to Project Settings > API to get your URL and anon key
   - Create a `.env` file in the root directory:
     ```env
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Run database migrations**
   ```bash
   # Install Supabase CLI
   npx supabase --help

   # Login to Supabase CLI
   npx supabase login
   
   # Link to your project
   supabase link --project-ref your-project-ref
   
   # Run migrations
   supabase db push
   ```
   
   Or manually run the SQL in `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor.

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## Deployment

### GitHub Pages

The app automatically deploys to GitHub Pages when you push to the `main` branch via GitHub Actions.

**Required GitHub Secrets:**
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_ACCESS_TOKEN`: Your Supabase access token (for migrations)
- `SUPABASE_PROJECT_ID`: Your Supabase project ID

To set up secrets:
1. Go to your repository Settings > Secrets and variables > Actions
2. Add the required secrets

**Enable GitHub Pages:**
1. Go to repository Settings > Pages
2. Source: GitHub Actions

### Supabase

Database migrations are automatically run via GitHub Actions when you push to `main`.

## Admin Access

The admin email is hardcoded as `froghramar@gmail.com`. Only this email can:
- View all chat threads
- Post announcements
- See the admin dashboard

## Project Structure

```
contact/
├── src/
│   ├── components/          # React components
│   │   ├── Login.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminChatInterface.tsx
│   │   ├── Announcements.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageItem.tsx
│   │   └── MessageInput.tsx
│   ├── lib/
│   │   └── supabase.ts      # Supabase client configuration
│   ├── types/
│   │   └── database.ts      # TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   └── migrations/          # Database migrations
├── .github/
│   └── workflows/           # GitHub Actions
│       └── deploy.yml
└── package.json
```

## Database Schema

- **threads**: Chat threads (one per user)
- **messages**: Messages in threads
- **reactions**: Message reactions (emoji)
- **announcement_threads**: Announcement categories
- **announcements**: Announcement posts (Markdown)

## License

MIT


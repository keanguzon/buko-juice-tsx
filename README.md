# 🥥 Buko Juice - Money Tracker

A modern personal finance tracking application built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

## ✨ Features

- 🔐 **Authentication** - Email/password + OAuth (Google, GitHub)
- 💰 **Multiple Accounts** - Track cash, bank, credit cards, e-wallets
- 📊 **Transactions** - Income, expenses, and transfers
- 📈 **Budgets** - Set spending limits by category
- 🎯 **Savings Goals** - Track progress toward financial goals
- 🏷️ **Categories** - Organize with default + custom categories
- 📱 **Responsive** - Works on desktop and mobile
- 🌙 **Dark Mode** - Light/dark theme support

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI + shadcn/ui patterns
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Deployment:** Vercel-ready

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn or pnpm
- Supabase account (free tier works)

### 1. Install Dependencies

```bash
cd buko-juice-tsx
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema from `supabase/schema.sql`
3. Go to **Settings > API** and copy your:
   - Project URL
   - Anon/public key
   - Service role key (for server-side operations)

### 3. Configure Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Configure OAuth (Optional)

To enable Google/GitHub login:

1. In Supabase Dashboard → **Authentication** → **Providers**
2. Enable Google and/or GitHub
3. Add your OAuth credentials (from Google Cloud Console / GitHub Developer Settings)
4. Set redirect URL to: `https://your-project.supabase.co/auth/v1/callback`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
buko-juice-tsx/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   │   ├── accounts/
│   │   │   ├── budgets/
│   │   │   ├── categories/
│   │   │   ├── dashboard/
│   │   │   ├── goals/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   ├── transactions/
│   │   │   └── layout.tsx
│   │   ├── auth/callback/      # OAuth callback handler
│   │   ├── forgot-password/
│   │   ├── login/
│   │   ├── register/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── layout/             # Sidebar, Header
│   │   ├── providers/          # Theme provider
│   │   └── ui/                 # Reusable UI components
│   ├── lib/
│   │   ├── supabase/           # Supabase clients
│   │   └── utils.ts            # Utility functions
│   ├── types/
│   │   └── database.ts         # TypeScript types for Supabase
│   └── middleware.ts           # Auth middleware
├── supabase/
│   └── schema.sql              # Database schema
├── .env.local.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 🌐 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set these in your Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (your Vercel domain)

## 🗄️ Database

### Using Supabase (Recommended)

Supabase provides:
- ✅ Free tier with 500MB database
- ✅ Built-in authentication
- ✅ Real-time subscriptions
- ✅ Row-level security
- ✅ Auto-generated APIs

### Alternative Databases

If you want to use a different database:

1. **PlanetScale** - MySQL-compatible, serverless
2. **Neon** - Serverless PostgreSQL
3. **Railway** - PostgreSQL with easy deployment
4. **Supabase alternatives** - Firebase, Appwrite

## 🚀 Hosting Options

| Platform | Pros | Cons | Cost |
|----------|------|------|------|
| **Vercel** | Best Next.js support, easy deployment, great DX | Limited free tier bandwidth | Free → $20/mo |
| **Netlify** | Good free tier, easy setup | Slightly slower cold starts | Free → $19/mo |
| **Railway** | Full-stack hosting, database included | Smaller community | Free → $5/mo |
| **Render** | Good free tier, supports Docker | Cold starts on free tier | Free → $7/mo |
| **Cloudflare Pages** | Fast CDN, generous free tier | Limited server-side features | Free → $20/mo |

### Recommended Setup

**For Production:**
- **Frontend:** Vercel (optimized for Next.js)
- **Database:** Supabase (generous free tier, great auth)
- **Total Cost:** $0/month for small projects

## 📝 Next Steps

### Immediate (To Get Running)
1. [ ] Run `npm install`
2. [ ] Set up Supabase project
3. [ ] Configure `.env.local`
4. [ ] Run `npm run dev`

### Phase 2 (Core Features)
- [ ] Add transaction creation forms
- [ ] Add account management forms
- [ ] Implement budget tracking calculations
- [ ] Add goal contribution functionality
- [ ] Create interactive charts (Chart.js)

### Phase 3 (Polish)
- [ ] Add data export (CSV/PDF)
- [ ] Implement recurring transactions
- [ ] Add multi-currency support
- [ ] Mobile PWA features
- [ ] Email notifications

### Phase 4 (Advanced)
- [ ] React Native mobile app (shared types)
- [ ] Bank account integration (Plaid)
- [ ] AI-powered insights
- [ ] Collaborative features (shared budgets)

## 🤝 Contributing

Feel free to open issues and pull requests!

## 📄 License

MIT License - feel free to use this for your own projects!

---

Built with 💚 by Buko Juice Team

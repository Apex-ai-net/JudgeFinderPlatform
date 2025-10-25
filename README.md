# JudgeFinder Platform

AI-powered judicial transparency platform delivering real-time analytics and bias detection across California's courts.

🚀 **Live**: [judgefinder.io](https://judgefinder.io)

## Overview

JudgeFinder provides data-driven insights into judicial patterns using AI analysis and automated data ingestion from official court sources.

### Key Features

- 🤖 **AI Analytics**: Gemini 1.5 Flash (primary), GPT-4o-mini (fallback)
- 📊 **Bias Detection**: Statistical analysis of judicial decision patterns
- 🔄 **Real-time Sync**: Automated daily/weekly data updates with retry logic
- 🎯 **Legal Search**: AI-powered query classification and judge matching
- 🔐 **Enterprise Auth**: Clerk authentication with bot protection

### Tech Stack

- **Framework**: Next.js 15 + TypeScript
- **Database**: Supabase PostgreSQL
- **Auth**: Clerk (fail-fast security model)
- **AI**: Google Gemini + OpenAI
- **Cache**: Upstash Redis
- **Hosting**: Netlify

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (see .env.example)
cp .env.example .env.local

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

> **Note**: Production deployment requires Clerk authentication keys. Development mode allows running without keys (with warnings).

### 🔥 Data Sync Quick Actions

Current judge data completeness:
- ⚠️ **Education**: 13.3% (254/1,903) - Sync ready to run
- 🔴 **Political Affiliation**: 0% - Sync ready to run (migration required first)
- 🔴 **Position History**: 0% - Sync ready to run

**To sync all judge data:**

```bash
# 1. Add political_affiliation column (run SQL in Supabase dashboard)
# See: docs/JUDGE_DATA_SYNC_GUIDE.md

# 2. Test sync with 10 judges (~20 mins)
npm run sync:all -- --limit=10

# 3. Full sync (~12 hours, runs in background)
npm run sync:all
```

**Individual syncs:**
```bash
npm run sync:education   # Education data only
npm run sync:political   # Political affiliation only
npm run sync:positions   # Position history only
```

📚 **Complete guide**: [docs/JUDGE_DATA_SYNC_GUIDE.md](docs/JUDGE_DATA_SYNC_GUIDE.md)

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run dev:turbo        # Start with Turbo mode (faster HMR)
npm run build            # Production build

# Testing
npm test                 # Run all tests
npm run test:unit        # Unit tests only
npm run test:e2e         # E2E tests with Playwright
npm run test:a11y        # Accessibility tests

# Code Quality
npm run lint             # ESLint check
npm run type-check       # TypeScript validation
npm run format           # Format with Prettier

# Data Operations
npm run sync:judges      # Sync judge data
npm run sync:courts      # Sync court data
npm run analytics:generate # Generate AI analytics
npm run data:status      # Check data freshness
```

## Key Documentation

| Topic                 | Location                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| **For AI Assistants** | [docs/ai/CLAUDE_CODE_GUIDE.md](./docs/ai/CLAUDE_CODE_GUIDE.md) - Comprehensive guide for Claude Code |
| **Architecture**      | [docs/architecture/ARCHITECTURE.md](./docs/architecture/ARCHITECTURE.md)                             |
| **API Reference**     | [docs/api/API_REFERENCE.md](./docs/api/API_REFERENCE.md)                                             |
| **Deployment**        | [docs/deployment/netlify/NETLIFY_QUICK_START.md](./docs/deployment/netlify/NETLIFY_QUICK_START.md)   |
| **Security**          | [docs/security/SECURITY.md](./docs/security/SECURITY.md)                                             |
| **Accessibility**     | [docs/accessibility/CHAT_A11Y.md](./docs/accessibility/CHAT_A11Y.md)                                 |
| **Data Sync**         | [docs/operations/SYNC_AND_CRON.md](./docs/operations/SYNC_AND_CRON.md)                               |
| **Dashboard Updates** | [docs/dashboard/DASHBOARD_TRANSFORMATION_SUMMARY.md](./docs/dashboard/DASHBOARD_TRANSFORMATION_SUMMARY.md) |
| **Data Quality**      | [docs/data-quality/JUDGE_DATA_ANALYSIS_SUMMARY.md](./docs/data-quality/JUDGE_DATA_ANALYSIS_SUMMARY.md) |
| **Migrations**        | [docs/migrations/MIGRATION_DEPLOYMENT_GUIDE.md](./docs/migrations/MIGRATION_DEPLOYMENT_GUIDE.md)     |
| **Netlify Fixes**     | [docs/deployment/netlify/NETLIFY_BUILD_FIX_SUMMARY.md](./docs/deployment/netlify/NETLIFY_BUILD_FIX_SUMMARY.md) |
| **SendGrid Config**   | [docs/deployment/SENDGRID_ENVIRONMENT_CONFIGURATION.md](./docs/deployment/SENDGRID_ENVIRONMENT_CONFIGURATION.md) |
| **Project Status**    | [docs/project-status/ULTRATHINK_SUCCESS_SUMMARY.md](./docs/project-status/ULTRATHINK_SUCCESS_SUMMARY.md) |

## Environment Setup

See [.env.example](./.env.example) for all required environment variables.

**Critical for Production:**

- `CLERK_SECRET_KEY` - Authentication (REQUIRED)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Auth frontend (REQUIRED)
- `OPENAI_API_KEY` - AI chat functionality
- `SUPABASE_SERVICE_ROLE_KEY` - Database access
- `UPSTASH_REDIS_REST_URL` - Rate limiting

**Tip**: Sync Netlify env to local:

```bash
netlify link
netlify env:pull --json > .env.local
```

## Project Structure

```
app/                    # Next.js App Router
  api/                  # Serverless API routes
    chat/               # AI assistant endpoint
    admin/              # Admin APIs (sync, stats)
    cron/               # Scheduled jobs
  judges/[slug]/        # Dynamic judge pages
  courts/[slug]/        # Dynamic court pages

components/             # React components
  judges/               # Judge-specific UI
  chat/                 # AI chatbot
  ads/                  # Advertising

lib/                    # Business logic
  analytics/            # Bias calculations
  ai/                   # Legal search AI
  sync/                 # Data sync
  domain/               # DDD patterns
  auth/                 # Clerk utilities

scripts/                # Automation
supabase/migrations/    # Database migrations
docs/                   # Documentation
```

## Deployment

### Netlify (Recommended)

1. **Configure Clerk** ([clerk.com](https://clerk.com))
   - Create production application
   - Copy `pk_live_xxx` and `sk_live_xxx` keys

2. **Connect to Netlify**
   - Link GitHub repository
   - Set environment variables in Site Settings
   - Build deploys automatically on push to `main`

3. **Verify Deployment**
   ```bash
   curl https://your-site.netlify.app/api/health
   ```

> **⚠️ Security**: Production will FAIL without valid Clerk keys

### Scheduled Jobs

- **Daily**: `/api/cron/daily-sync` - Judge/decision updates
- **Weekly**: `/api/cron/weekly-sync` - Full court sync

Configure in Netlify dashboard with `CRON_SECRET` header.

## Contributing

See [docs/ai/CLAUDE_CODE_GUIDE.md](./docs/ai/CLAUDE_CODE_GUIDE.md) for development guidelines and architecture overview.

### Key Principles

- **Complete code only** - No placeholders or `...` comments
- **Detailed logging** - Include context in all error messages
- **Test coverage** - Write tests before implementing features
- **Accessibility first** - WCAG 2.2 Level AA compliance required

## License

MIT - See [LICENSE](./LICENSE) for details.

---

**Built for judicial transparency** 🏛️

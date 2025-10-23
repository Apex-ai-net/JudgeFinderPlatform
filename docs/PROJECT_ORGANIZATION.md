# Project Organization Guide

This document outlines the organizational structure of the JudgeFinder Platform codebase.

## 📁 Directory Structure

### Root Level
The root directory contains only essential configuration files and core application code:
- `package.json` - Dependencies and scripts
- `next.config.js` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `middleware.ts` - Next.js middleware
- `instrumentation.ts` - OpenTelemetry instrumentation
- Configuration files for tooling (ESLint, Playwright, Vitest, PostCSS, etc.)

### `/app`
Next.js 13+ App Router pages and API routes:
- **Pages**: Organized by route (judges, courts, dashboard, etc.)
- **API Routes**: `/app/api/*` - All backend endpoints
- **Layout Files**: Root and nested layouts for consistent UI
- **Metadata**: SEO and OpenGraph image generation

### `/components`
Reusable React components organized by domain:
- `/about` - About page components
- `/ads` - Advertisement display components
- `/ai` - AI-powered features (search, chat)
- `/analytics` - Analytics visualizations
- `/auth` - Authentication UI
- `/billing` - Stripe billing components
- `/charts` - Data visualization charts
- `/compare` - Judge comparison tools
- `/courts` - Court-related UI
- `/dashboard` - User dashboard components
- `/judges` - Judge profile and listing components
- `/seo` - SEO optimization components
- `/ui` - Base UI components (buttons, cards, modals, etc.)

### `/lib`
Business logic and service layer organized by domain:
- `/admin` - Admin panel logic
- `/ads` - Ad serving and pricing
- `/ai` - AI integration (OpenAI, Gemini)
- `/analytics` - Bias calculations and metrics
- `/auth` - Authentication logic
- `/billing` - Stripe integration
- `/cache` - Redis caching
- `/courtlistener` - Court Listener API integration
- `/domain` - Domain models and services
- `/security` - Security utilities
- `/stripe` - Stripe SDK wrapper
- `/supabase` - Database client
- `/sync` - Data synchronization logic
- `/utils` - Shared utilities

### `/scripts`
Automation and maintenance scripts:
- Data import scripts (courts, judges, cases)
- Database migration runners
- Analytics generation
- Deployment utilities
- Validation and testing scripts
- **Note**: All scripts have been consolidated here (no subfolders)

### `/docs`
Project documentation:
- `/archive` - Completed milestone documentation and historical records
- `/api` - API documentation
- `/architecture` - System design docs
- `/data` - LA County market intelligence data
- Technical specifications
- Development guides

### `/tests`
Test suites organized by type:
- `/e2e` - End-to-end tests (Playwright)
- `/integration` - Integration tests
- `/unit` - Unit tests (Vitest)
- `/api` - API endpoint tests
- `/a11y` - Accessibility tests
- `/performance` - Performance benchmarks

### `/types`
TypeScript type definitions:
- `advertising.ts` - Ad types
- `global.d.ts` - Global type augmentations
- `search.ts` - Search-related types
- `organizations.ts` - Organization types

### `/hooks`
React custom hooks:
- `useAISearch` - AI-powered search
- `useDebounce` - Debounced values
- `useFocusTrap` - Accessibility focus management
- `useJudgeFilters` - Judge filtering logic

### `/config`
Application configuration:
- `sentry-alerts.json` - Error monitoring alerts
- `uptime-monitors.json` - Uptime monitoring config

### `/public`
Static assets served directly:
- Logo files (SVG, PNG)
- Favicon and app icons
- `ads.txt` - Ad network verification
- `manifest.json` - PWA manifest
- `llms.txt` - LLM-specific documentation
- Service worker (`sw.js`)

### `/assets`
Project assets not served directly:
- `/branding` - Logo source files and brand assets

### `/supabase`
Database management:
- `/migrations` - Database migration files
- SQL utilities and fixes
- `config.toml` - Supabase configuration

### `/netlify`
Netlify deployment configuration:
- `/functions` - Serverless functions
- `netlify.toml` (in root) - Build and deploy config

### `/artifacts`
Development artifacts (gitignored in production):
- Pagination inspection reports
- Auth/billing implementation artifacts

### `/test-results`
Test output and reports (gitignored):
- Design system test reports
- Test result JSON files
- Screenshots

## 🗂️ File Organization Principles

1. **Single Responsibility**: Each file/folder serves one clear purpose
2. **Domain-Driven**: Code organized by business domain (judges, courts, ads, etc.)
3. **Separation of Concerns**: UI (components), logic (lib), routes (app), tests (tests)
4. **Colocation**: Related files grouped together (components with their types)
5. **Flat When Possible**: Avoid deep nesting unless necessary for clarity

## 📝 Naming Conventions

- **Files**: kebab-case for routes, PascalCase for components
- **Components**: PascalCase (e.g., `JudgeCard.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Types**: PascalCase for interfaces/types (e.g., `JudgeProfile`)
- **Constants**: SCREAMING_SNAKE_CASE
- **Hooks**: camelCase starting with `use` (e.g., `useJudgeFilters`)

## 🔍 Finding Code

### By Feature
- **Judge Profiles**: `/app/judges`, `/components/judges`, `/lib/judges`
- **Court Data**: `/app/courts`, `/components/courts`, `/lib/courts`
- **Analytics**: `/app/analytics`, `/components/analytics`, `/lib/analytics`
- **Advertising**: `/app/ads`, `/components/ads`, `/lib/ads`
- **AI Features**: `/components/ai`, `/lib/ai`

### By Type
- **API Endpoints**: `/app/api/**/*.ts`
- **Database Logic**: `/lib/supabase`, `/lib/database`
- **UI Components**: `/components/**/*.tsx`
- **Business Logic**: `/lib/**/*.ts`
- **Tests**: `/tests/**/*.ts`

## 🚮 Cleanup History

Recent organizational improvements (October 2025):
- ✅ Moved all PHASE_*.md and SESSION_COMPLETE*.md to `/docs/archive`
- ✅ Consolidated loose scripts to `/scripts` directory
- ✅ Moved New Logo assets to `/assets/branding`
- ✅ Added LA County data to `/docs/data`
- ✅ Updated `.gitignore` for test artifacts
- ✅ Removed duplicate script folders (utilities, shell)
- ✅ Moved CLAUDE.md and BUSINESS_MODEL.md to `/docs`

## 📚 Documentation Index

Key documentation files:
- `README.md` - Project overview and getting started
- `/docs/BUSINESS_MODEL.md` - Business model and monetization
- `/docs/CLAUDE.md` - AI assistant interaction guide
- `/docs/PROJECT_ORGANIZATION.md` - This file
- `/docs/archive/START-HERE.md` - Historical project start guide
- `/tests/README.md` - Testing guide

## 🎯 Best Practices

1. **Keep Root Clean**: Only essential config files in root
2. **Archive Completed Work**: Move milestone docs to `/docs/archive`
3. **Test Everything**: Add tests alongside new features
4. **Document Changes**: Update this file when reorganizing
5. **Use Existing Patterns**: Follow established folder structure
6. **Clean Up Regularly**: Remove obsolete code and docs

---

*Last Updated: October 22, 2025*


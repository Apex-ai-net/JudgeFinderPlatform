# Agent Context Overview

## Mission Snapshot

- Deliver AI-powered judicial transparency for California courts while preparing for multi-state expansion.
- Maintain high data quality (≥500 cases per judge) and enforce strict court assignment validation.
- Provide trustworthy bias analytics, search intelligence, and professional integrations.

## Core System Pillars

### Judicial Data Processing

- Multi-stage judge-case matching with jurisdiction awareness.
- Position history tracking with retirement detection.
- Bias pattern analysis via `lib/analytics/bias-calculations.ts`.
- Court assignment validation with conflict prevention.

### Legal Search & Discovery

- AI-assisted search intent detection using `lib/ai/search-intelligence.ts`.
- Domain-aware ranking with case volume and experience factors.
- Court hierarchy filters and answer engine optimizations.

### Professional Integration

- Tiered ad pricing with jurisdiction controls (`lib/ads/service.ts`).
- Bar number verification workflows.
- Court-specific ad placement compliance.
- Notifications and iOS widget integrations for case tracking.

## Agent Operating Guidelines

- Touch only code relevant to the request; keep functionality intact elsewhere.
- Provide full implementations (no placeholders) with OOP-oriented structure.
- Break work into reasoned steps and document observations before conclusions.
- Add logging when diagnosing issues; remove or gate noisy logs afterwards.
- Respect file size rules (≤500 lines); split modules before they grow large.
- Organize logic using ViewModels/Managers/Coordinators when applicable.
- Keep functions ≤40 lines and classes focused on single responsibilities.
- Use descriptive naming; avoid vague terms like `data` or `helper`.

## Domain Models

- **Judge Profile Management:** Positions, case assignments, bias indicators, background verification.
- **Court Organization:** Hierarchies, type classifications, assignment conflict resolution, geography mapping.
- **Case Analytics:** Outcome detection, settlement analysis, timeline metrics, practice area clustering.

## Foundational Business Rules

1. **Judge Data Validation:** ≥500 cases, active positions only, no multi-jurisdiction conflicts, preserve history.
2. **Court Assignment Logic:** One active position per court, enforce jurisdiction bounds, prevent temporal overlap, validate transitions.
3. **Analytics Generation:** Require sufficient sample sizes, confidence intervals, bias significance checks, timeline normalization.

## Key References

- Recovery & operations: `AGENT_SWARM_SUMMARY.md`, `START_HERE.md`.
- Extended roadmap: `docs/launch/EXTENDED_ROADMAP.md`.
- AI agents & automation: `docs/ai/AI_AGENTS.md`, `docs/ai/agents.md`.
- Documentation index: `docs/README.md`.
- Architecture overview: `docs/architecture/ARCHITECTURE.md`.

## Current Focus Areas

- Execute recovery plan steps and establish monitoring.
- Implement search roadmap phases leading to Elasticsearch.
- Enrich analytics for bias alerts and professional insights.
- Prepare for multi-state data ingestion and compliance-ready ad products.

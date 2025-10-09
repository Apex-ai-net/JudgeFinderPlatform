## Finishing Pass

Date: 2025-10-09

- feat(db): add subscriptions and usage_quota tables with RLS
- feat(api): scaffold Stripe webhook and billing endpoints (checkout, portal)
- chore(env): document Stripe price IDs and webhook secret in .env.example
- docs: add Finishing Pass notes and production prerequisites

Notes:

- All new tables enforce RLS by default. Service-role has full access; users can only read their own records.
- Stripe endpoints return 503 until environment variables are configured.
- Follow-up tasks include connecting advertiser/subscription linkage and ad booking checkout.

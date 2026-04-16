# Nexo BTC DCA App Implementation Plan

Goal: build a Docker Compose app with a minimal UI for configuring a BTC DCA schedule (for example $6.90 every 4h), Telegram notifications, low-USDC alerts, and scheduled BTC buys through Nexo.

Planned stack:
- Backend: FastAPI + APScheduler + SQLModel/SQLite
- Frontend: React + Vite + Tailwind + shadcn-style components
- Deployment: docker compose
- Config: .env for API keys/secrets and runtime defaults

Core features:
1. Configurable DCA schedule
   - amount in quote currency (for example 6.9)
   - interval (4h, daily, weekly, cron-like presets if needed)
   - pair/symbol default BTC/USDC if Nexo supports it
2. Telegram notifications
   - on every buy
   - daily summary
   - low-balance alert threshold such as “notify if projected USDC cover < 24h”
3. Minimal UI
   - overview
   - strategy/schedule settings
   - notification settings
   - recent runs / orders / alerts
4. Exchange adapter
   - Nexo adapter behind a clean interface so the rest of the app is testable without live credentials
   - dry-run mode for verification before live execution
5. Compose and .env
   - docker compose service(s)
   - env template with Telegram and Nexo secrets

Current blocker:
- Exact Nexo Pro/private trading API details are not verified from available public information in this environment.
- We need official docs or a verified client example for:
  - base URL
  - auth/signature method
  - balance endpoint
  - order placement endpoint
  - market order payload format

Immediate next step once API details are available:
- scaffold the app and implement the adapter with strict tests first.

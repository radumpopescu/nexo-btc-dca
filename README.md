# Nexo BTC DCA

Minimal mock-first BTC DCA app for Nexo Pro.

What works now
- SQLite-backed app state under `./data/nexo-dca.sqlite3`
- Persisted DCA settings in the UI instead of env-based pair/amount/cadence
- Mock run history with exact scheduled/executed times stored in SQLite
- Mock backend API showing when the app says "Should buy now"
- Telegram/low-balance notification settings represented in UI
- Single-port Docker Compose setup on `4613`
- Frontend UI served by the backend container

What is mocked
- Actual Nexo buy execution
- Actual Telegram sends

Why mocked
- The private Nexo Pro API contract still needs exact verified auth/order details from the logged-in docs.

Persistence
- Runtime data lives in `./data` next to `compose.yml`
- Current DB path: `./data/nexo-dca.sqlite3`
- Secrets stay in `.env`
- Trading settings live in SQLite and can be edited from the page

Run locally
- cp .env.example .env
- docker compose -f compose.yml up --build

Port
- app: http://localhost:4613
- api state: http://localhost:4613/api/state
- save settings: `PUT /api/settings`
- run due mock buy: `POST /api/mock/run`

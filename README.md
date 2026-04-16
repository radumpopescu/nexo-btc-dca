# Nexo BTC DCA

Minimal mock-first BTC DCA app for Nexo Pro.

What works now
- Configurable DCA schedule model (for example $6.90 every 4h)
- Mock backend API showing when the app says "Should buy now"
- Telegram/low-balance notification settings represented in UI
- Docker Compose setup
- .env.example for secrets and runtime config
- Frontend UI for overview/settings/recent mock orders

What is mocked
- Actual Nexo buy execution
- Actual Telegram sends

Why mocked
- The private Nexo Pro API contract still needs exact verified auth/order details from the logged-in docs.

Run locally
- cp .env.example .env
- docker compose -f compose.yml up --build

Ports
- frontend: http://localhost:4173
- backend: http://localhost:8000/api/state

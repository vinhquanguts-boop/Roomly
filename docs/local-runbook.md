# Roomly Local Runbook

Roomly Phase 8 runs entirely on the local machine. Ollama is the only AI provider, rendering stays in `plan-only` mode, and no paid or hosted service is required.

## Prerequisites

- Node.js 20 or later
- Docker Desktop
- Ollama with the configured local models pulled
- PostgreSQL and Redis provided by the repository Docker Compose file

Copy `.env.example` to `.env.local` if it is not already present. Keep these values in the local profile:

```text
AI_MODE=local
RENDER_MODE=plan-only
ROOMLY_LOCAL_ONLY=true
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://roomly:roomly@localhost:5434/roomly
```

Leave the PostHog, Sentry, Upstash, Stripe, Replicate, DeepSeek, and Fireworks variables empty. Never commit `.env.local`.

## Start The Stack

From the repository root, start PostgreSQL and Redis:

```powershell
docker compose up -d
docker compose ps
```

Confirm Ollama is available and pull the configured models when needed:

```powershell
ollama list
ollama pull qwen2.5:7b
ollama pull qwen2.5vl:7b
```

Apply the schema and verify PostgreSQL:

```powershell
cd server
npm run db:migrate
npm run db:health
```

Use two terminals to start the API and frontend:

```powershell
cd E:\Roomly\server
npm run dev
```

```powershell
cd E:\Roomly
npm run dev
```

Local addresses:

- Frontend: `http://localhost:5173`
- API: `http://localhost:8787`
- PostgreSQL: `localhost:5434`
- Redis: `localhost:6379`
- Ollama: `http://localhost:11434`

## Verify The Local Profile

```powershell
cd E:\Roomly
npm run lint
npm run build
npm run analyze

cd E:\Roomly\server
npm run build
npm run db:generate
npm run db:migrate
npm run db:health
npm run ai:test
```

The API writes structured local logs with request IDs, rate-limit events, and Ollama operation timings. Prompts, uploaded room images, passwords, API keys, and raw chat messages are intentionally excluded from those logs. AI usage rows record a zero estimated cost because local Ollama does not have a per-request monetary charge.

## Troubleshooting

- **Ollama unavailable:** start the Ollama app or service, then use `ollama list`. Room analysis and chat will return a clear local-AI error until it is reachable.
- **Redis unavailable:** the API logs a Redis fallback warning and uses the in-memory limiter for the current process. Restart Redis with `docker compose up -d redis` to restore durable limits.
- **PostgreSQL unavailable:** check `docker compose ps`, then rerun `npm run db:health` from `server`.
- **Local-only configuration error:** set `AI_MODE=local` and `RENDER_MODE=plan-only` in `.env.local`. The guard rejects cloud or hybrid operation when `ROOMLY_LOCAL_ONLY=true`.
- **Invalid image or rate limit:** use a single JPG, PNG, or WebP under 10 MB, then wait for the retry interval shown by the API before retrying.

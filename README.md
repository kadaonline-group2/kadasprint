# KadaSprint

This repository contains three independently deployable applications:

| Directory | Application | Vercel root directory |
| --- | --- | --- |
| `web-builder-fe` | React/Vite frontend | `web-builder-fe` |
| `web-builder-be` | Express public API | `web-builder-be` |
| `web-builder-ai` | FastAPI internal AI service | `web-builder-ai` |

Create three Vercel projects from this one Git repository, each with the root
directory shown above. Deploy the AI service and API before configuring the
frontend for real API mode.

Configure environment variables in Vercel rather than committing `.env` files:

- AI service: `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL_NAME`,
  `INTERNAL_SERVICE_TOKEN`.
- Public API: `AI_SERVICE_BASE_URL`, `AI_SERVICE_TOKEN`,
  `AI_SERVICE_TIMEOUT_MS`, `FRONTEND_ORIGIN`.
- Frontend: `VITE_API_MODE=real` and `VITE_API_BASE_URL` pointing to the public
  API URL with `/api/v1` suffix. Never place a secret in a `VITE_` variable.

Before publishing publicly, verify that generated site previews and ZIP exports
match, and protect the public AI endpoints against excessive usage.

The original three repositories are separate working copies outside this
directory. This repository is a snapshot with a new Git history; changes made
to the originals after the snapshot are not synchronized automatically.

# KadaSprint

Ramu Studio is an AI-assisted website builder for Indonesian small business
owners who need a simple landing page but do not have coding or web design
experience. Users describe their business in natural language, receive a
generated website draft, refine it through AI-assisted revision or a manual
editor, preview it in desktop and mobile layouts, and export the result as a
standalone HTML/ZIP website.

Live demo: [ramustudio-ai.vercel.app](https://ramustudio-ai.vercel.app)

## How it works

1. The user submits a business description from the React/Vite frontend.
2. The Express public API validates the request and forwards it to the internal
   FastAPI AI service.
3. The AI service requests structured JSON from an OpenAI-compatible LLM API
   and validates the result as a `WebsiteState`.
4. The frontend renders the validated state using one of three responsive
   templates inside an iframe preview.
5. The user can revise supported content through chat, edit key fields manually
   without calling the LLM, and optionally apply a hero image.
6. The final state can be copied as HTML or downloaded as a standalone ZIP.

The structured `WebsiteState` contract is the source of truth for generation,
revision, preview, and export. Controlled partial mutations preserve sections
that the user did not ask to change, while synchronized renderers keep preview
and exported HTML consistent. WhatsApp links are enabled only when the user
provides a valid number.

## Repository structure

This repository contains three independently deployable applications:

| Directory | Application | Vercel root directory |
| --- | --- | --- |
| `web-builder-fe` | React/Vite frontend | `web-builder-fe` |
| `web-builder-be` | Express public API | `web-builder-be` |
| `web-builder-ai` | FastAPI internal AI service | `web-builder-ai` |

## Team

GitHub organization: [kadaonline-group2](https://github.com/kadaonline-group2)

| Name | GitHub | LinkedIn | Role | Main contributions |
| --- | --- | --- | --- | --- |
| Annisa Qurrota A'yun | [@qannisa](https://github.com/qannisa) | [Profile](https://www.linkedin.com/in/annisa-qa) | AI Service Lead | Built the FastAPI LLM integration, generation and revision prompts, JSON response handling, WebsiteState validation, and retry/fallback behavior. |
| Zhafran P. Kuncoro | [@norpajsucces](https://github.com/norpajsucces) | [Profile](https://www.linkedin.com/in/zhafran-kuncoro) | Backend & Integration Lead, Scrum Master | Built the Express public API, AI service orchestration, state and mutation validation, controlled revision merge, error mapping, server-side HTML/ZIP export, and Vercel backend integration. |
| Kyrieleison C. Frans | [@KyrieleisonFrans](https://github.com/KyrieleisonFrans) | [Profile](https://www.linkedin.com/in/kyrieleison-charla-frans) | Frontend Lead | Built the React/Vite workspace, API client, chat interface, iframe preview, three responsive templates, manual editor, optional hero-image flow, and HTML/ZIP download interface. |

## Deployment

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

# AI Website Builder — Internal AI Service

FastAPI service for Dev 2. The frontend must call Dev 2's public API, not this service.

Install `requirements.txt`, configure a local `.env` from `.env.example`, then start
`uvicorn app.main:app --host 127.0.0.1 --port 3001`. Set the Dev 2 backend's
`AI_SERVICE_BASE_URL=http://127.0.0.1:3001`. If `INTERNAL_SERVICE_TOKEN` is set,
Dev 2 must use the same value in `AI_SERVICE_TOKEN`.

The service exposes `GET /internal/v1/health`, `POST /internal/v1/generate`, and
`POST /internal/v1/revise` menurut kontrak internal v1.1 dan
[addendum WhatsApp v1.2](WHATSAPP_NULLABLE_CONTRACT_v1.2.md). Generate
memerlukan `{ "businessDescription": "...", "schemaVersion": "1.1" }`. Revise
memerlukan `{ "currentState": WebsiteState, "instruction": "...", "schemaVersion": "1.1" }`.
Responses include `success`, `data` or `error`, and `meta.requestId`. Revise
returns a controlled mutation; Dev 2 applies it to the original state.

Generate retries once when the provider returns malformed JSON or a state that
fails schema validation. An invalid required CTA message is replaced with safe
generic text without inventing a WhatsApp number. If validation still fails or
the provider call fails, the response uses a generic fallback state with
`meta.isFallback: true`; it is not a website generated from the business
description. Server logs record only failure types and schema paths, never
prompts, provider response bodies, or credentials.

Nomor WhatsApp hanya diambil dari input pengguna. Jika tidak tersedia,
`contact.whatsappNumber` bernilai `null`, termasuk pada fallback; service ini
tidak membuat nomor contoh yang tampak nyata.

Install `requirements-dev.txt` and run `pytest tests/test_internal_contract.py`
for isolated contract tests. Some legacy tests call the configured LLM provider;
do not run the full suite unless that external access and cost are intended.

For a real HTTP integration check with Dev 2 and no provider calls, clone both
repositories beside each other and run `npm run test:ai-integration` from Dev 2.
That command starts `tests/integration_server.py` with a deterministic LLM stub.

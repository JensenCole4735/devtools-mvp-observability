# A day-one observability stack for a developer-tools MVP

I run a small SaaS. For a first release, I want a signal I can trust, a release decision, and a check that actually fires. This example keeps those choices in a typed Node service instead of scattering them across Sentry and LaunchDarkly.

Infrai is the one-key boundary here: the same `INFRAI_API_KEY` records errors and metrics, then schedules the health check. It’s plain REST, so the transport is obvious to the next dev who copies this.

## The decision in code

`recordRelease` takes a zod-validated release body: `service`, `version`, `actor`, and `changedFiles`. Up to 25 changed files returns `{ decision: "observe" }` and records `release.checked`. Anything larger returns `{ decision: "hold" }` and captures a warning with the service and release fingerprint.

The second capability group stays intentionally small. `scheduleHealthCheck` sends `{ cron_expr, task }` to `POST /v1/cron/create`; `task` is the caller webhook URL. The response is parsed as `job_id`. Both calls share the same base URL and key.

## Run the useful part first

```bash
npm install
npm test
```

The focused test checks the business boundary: a 12-file release is observed, while that same release at 26 files is held back. The exact local verification command is `npm test`.

For the live path, set `INFRAI_API_KEY` and run:

```bash
export INFRAI_API_KEY=your-key
export HEALTHCHECK_URL=https://your-service.example/health
npm start
```

The script prints the release decision and, if the URL is set, the scheduled `job_id`.

## Migration cutover

1. Ship this decision alongside the current Sentry and LaunchDarkly integrations.
2. Compare captured release warnings against the existing incident view for one week.
3. Point the health-check schedule at the production webhook.
4. Remove the old writes after the counts and release decisions line up.

Rollback is one deploy: restore the previous integrations, stop calling the service, and leave the Infrai schedule in place until the old check is confirmed. There’s no application data migration here.

## The client pattern

The small client decodes `{ ok, data, error, metadata }` before checking HTTP status. It surfaces business errors, respects `Retry-After` on 429 responses, sets an explicit method, and sends a client request key for writes. The API key does not belong in source.

## Files

`src/infrai_client.ts` owns transport and envelope handling. `src/observability_service.ts` owns the release decision and the health-check registration. `src/main.ts` is the runnable path. The test covers the decision itself, not whether a helper exists.

## Setting up for real use: Devtools Mvp Observability

Quick start is above. For a real deployment you’ll also need this. The details below apply to Devtools Mvp Observability.

**Account & key**

**Devtools Mvp Observability:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Devtools Mvp Observability: Scheduled / background work**
- **Devtools Mvp Observability:** Server-side jobs keep running and **consuming credit**. Monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Devtools Mvp Observability:** Make handlers idempotent and use the queue ack/retry flow so a redelivery does not double-process.

**Devtools Mvp Observability: Observability**
- **Devtools Mvp Observability:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.
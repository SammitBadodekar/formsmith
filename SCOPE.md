# Formsmith

Status: Q1–Q23 settled; exact Tally visual design accepted. Implementation authorized; MIT license selected. Cloudflare intake with an R2 journal and replay queue is confirmed; RabbitMQ is deferred. This is the single maintained planning document.

Implementation checkpoint: the custom ProseMirror editing document, respondent field components, TanStack dashboard, optimistic draft saves, publication worker, and reliable intake/commit path are implemented. The workspace builds. Unit tests cover intake failure recovery, editor round-trips/undo and hidden/skipped answers; isolated PostgreSQL tests cover concurrent submissions, outbox rollback, workspace isolation, domain ownership races and job leases. A live local HTTP exercise created/published a form, submitted 15 concurrent identical requests, replayed one response into PostgreSQL and exported CSV; a keyboard-driven browser submission also reached the durable receipt screen and committed. These are local checks, not production-capacity or full-scope completion claims.

Custom-domain management includes DNS instructions, ownership verification, per-workspace defaults, Cloudflare provisioning jobs, monotonic edge registry revisions and revoke-before-release ordering. A three-Worker workerd smoke now verifies real assets, shared R2, service bindings, per-domain form isolation, auth/dashboard isolation, default forms, API forwarding and stale-revision-safe removal. Live custom-domain/TLS verification remains outstanding. The installed Miniflare version shares an asset disk service across configurations; the smoke runs respondent assets in a separate Wrangler process to preserve the actual deployment boundary.

MCP tools, browser consent, scoped machine credentials and dashboard connector controls are implemented. Isolated HTTP tests pass OAuth dynamic registration, PKCE, consent, scoped MCP calls, cross-owner denial, edit conflicts and immediate JWT/machine/refresh revocation. Auth initialization guards the resource-registration race across replicas. Actual Codex/Claude/ChatGPT and Google sign-in/Sheets interoperability remain unverified. Webhooks use encrypted signing secrets and DNS-pinned public-only HTTPS; Sheets uses stable row assignments and RAW values, with live delivery/reconciliation tests still required. The editor now loads separately from the dashboard (current initial dashboard JS ~147 KB gzip across entry/shared chunks; editor chunk ~82 KB gzip; dashboard form-actions chunk ~29 KB gzip; renderer ~103 KB gzip), not a measured mobile latency claim.

Logic authoring now supports nested all/any conditions, show/hide/require actions, forward page jumps, calculations and hidden URL parameters. Browser checks verified rule creation, nested groups and circular-reference feedback. Renderer completion preserves the selected ending; committed attempts clear durable local recovery data, and expired unsubmitted attempts offer a new response. Shared validation rejects invalid calendar dates, fractional ratings, incorrect numeric increments, partial rankings and questions inside endings.

File/media upload endpoints and builder upload controls are implemented. Signed S3 PUTs bind byte length, content type and `If-None-Match: *`; completion verifies object metadata, image signatures for public media and a signed, immutable intake proof tied to the question/attempt. Intake refuses unfinalized attachments before acknowledging a response. Local integration tests cover ownership, metadata mismatch, failed proof synchronization/retry and cleanup preserving ready files. Initial limits are 25 MB/file, 30 allocations/attempt and 500 media allocations/form. Only unfinished uploads older than 48 hours are automatically deleted; ready-file reclamation requires intake reconciliation and remains release work. The private Singapore Railway bucket is provisioned. Live checks passed its CORS preflight, signed PUT, conditional overwrite rejection, metadata verification, upload-proof synchronization and authenticated download.

Response/API/MCP lists now use scoped keyset cursors that retain database microseconds. Dashboard searches run on the server and load additional pages; summaries omit draft bodies. CSV/JSON exports stream from one repeatable-read snapshot, with backpressure, two concurrent downloads per API process and a two-minute deadline. JSON is available when historical fields exceed CSV's 2,000-column limit. A 10,005-row integration fixture verifies full exports, concurrent-write exclusion, pagination ties, and cancellation releasing connections. Builder navigation waits for pending saves; publication reads preserve the current draft's save identity. Column settings support 2–4 columns, retain content when reducing the count and allow moving questions into/out of layouts with undo.

The repeatable `pnpm bench` 200-question/39-rule fixture measured local CPU p95 of 0.393 ms for parsing, 0.215 ms for logic, 0.217 ms for submission validation, 0.361 ms for typing/serialization and 0.311 ms for movement/serialization (Bun 1.3.14, Apple M4). These exclude DOM/layout, network and mobile performance. Responsive embeds include a small host script that validates message origin and iframe window before resizing. Browser checks caught and fixed an iframe height bug: content now grows and shrinks on Next/Back (1,249px to 416px at desktop), fits a 390px viewport without horizontal overflow, and ignores forged-origin/window resize messages.

The canonical Cloudflare dashboard/respondent assets and intake are deployed at `https://formsmith.samz.in`, with two API replicas, a job service and PostgreSQL 18 in Railway Singapore. Live end-to-end testing passed create/publish, signed upload, 12 concurrent duplicate requests yielding one receipt, immutable-version pinning after republishing, replay into one response, JSON export/download, closure and retry. These tests used a temporary scoped synthetic account; Google OAuth reaches Google's sign-in page but awaits interactive login. A follow-up 20-attempt/40-request run after removing redundant intake reads and moving queue notification behind durable acknowledgement reconciled all 20 responses (p95 3.1 seconds in that run; network variation prevents a general latency claim). A live public webhook receiver verified HMAC, returned 503 deliberately on its first delivery, then accepted a retry with the same event ID; delivery completed after retry. The temporary receiver and its R2 verification objects were removed. A separate live concurrency check reconciled 40 requests for 20 distinct attempts to 20 receipts and 20 stored responses (intake p95 3.3 seconds in this small run, not a capacity/SLA claim). Initial automatic Railway detection ignored the config file; the root Dockerfile now builds successfully, and startup runs advisory-lock-protected migrations before serving. SHA-pinned GitHub Actions checks and dependency-update configuration are present; the first GitHub CI run passed the Linux build, PostgreSQL integration tests and workerd intake/gateway checks. The legacy Vercel Git integration is disabled for this rebuild through vercel.json.

Custom-domain provisioning additionally installs an exact hostname Worker route and refuses conflicts with another Worker. It never installs a catch-all route over unrelated `samz.in` applications. Production custom hostnames still need Cloudflare for SaaS fallback/DNS setup and a scoped API token with SSL/custom-hostname and Worker-route permissions; Wrangler's OAuth token returned 403 for custom-hostname access. Visual parity, rich editing edge cases, browser/mobile performance, Google/Sheets/agent-client interoperability, full custom-domain TLS checks and restore/load tests remain release gates. Google Cloud project `formsmith-samz` and the Formsmith Web OAuth client were created under account 0 with production/local callbacks; credentials are only in ignored private files. Computer Use still reports `cgWindowNotFound` on recheck; a request to reopen Chrome is pending while independent implementation continues. Worker compatibility is pinned to 2026-09-21, matching the installed workerd release; the local intake smoke passes on that configuration.

## Confirmed scope

- Open-source Tally alternative with simple, Notion-like form authoring.
- Match Tally's current visual design exactly for the in-scope dashboard, builder and renderer: layout, typography, spacing, controls, menus and interaction states. Use observed Tally screens as the visual acceptance reference.
- Build the full builder and renderer first, using a custom engine instead of BlockNote.
- Prioritize lightweight delivery, performance, speed, and reliability.
- Production submission handling must address concurrency, duplicates, interrupted requests and component outages. Guarantees must identify their durability boundary and protected failures; arbitrary outages cannot imply unlimited availability or survival of every data copy being lost.
- First-class MCP support for the full form lifecycle with scoped permissions; outgoing webhooks and Google Sheets as the first native connector.
- Form JSON export/re-import, response CSV/JSON, and inline/full-page embeds. PDF, standalone HTML, popup and React-specific embedding are outside the initial baseline.
- Dashboard: SPA with TanStack Router on Cloudflare Worker Assets.
- Backend: Elysia on Railway. Database: PostgreSQL on Railway.
- Files and form media: Railway private S3-compatible buckets, with configurable storage for self-hosting.
- Drizzle, Better Auth, Tailwind, and shadcn. Add Redis or other services only for demonstrated needs.
- Google OAuth is the launch sign-in provider, using Better Auth and Drizzle. Public origin: `https://formsmith.samz.in`; Google callback: `/api/auth/callback/google`. Use Google Cloud account `authuser=0` for configuration. Cloud dashboard configuration and end-to-end deployment/testing are authorized.
- Custom domains for respondent-facing published forms are included. A verified hostname belongs to one personal workspace and supports multiple form paths plus an optional default form. Use Cloudflare for SaaS for managed TLS, expose DNS/verification/certificate status in the dashboard, and enforce ownership before routing. Dashboard/authentication remain on the canonical Formsmith origin. Prevent domain takeovers on claim, reassignment and removal; a removed domain must stop serving the previous owner's content.

## Decisions and rationale

**Replace BlockNote — accepted.** Its limitations prompted the rebuild. The old implementation also couples respondent answers and validation to editor block properties. The implemented engine uses one ProseMirror document for rich text and native structural movement, while Formsmith owns the persisted semantic model.

**Maintain one document — accepted.** Keep scope, decisions, glossary, and unresolved questions in this file; avoid separate research reports, ADR files, or interview logs.

**Own the form model; allow text primitives — accepted.** Formsmith owns structure and persistence; mature text-editing libraries are permitted. Cross-block text selection, multiline paste, multi-block clipboard and unified text/structure undo are required, so engine selection must account for them.

**Release boundary — accepted.** Deliver end-to-end saved, published forms and real submissions with a minimal dashboard. Support desktop authoring, mobile respondents and a self-hosted path outside Cloudflare/Railway. Use a fresh model without legacy migration.

**Concurrent edits — accepted.** Live multiplayer is deferred. Detect conflicts between tabs, humans and agents rather than silently overwriting changes.

**Questions and layout — accepted.** Each question owns its label, help text and input; moving or duplicating it keeps them together. Standalone content blocks remain available. Allow up to four resizable columns, no columns nested within columns, and stack them in reading order on mobile.

**Published versions — accepted.** Respondent attempts stay on the published version they started with. New attempts use the latest published version, preserving the meaning of existing responses when a form changes.

**Hidden answers — accepted.** Preserve answers locally for backtracking when their fields become hidden. Exclude them from submission, validation, calculations and answer piping while hidden. Dependency evaluation and cycle handling still need a precise implementation contract.

**Ownership and invalid drafts — accepted.** Personal workspaces have one owner and no invitations; agents receive scoped access from the owner. Incomplete drafts can be saved, including references broken by question deletion. Show affected logic/piping references and block publication until repaired.

**Respondent settings — accepted.** English UI messages, manual form closing, basic spam protection and optional same-device resume. Defer partial-submission capture, cross-device resume, passwords and scheduled closing.

**Agent access — accepted.** Remote MCP with browser-based OAuth consent and scoped machine credentials. Target Codex, Claude and ChatGPT; verify each client's connection flow during implementation.

**Logic limits — accepted.** Nested all/any conditions, built-in numeric/text calculations, forward page jumps, normal Back navigation and multiple endings. Reject circular dependencies and arbitrary executable code.

**Performance target — accepted.** Benchmark 200-question forms and modest mobile respondent devices. Target p95 typing updates below 100 ms on agreed reference hardware; cold-load budgets, test profiles and deployment geography still need definition. These are acceptance targets, not measured results.

## First milestone

| Area | Accepted coverage |
| --- | --- |
| Authoring | Inline writing, slash menu, formatting, block settings, drag/reorder, keyboard operations, clipboard, undo/redo, autosave and recovery |
| Layout | Text, headings, media, columns, page breaks, thank-you pages, themes, logo and cover |
| Questions | Text/contact, numbers, choices, dropdowns, date/time, ratings/scales, ranking, matrix, uploads and signatures |
| Logic | Conditions, visibility, requiredness, branching, calculations, hidden/prefilled fields and answer piping |
| Renderer | Responsive and accessible forms, navigation, validation, progress, reliable submission and preview parity |
| Product foundation | Minimal dashboard, save/publish, public forms, submission storage, viewing and export |
| Agents | Discover capabilities; create, inspect, edit, validate, preview and publish forms; access authorized submissions |
| Connectors and portability | Submission webhooks, Google Sheets, form JSON export/re-import, response CSV/JSON and responsive embeds |

Later work: payments, billing, built-in AI chat, template marketplace and advanced analytics. External agents using MCP are distinct from built-in AI features.

## Design requirements to resolve

- Formsmith owns the form definition; propose separate respondent state and a renderer that does not load the authoring engine. Choose text primitives after checking selection/history requirements.
- Stable IDs, structured validation errors, targeted edits and revision checks support both human and agent authors. Concurrent updates must not silently overwrite work.
- Publishing must preserve the accepted version-pinning behavior; submission retries and interrupted saves still need explicit acceptance cases. Connector outages should not block saving submissions.
- Measure renderer weight separately from builder weight. Establish reference devices, network conditions, form sizes and load/interaction budgets before claiming performance.
- Upload storage, embed behavior, export round-trip guarantees, connector delivery and agent permissions require concrete acceptance cases.

Text-engine candidate: one ProseMirror editing document with custom question/layout nodes, adapted to Formsmith-owned JSON. Its [schema, selection and transaction model](https://prosemirror.net/docs/guide/) fits the accepted cross-block editing requirements better than independent text editors per label. Lexical remains an alternative. This is a fit judgment, not a final selection or performance result; prove cross-question selection/paste, column moves, typing→drag→undo and IME behavior in a focused prototype after scope confirmation. UI/API/MCP use stable domain IDs, not editor positions, and public rendering stays independent of editing dependencies.

## Workspace and implementation readiness

**Recommendation: pnpm workspaces + Turborepo; Bun for the Elysia runtime.** Use one lockfile and a small task configuration. Turbo supplies dependency-aware tasks, caching and deployment pruning; it adds no respondent bundle code. Current [pnpm pipeline](https://pnpm.io/cli/pipeline) supports cached orchestration but is experimental. Nx is viable; its broader plugin/generator conventions are not needed for this initial workspace.

Reviewed production source: [Formbricks](https://github.com/formbricks/formbricks/blob/ba5ecdf9f0c25d2b7a022b0f4178ead7467b152e/package.json) uses pnpm/Turbo and separates respondent survey packages; [Cal.com](https://github.com/calcom/cal.com/blob/54343aa685ae8f33159d2f485ec4a57bad5c574a/package.json) uses Yarn/Turbo with distinct API/embed boundaries; [Dub](https://github.com/dubinc/dub/blob/db61d8a23e6b671b3fcf11b394d0cca51e7e28b2/package.json) uses pnpm/Turbo but still has older task configuration. Borrow their separation of deployable apps and reusable runtime code, not their accumulated infrastructure.

```text
apps/dashboard      # SPA dashboard and builder
apps/forms          # public forms
apps/api            # Elysia API, auth, DB, MCP and connectors
packages/core       # form schema, operations, validation and logic
packages/editor     # authoring engine
packages/renderer   # respondent components, reused by preview
```

Create additional packages only when actual reuse or distribution requires them. Keep auth, database and Google Sheets inside the API initially. Cache deterministic builds/checks with explicit inputs, outputs and environment; do not cache dev servers, migrations, deployments or connector side effects. Use app-specific deployment builds and backend pruning where useful. [Turbo caching](https://turborepo.dev/docs/crafting-your-repository/caching), [prune](https://turborepo.dev/docs/reference/prune).

[Railway buckets](https://docs.railway.com/storage-buckets) support private S3-compatible storage and presigned URLs; public media needs stable application URLs and orphan cleanup needs application behavior. [Better Auth MCP](https://better-auth.com/docs/plugins/mcp) and the [MCP authorization specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization) support the proposed remote OAuth flow. These facts establish feasibility, not verified client interoperability. Context7 remains unavailable; current primary documentation was used.

## Production reliability design

Research-backed proposal, not a deployed or benchmarked guarantee. Aim for no lost acknowledged submissions under the explicitly tested failure model. Distinguish a committed submission from a durably received command awaiting processing. Browser-local recovery is best-effort, not server durability.

**Submission protocol.** Generate one random attempt key; pin its form version and freeze the outgoing command while the result is unknown. Validate and recompute logic server-side. In one short PostgreSQL transaction, enforce `UNIQUE(form_id, attempt_key)`, store answers and a stable receipt, link finalized uploads, and create durable delivery jobs (the outbox). Return completion only after durable commit. Matching retries return the original receipt—even if the form later closes; a reused key with a different canonical payload is rejected. Concurrent inserts rely on the unique constraint, not a pre-insert existence check. Resolve an insert conflict with a subsequent lookup/transaction retry; a same-statement fallback query can miss the concurrent row. [PostgreSQL isolation](https://www.postgresql.org/docs/current/transaction-iso.html), [idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/).

**Isolate delivery.** Run API and delivery workers as separate Railway services from the same backend code/image. PostgreSQL-backed jobs are sufficient initially. Claim jobs with short leases and `SKIP LOCKED`; make external calls outside transactions, retry with backoff/jitter, and retain failed jobs for inspection/replay. Submission and delivery intent commit atomically, eliminating the save-then-enqueue gap. Delivery is at least once: webhooks carry stable event IDs; Google Sheets needs reconciliation around ambiguous writes rather than blind append retries. Redis is optional optimization, never the sole submission/receipt store. [Transactional outbox](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html), [queue-like locking](https://www.postgresql.org/docs/current/sql-select.html).

**Concurrency and overload.** Use at least two stateless API replicas, bounded request sizes, bounded queues/pools and short transactions. Budget database connections across APIs, workers, overlapping deployments and administration. Avoid an exclusive per-form counter lock on every submission. Return retryable overload responses instead of buffering accepted answers in RAM. Measure sustained and burst throughput before assigning capacity; a 200-question fixture is not a submission-rate requirement.

**HA and recovery.** Railway offers [PostgreSQL HA](https://docs.railway.com/databases/postgresql-ha), but its official image [defaults synchronous mode to false](https://github.com/railwayapp-templates/postgres-ha/blob/ea3a0c555b124d856a495b266fa2b187dd6add4f/postgres-patroni/src/patroni/config.rs#L729). Platform overrides and actual failure-domain placement are unverified. A zero-acknowledged-loss primary-failure claim requires verified durable commits, strict synchronous replication and safe promotion; loss of a safe standby must block unsafe commits. [Patroni semantics](https://patroni.readthedocs.io/en/latest/replication_modes.html), [PostgreSQL WAL settings](https://www.postgresql.org/docs/current/runtime-config-wal.html). Confirm Railway supports the required effective configuration before launch. Async WAL archival/PITR is recovery protection, not RPO zero; Railway documents archive gaps under prolonged storage failure. Test restoration and monitor archival lag. [PITR](https://docs.railway.com/volumes/point-in-time-recovery).

| Failure | Required behavior |
| --- | --- |
| API dies before commit | Roll back; retry the same attempt |
| Commit succeeds but reply is lost | Same-key retry returns the stored receipt; no duplicate submission/jobs |
| Worker, Sheets or webhook fails | Continue accepting submissions; retain and retry delivery independently |
| PostgreSQL primary fails | Reconnect after safe failover; no unsafe promotion or success before durable commit |
| Entire database/backend unavailable | Baseline returns retryable failure; independent intake below can durably receive commands |
| Storage unavailable | Text-only submissions continue; required unfinished uploads cannot be declared complete |
| Dashboard, MCP or optional cache fails | Public submission path has no synchronous dependency on those services |
| Browser/network disappears before receipt | Recover locally where possible and query/retry same attempt; user-cleared/browser-evicted data has no server guarantee |

**Uploads and operations.** Verify uploaded objects before finalizing them; store immutable object keys, not expiring URLs. Coordinate orphan cleanup with upload/link state to avoid deleting attachments being committed. Database backups do not back up attachments; Railway currently lacks bucket object versioning. Configure graceful shutdown, deploy overlap and continuous external probes—Railway's [deployment healthchecks](https://docs.railway.com/deployments/healthchecks) are not ongoing health monitoring. Alert on acceptance errors, unknown outcomes, pool saturation, replication/archive lag, oldest pending job, exhausted retries and backup/restore failures.

**Railway-hosted RabbitMQ — deferred.** A three-node quorum cluster is viable but adds always-running broker cost and operations while sharing Railway's failure domain. Keep the managed Cloudflare intake for cost-effective independent acceptance. Railway API, PostgreSQL and background services still consume running resources; the overall stack is not fully serverless. [Railway pricing](https://railway.com/pricing), [Cloudflare queue pricing](https://developers.cloudflare.com/queues/platform/pricing/).

**Independent outage intake — accepted.** Use a small Cloudflare intake Worker and independent R2 durable journal, with Cloudflare Queues as a replay accelerator. Persist an immutable command and receipt before returning `202 received/pending`; replay through the same Elysia/Postgres idempotency protocol. Copy published definitions/admission information into that failure domain so intake does not need the unavailable database. Explicitly define stale closure/revocation behavior and expire admission capabilities; refuse new acceptance when policy cannot be established safely. Completion remains distinct from receipt. No RabbitMQ or Redis is needed for this baseline.

The implemented intake uses signed, version-pinned attempts and monotonically increasing publication revisions. Availability leases and new-attempt capabilities expire within 24 hours; existing identical retries and receipt reads remain authorized after closure/expiry. Closure takes effect at intake when synchronization succeeds, with already-admitted in-flight requests permitted to finish. The API must report synchronization state and refresh leases before expiry. A pending index precedes immutable journal creation; a cursor-based scheduled reconciler recovers missed enqueue. Accepted journal entries are retained without automatic deletion during implementation; bounded retention, quota enforcement and production load/failover exercises remain release work. Explicit signed recovery can replay retained journals past old commit markers; response IDs derive from immutable receipt IDs so reconstructed connector events retain their identity. Unit failure tests and a local workerd/R2/Queues HTTP smoke test cover receipt races and backend outages; these are not evidence of production capacity or provider availability.

An R2 journal plus Cloudflare Queues is a candidate implementation. A reconciler must recover journal entries that were never enqueued; queue failure cannot erase journaled acceptance. Queue messages are at least once and expire, so the queue/DLQ alone is not an indefinite source of truth. Retain replay protection across the agreed database recovery horizon, not merely until first delivery. Scope retention, quotas, reconciliation, status access and cleanup before implementation. [R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/), [queue delivery](https://developers.cloudflare.com/queues/reference/delivery-guarantees/), [retention limits](https://developers.cloudflare.com/queues/platform/limits/). This extends Cloudflare beyond assets and stores response commands outside Railway; ordinary uploads remain in Railway. It does not keep required uploads working during a Railway bucket outage or survive simultaneous failure of every intake path.

**Production-code cross-check.** Formbricks' inspected [response route](https://github.com/formbricks/formbricks/blob/ba5ecdf9f0c25d2b7a022b0f4178ead7467b152e/apps/web/app/api/v2/client/%5BworkspaceId%5D/responses/route.ts) creates a response before invoking its separate queue producer; that sequence illustrates the crash gap the transactional outbox must close. Its [webhook worker](https://github.com/formbricks/formbricks/blob/ba5ecdf9f0c25d2b7a022b0f4178ead7467b152e/apps/web/modules/response-pipeline/lib/process-webhook-delivery-job.ts) uses stable message IDs, retry classification and delivery metrics—useful patterns, not evidence of universal fault tolerance.

**Release proof.** Load-test distinct and duplicate attempts, then inject failures before/after commit, drop successful replies, kill workers, fail over PostgreSQL, exhaust pools, interrupt uploads and disable connectors. Reconcile every acknowledged receipt against one submission and its delivery intents. Run isolated restore drills; if independent intake is selected, test backend outages, missed enqueue, journal replay and retention pressure. Specify peak submissions/second, maximum protected outage, receipt latency and recovery time before a production SLA; none has been measured or promised yet.

## Implementation gates

1. Prove the custom editing model: cross-question selection/paste, bounded columns, typing→drag→undo, IME input and stale agent edits. ProseMirror is the initial candidate; retain a Formsmith-owned persisted schema.
2. Match Tally's observed in-scope screens and states at fixed desktop/mobile viewports. Check typography, spacing, controls, menus, focus, errors and responsive behavior against reference captures. The anonymous builder, preview and customization panel have been inspected; authenticated dashboard screens still need direct or documented visual references.
3. Verify shared rules across builder preview, public renderer and server; publish rejects invalid references/cycles, attempts remain version-pinned, and retrying one submission attempt cannot duplicate it.
4. Benchmark the 200-question fixture and mobile runtime; confirm authoring dependencies are absent from public bundles. Test the real Google Sheets/webhook delivery path, export/re-import and supported agent connection flows.

Confirm the consolidated scope before implementation, as required by the invoked grilling workflow. Routine implementation choices after that confirmation will not trigger further scope questionnaires.

## Glossary

- **Form:** Questions and supporting content intended to collect answers.
- **Builder:** The author-facing experience for composing and configuring forms.
- **Renderer:** The respondent-facing experience for displaying and completing forms.
- **Question:** A unit containing a label, optional help text and an input, moved or duplicated together.
- **Published version:** A released form definition used by respondents; later publication does not change attempts already using it.
- **Attempt:** A respondent's progress through a particular published version, including answers before submission.

## Reference baseline

Old source: `../formsmith-old`; inspected read-only. Its preview uses BlockNote, answer state lives in block properties, nested-field extraction is incomplete, and publishing overwrites a mutable snapshot. Reuse behavior and visual references selectively; migration is outside the accepted initial scope.

Tally's anonymous builder was tried through question insertion and preview. Reference scope: [authoring](https://tally.so/help/create-a-form), [field types](https://tally.so/help/input-blocks), [keyboard behavior](https://tally.so/help/keyboard-shortcuts), [logic](https://tally.so/help/conditional-form-logic), and [columns](https://tally.so/help/columns). These establish comparison points, not blanket feature-parity commitments.

## Working on the repository

Use Bun 1.3.14, Node 22.22+ and pnpm 12.6.0. Run `pnpm install --frozen-lockfile`, then `pnpm dev:setup --postgres` with local PostgreSQL tools installed, `pnpm db:migrate`, and `pnpm dev`. Run the job worker separately with `bun --env-file=.env apps/api/src/worker.ts`. Add your own Google client credentials to the ignored `.env`; register `/api/auth/callback/google` on the chosen dashboard origin. The setup command never replaces existing credentials. Worker development overrides live in ignored `.dev.vars`; Wrangler's generated declaration files are regenerated by type checks and kept out of Git.

Run `pnpm check` before submitting changes. `pnpm test:integration` requires the isolated PostgreSQL database on `127.0.0.1:54329`; stop the local job worker while running its lease tests. `pnpm test:intake` and `pnpm test:gateway` exercise real local workerd/R2/Queues/service bindings. `pnpm test:http` requires the local applications and job worker running. `pnpm bench` reports repeatable CPU measurements, not browser or production capacity. Schema changes require `pnpm db:generate` and a reviewed forward migration; never rewrite applied migrations. Keep scope and operational notes here instead of creating additional planning documents.

The root Dockerfile builds the Railway backend image. `PROCESS_ROLE=api` serves HTTP and `PROCESS_ROLE=worker` processes durable jobs. Both wait for locked, idempotent migrations; a failed migration prevents startup. `/health` is liveness and `/ready` checks PostgreSQL. The deployed API has a `/ready` healthcheck with a 120-second timeout, 30-second deployment overlap and 30-second drain; configure the same for your deployment. The job worker has no HTTP health endpoint. Use independent random production secrets, private PostgreSQL networking and private S3 credentials. Frontend/edge deployment uses each application's Wrangler configuration; replace the account/domain/resource names when deploying your own instance. Never commit `.env`, `.dev.vars`, OAuth secrets, bucket credentials or generated build output.

Database recovery: restore accounts, forms, immutable versions, uploads and connector metadata before replaying responses. Pause connector workers until destination state is reconciled; external delivery remains at least once. With the restored API running, set its intake environment and run `pnpm recover:intake --form <form-id>` for each affected form. This signed operator command scans retained journals in bounded pages and confirms every entry against PostgreSQL, ignoring pre-restore commit markers. Failed pages do not advance; resume with the reported `--cursor`, or rerun from the beginning. Missing definitions/uploads or conflicts stop recovery for repair without deleting journals. `pnpm test:restore` creates and removes two isolated test databases and uses matching PostgreSQL client tools (`PG_DUMP`/`PG_RESTORE` can override PATH); it must never point at production. A PostgreSQL 18 local drill restored a backup preceding five responses, replayed each twice, and recovered all answers and original response/event IDs with one outbox job each. This does not verify Railway PITR, provider failover, attachment backups or external connector reconciliation after restore.

The authenticated dashboard was exercised with an isolated synthetic local account: custom-domain DNS instructions and missing-TXT rejection work, and the lazy-loaded shadcn/Radix form menu supports keyboard selection, duplication into a new unpublished draft, sharing and JSON export. The local Vite proxy now distinguishes `/f/` respondent paths from `/forms/` builder paths, so builder reloads work. A 200-question browser fixture loaded and processed 30 keyboard inputs, but its rendering-latency measurement is invalid: the shared preview produced roughly one animation frame per second even while idle. Visible-browser/mobile timing remains a release gate. Intake acknowledgement still awaits the pending index and immutable journal; queue notification uses `waitUntil` afterward, with scheduled reconciliation covering cancellation or queue outage. A stuck-queue unit test and real workerd smoke cover that boundary.

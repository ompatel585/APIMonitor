# Notifications Module

Scope: `Backend/src/modules/notifications/`. Read `Backend/src/modules/CLAUDE.md`
first.

This module owns **delivery mechanics only**: transport adapters, retries, and
delivery receipts. It does not decide whether or whom to alert — that is
`alerts`. The split is deliberate: rules change with product policy, delivery
changes with providers. See `Backend/src/modules/alerts/CLAUDE.md` §1.

---

## 1. Responsibilities

Owns: the `notification` queue processor's business logic (`NotificationsService`),
the EMAIL and WEBHOOK transport adapters, and the append-only `DeliveryRecord`
receipt of every attempted delivery.

Does not own: alert rule evaluation, deduplication/throttling, escalation policy,
or `NotificationChannel` configuration rows (all `alerts`). This module reads a
channel by id and decrypts its secret through `NotificationChannelsService`; it
never writes to `alert_rules`, `alerts`, or `notification_channels`.

---

## 2. Delivery Flow

```text
alerts ──enqueue notification job (DELIVERY)──> notification queue
                                                     │
                                            NotificationProcessor
                                                     │
                                            NotificationsService.deliver()
                                                     │
                              ┌──────────────────────┴──────────────────────┐
                              │                                             │
                      EmailDeliveryAdapter                     WebhookDeliveryAdapter
                       (MailerService)                        (SafeHttpClient, HMAC)
                              │                                             │
                              └──────────────────────┬──────────────────────┘
                                                      │
                                          DeliveryRecord (append-only)
```

The job payload carries `organizationId`, `alertId`, `channelId`, and a
`correlationId` only — see `infrastructure/queue/notification-job.payload.ts`.
`NotificationsService` loads the `Alert` and `NotificationChannel` rows itself;
it never trusts a rendered body or secret carried on the job.

---

## 3. Idempotency and Retries

Every delivery attempt — success or failure — writes a **new** `DeliveryRecord`
row. The table is append-only (no `updatedAt`, matching the precedent set by
`IncidentEvent`): a retried job is not an update, it is another receipt. This
means running the same job twice never corrupts state; it only adds to the
audit trail. `DeliveryRecord` carries no `organizationId` — its tenant is
reached only through `alertId`/`channelId`, so every read path (the delivery
records controller) resolves the filter id through its owning tenant-scoped
service first.

Retries are driven by the queue, not by this module: `attempts: 5` with
exponential backoff on the `notification` queue (`workers/CLAUDE.md` §5). A
failure this module reports as retryable throws/returns a failure signal to
the processor, which lets the job fail so BullMQ retries it. A **permanent**
failure — most notably an SSRF-blocked webhook target — completes the job
successfully with a recorded `FAILED`/skip reason instead: an SSRF violation
will never succeed on retry, so retrying it only wastes attempts and delays
dead-lettering. This mirrors "a check that fails is a successful job" from
`workers/CLAUDE.md` §6, applied here as "an SSRF-blocked webhook is a
completed, recorded job, not a job failure."

Dead-lettering on exhaustion (5 attempts): BullMQ moves the job to its failed
set with the payload, error, and correlation id retained for replay, per
`workers/CLAUDE.md` §5. This module does not implement its own dead-letter
store — it relies on the queue's `removeOnFail` retention and structured
failure logging to make replay possible.

---

## 4. Email vs Webhook

Two adapters, one per `NotificationChannel.type`:

- **`EmailDeliveryAdapter`** — `MailerService` + `alert-triggered.template.ts`.
  Failures are transport errors (SMTP unreachable, rejected recipient) and are
  always treated as retryable.
- **`WebhookDeliveryAdapter`** — `SafeHttpClient` (SSRF-guarded, 10s timeout).
  Signs the JSON body with `HMAC-SHA256` using the channel's decrypted secret,
  sent as `X-APIMonitor-Signature`. A non-2xx response or transport error is
  retryable; an `SsrfViolationError` is permanent (see §3).

Adding a third channel type means adding a third adapter here and a branch in
`NotificationsService.deliver()` — never branching on channel type inside a
controller or inside `alerts`.

---

## 5. Secrets and Logging

- A channel's decrypted webhook secret exists only for the duration of signing
  one request. It is never logged, never persisted anywhere but the
  `NotificationChannel.encryptedSecret` column (owned by `alerts`), and never
  returned from any method beyond the adapter call that needs it.
- A rendered message body (the email text, the webhook JSON payload) never
  appears in a job payload, a log line, or a `DeliveryRecord` — only a
  short, truncated `failureReason` (max 500 chars) is recorded on failure, and
  it must not itself carry a secret or a full response body.
- Structured logs carry `alertId`, `channelId`, `channelType`, `attempt`,
  `correlationId`, and outcome — never the destination's credential.

---

## 6. Interaction

| Direction | Mechanism |
| --- | --- |
| alerts → notifications | enqueued `notification` queue job (`DELIVERY` kind) |
| notifications → alerts | `AlertsRepository`/`NotificationChannelsRepository`/`NotificationChannelsService` reads only — never a write |
| notifications → monitors | `MonitorsService.findByIdOrThrow` for the monitor name shown in a rendered message |
| notifications → mailer/http | `infrastructure/mailer`, `infrastructure/http` |

---

## 7. Forbidden in this module

- evaluating alert rules or deduplication/throttling (that is `alerts`)
- writing to `alert_rules`, `alerts`, or `notification_channels`
- logging a decrypted secret, a rendered message body, or a full response body
- retrying an SSRF-blocked webhook target
- mutating a `DeliveryRecord` after it is written
- an unscoped `DeliveryRecord` listing (every list is filtered by a tenant-
  resolved `channelId` or `alertId`)
- raw `axios`/`fetch` for webhook delivery — always `SafeHttpClient`
- a job payload carrying anything beyond ids, scalars, and a correlation id

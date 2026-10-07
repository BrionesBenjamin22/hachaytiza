# Authentication and location vertical slice

Profile editing, audit history and authenticated password change extend these contracts in [PROFILE.md](PROFILE.md). The current public user DTO additionally includes `hasLocalPassword`, `createdAt` and `updatedAt`.

The API is a NestJS modular monolith. Auth manages credentials, sessions and email tokens; users manages profile locality; locations exposes selectable active locations; matches exposes discovery. Prisma stores all state in PostgreSQL. PostGIS is available through the documented Compose image; this slice performs no spatial queries.

## Runtime and database

Copy the root `.env.example` to a local untracked environment file. Supply `DATABASE_URL`, separate random `JWT_SECRET` and `CSRF_SECRET` (at least 32 characters), `FRONTEND_URL` and exact `CORS_ORIGINS`. Resend needs `RESEND_API_KEY` and `EMAIL_FROM`; production refuses missing email configuration and HTTP frontend origins. Local development without Resend can use authentication but cannot receive verification or recovery emails; the API records only a safe delivery failure event. No tokens or email addresses are logged.

Run `docker compose up -d db`, `pnpm --filter api db:generate`, `pnpm --filter api db:migrate`, then `pnpm --filter api db:seed`. Commands require the environment to be loaded by the shell (Nest loads environment files at application startup). Development fixtures are an explicit separate command: `NODE_ENV=development pnpm --filter api db:seed:dev` (set environment variables using the appropriate shell). Fictional matches and an organizer with no usable password are never seeded automatically. Location seed keys map to stable UUIDs, with province/city hierarchy and the existing `localidades.json` entries. Both seeds are idempotent. All four demo matches occur on separate local days; creation and organizer participation are atomic. The timezone is `America/Argentina/Buenos_Aires`.

## HTTP contracts

All paths below use `/api/v1`. OpenAPI is available at `/api/v1/docs-json`; health remains public `GET /health`.

| Method/path | Payload | Response |
| --- | --- | --- |
| GET `/auth/csrf` | none | `{csrfToken}` plus browser-bound cookies |
| POST `/auth/register` | `{name,email,password,primaryLocationId}` | 201 session; directly signs in and attempts verification email |
| POST `/auth/login` | `{email,password}` | 200 session |
| GET `/auth/session` | none | current session, without renewing credentials |
| POST `/auth/refresh` | empty | session with rotated refresh and new access cookie |
| POST `/auth/logout` | empty | 204; revokes server session and clears auth cookies |
| POST `/auth/password/forgot` | `{email}` | generic 200 message for existing and nonexistent accounts; delivery dispatched asynchronously |
| POST `/auth/password/reset` | `{token,password}` | 200 message; consumes token and revokes every user session |
| POST `/auth/email/verify` | `{token}` | 200 message; consumes verification token |
| POST `/auth/email/resend` | empty; authenticated | generic 200 message |
| PATCH `/users/me/location` | `{primaryLocationId}`; authenticated | updated public user DTO |
| GET `/locations` | none; public | `{items:[{id,name,type,parentId}]}` |
| GET `/matches?locationId=<uuid>&page=1` | locality required; public | `{items,total,page,pageSize:9,hasMore}` |

Session: `{authenticated,accessExpiresAt,refreshAvailable,user}`. Public user: `{id,name,email,emailVerified,primaryLocation:{id,name,type}|null}`. Unauthenticated session has null user and expiry. Expired access may have `refreshAvailable:true`; renewal requires explicit user interaction through POST refresh. Registration accepts a selectable active location, never arbitrary text. Legacy null locality remains permitted in storage and is set through the identity-scoped profile endpoint. Home keeps selectedHomeLocation temporarily in client memory, sends it through the matches query, and never writes profile locality.

Match items: `{id,location:{id,name,type},footballType,startsAt,venueName,address,pricePerPerson,availablePlaces,status,description}`. Formats are `FIVE`, `SIX`, `SEVEN`. Price serializes as a decimal string. Discovery returns future OPEN and CLOSED matches at active locations, including complete matches, excludes CANCELLED, and orders by startsAt then UUID. Nine-item pages and count use a repeatable-read snapshot. This slice exposes no publication, reservation or contact endpoint; contact remains private. The schema includes organizer participation and a local-day partial unique index for future flows.

## Validation and security

DTO whitelist rejects additional input fields. Names are trimmed (2–100), emails normalized (maximum 254), passwords preserved byte-for-byte (12–128), identifiers UUID validated. Password hashing uses Argon2id (64 MiB, three iterations, parallelism one). Tokens are never returned except the non-authentication CSRF token. Access JWT lasts 15 minutes with fixed HS256 algorithm/issuer/audience and server session revocation checked for every protected request. Refresh is opaque random 256-bit, SHA-256 hashed in storage, expires after 30 days, rotates atomically and revokes its session on reuse. Refresh does not extend the database expiry. Logout and reset revoke access too.

Every mutation requires exact allowlisted Origin, a browser-bound CSRF token, and acceptable Fetch Metadata. Preauthentication uses a random HttpOnly browser nonce; login/register/refresh/logout rotate the nonce. Clients retrieve fresh CSRF after these actions and keep it in memory. Cookies always use HttpOnly, Secure, SameSite=Lax, Path=/; production adds `__Host-` without Domain. Use localhost for browser development (Secure localhost exception) or HTTPS; no security flags are removed for development. Every fetch uses credentials include. Email links carry token in the fragment to avoid request logs/referrers. Email tokens persist only hashes; verification expires in 24 hours and reset in one hour, atomically single use. Email verification does not gate login, consistent with direct home after registration.

Helmet is initialized first, CORS permits explicit origins with credentials, reads are not cached, and global limiting is 100 requests per minute per IP with authentication mutations limited to 10 per minute per endpoint/IP. Errors are safe `{code,message,requestId}`. Structured HTTP logs contain method/path/status/duration/requestId only. Production proxy configuration must preserve the actual client IP; no arbitrary forwarding headers are trusted.

## Verification

`pnpm --filter api lint`, `typecheck`, `test`, `test:e2e`, `build`. E2E integration uses an isolated loopback PostgreSQL database and mocks only the email transport, capturing links without adding a production endpoint. Unit tests cover normalization and validation. Integration checks persistence, location filtering, legacy onboarding, cookie flags, CSRF/Origin, session revocation, refresh replay and one-use email tokens. Browser flow is validated independently in the web application. Real Resend delivery requires configured credentials and was not validated against the provider in this environment.


Password-reset mail dispatch is in-process and may be lost if the process crashes before delivery; users can request a new link. Refresh cookies receive a 30-day Max-Age on rotation, but the database enforces the original absolute session expiry, so the cookie may outlive the usable credential and cannot extend the session.

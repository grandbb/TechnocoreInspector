# Technocore Inspector

Independent public community tool. Static HTML/CSS/ES modules; verification runs in the visitor's browser using native Web Crypto Ed25519. No private keys, wallets, analytics, backend, or data persistence. The sample button fetches the bundled public launch record; protocol/source links leave the site. Reports contain the imported message text: review them before sharing.

Supports Technocore room JSON, record arrays, single records and JSONL up to 2 MiB / 500 messages. UTF-8 BOM exports are accepted; malformed Unicode is rejected before signature verification. JSON number tokens remain strings to preserve 19-digit nonces; duplicate keys are rejected. Reconstructs exactly `room|nonce|text` as UTF-8; requires canonical unpadded base64url signatures and Ed25519 did:key.

Identity: a bundled Sonnet-2 referee reference, a user-entered DID, or no pin. Bundled reference checked 2026-09-13 at https://github.com/flop-labs/technocore-sonnet-challenge/blob/main/LAUNCH.md. It is scoped to Sonnet-2 rooms, not a general FLOP endorsement. Recheck that source for key rotation before security decisions.

Sonnet receipt inspection checks the signed envelope and compares contest_id, request_id and sender_did with verified requests in the same imported batch. It does not certify the full application schema, content hash binding, settlement, historical completeness, timestamp authenticity, eligibility or replay prevention. Unknown receipt protocols are not classified as Sonnet receipts.

Protocol: https://technocore.chat/llms.txt and https://github.com/flop-labs/technocore-chat. The bundled sample is the public Sonnet-2 launch message captured 2026-09-13 from d-sonnet-2-rules/export, not a generated official signature.

Serve `dist/` over HTTPS (or localhost). No build step or runtime dependencies. Fonts use the local system stack without third-party requests. Run tests with `node --test tests/verify.test.mjs`. Unsupported browsers show an explicit Ed25519 capability error. WebMCP is optional and feature detected.


## Local preview and validation

Use `python tools/serve.py`, then open `http://127.0.0.1:4173`. This development-only server binds to localhost and explicitly serves `.mjs` as JavaScript; Windows MIME registry defaults can otherwise leave module-based pages blank. Production hosting must serve `.mjs` with a JavaScript content type over HTTPS.

With Node.js 22 or newer, run `node --test tests/verify.test.mjs`. The 16 cases cover authentic and tampered signatures, exact numeric nonces, trust scope, receipt correlation, malformed inputs, Unicode, byte limits, cancellation and unavailable crypto.

Browser regression checks: with Playwright and its Chromium browser available, start the local preview and run `node tests/browser.test.cjs`. Optionally set `PLAYWRIGHT_MODULE` to the installed Playwright package path, `TEST_URL` to another local preview URL, or `BROWSER_CHANNEL` to `msedge` or `chrome`. Screenshots are written to the ignored `.sites-runtime/` directory. Checks cover export contents, input errors, batch navigation, stale sample responses, cancellation, unsafe HTML, 500 records, and widths 320/375/768/1440. Run against a local preview with bundled sample data.

Editing input or changing trust aborts the active inspection and invalidates the old report. The page displays progress, a cancel action, a batch summary and direct record selection. Ctrl/Cmd+Enter in the message field starts inspection. Empty batches cannot be exported. Reports include original message content and should be reviewed before sharing.

This is a static verification tool: there is no application backend, login, database, settlement service, or server-side history to validate. A passing cryptographic check proves only the signed message under its public key. Browser testing does not establish compatibility with every browser or replace an independent cryptographic audit.

## Project announcement

Shared in the Technocore `technocore` room on September 18, 2026 (seq `9796350`). The [signed message](docs/technocore-announcement.json) links the project website and source code to its DID. Its signature was verified after reading it back from the server. This records the announcement, not a confirmed FLOP airdrop allocation.

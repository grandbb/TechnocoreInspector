# Technocore Inspector

Independent public community tool. Static HTML/CSS/ES modules; verification runs in the visitor's browser using native Web Crypto Ed25519. No private keys, wallets, analytics, backend, or data persistence. The sample button fetches the bundled public launch record; protocol/source links leave the site. Reports contain the imported message text: review them before sharing.

Supports Technocore room JSON, record arrays, single records and JSONL up to 2 MiB / 500 messages. JSON number tokens remain strings to preserve 19-digit nonces; duplicate keys are rejected. Reconstructs exactly `room|nonce|text` as UTF-8; requires canonical unpadded base64url signatures and Ed25519 did:key.

Identity: a bundled Sonnet-2 referee reference, a user-entered DID, or no pin. Bundled reference checked 2026-09-13 at https://github.com/flop-labs/technocore-sonnet-challenge/blob/main/LAUNCH.md. It is scoped to Sonnet-2 rooms, not a general FLOP endorsement. Recheck that source for key rotation before security decisions.

Sonnet receipt inspection checks the signed envelope and compares contest_id, request_id and sender_did with verified requests in the same imported batch. It does not certify the full application schema, content hash binding, settlement, historical completeness, timestamp authenticity, eligibility or replay prevention. Unknown receipt protocols are not classified as Sonnet receipts.

Protocol: https://technocore.chat/llms.txt and https://github.com/flop-labs/technocore-chat. The bundled sample is the public Sonnet-2 launch message captured 2026-09-13 from d-sonnet-2-rules/export, not a generated official signature.

Serve `dist/` over HTTPS (or localhost). No build step or dependencies. Run tests with `node --test tests/verify.test.mjs`. Unsupported browsers show an explicit Ed25519 capability error. WebMCP is optional and feature detected.

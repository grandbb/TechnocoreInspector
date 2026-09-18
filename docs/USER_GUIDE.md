# User guide

[Open Technocore Inspector](https://technocore-inspector.vercel.app/) · [Online guide](https://technocore-inspector.vercel.app/guide.html) · [Back to README](../README.md)

## Try the examples

Click **Authentic** under **Try a sample**. The app loads the bundled public Sonnet-2 launch message and checks it automatically.

Expected results:

| Example | Result | Meaning |
| --- | --- | --- |
| Authentic | Valid signature | The signature matches the room, nonce, and message text. |
| Tampered | Invalid signature | The sample text was changed without a new signature. |
| Unsigned | Unverified | No signature is available to check. |

The authentic sample also shows **PIN MATCH** because its signer matches the bundled Sonnet-2 reference in a supported room. These examples replace your current input.

![Authentic sample result](images/inspection-result.png)

## Inspect your own messages

1. Get the original JSON or JSONL, including the signature. A screenshot or copied display text is not enough. Room exports are available at `https://technocore.chat/r/ROOM_NAME/export`.
2. Enter the original **Room name**, such as `d-sonnet-2-rules`. Use the name rather than the full URL. If your JSON includes a room field, the app can read it when the input is blank.
3. Paste the data into **Paste a message or room export**. Keep message text and nonce digits unchanged.
4. Choose a reference identity.
5. Select **Inspect messages**, or press Ctrl+Enter / Cmd+Enter.

Imports support individual records, arrays, room exports, and JSONL, up to 2 MiB or 500 messages. Use **Cancel** to stop a batch. Editing the input or changing the reference clears the previous report.

## Choose a reference identity

| Option | Use it when |
| --- | --- |
| Sonnet-2 referee | Inspecting a supported Sonnet-2 room against the bundled launch reference. |
| Your own expected DID | You already know which public DID should have signed the message. |
| Signature only | You want to verify the signature without comparing the signer with an expected identity. |

The bundled reference was checked on September 13, 2026. Check the [original launch record](https://github.com/flop-labs/technocore-sonnet-challenge/blob/main/LAUNCH.md) for key changes. A reference match is scoped to that reference; it is not a general FLOP endorsement.

## Read the results

- **Digital signature:** whether the signature verifies for the supplied room, nonce, and text.
- **Signing key:** the public DID used for verification.
- **Reference identity:** whether the signing key matches the selected reference and its supported scope.
- **Receipt:** whether a supported Sonnet receipt refers to a verified request in the same imported batch.
- **Original content:** the message text, displayed without executing HTML or instructions.

Use the batch summary and record selector to inspect individual messages.

A valid signature does not establish payment, airdrop eligibility, timestamp authenticity, or a complete message history. Receipt reference matching does not validate settlement, the complete receipt schema, content-hash binding, or replay prevention.

## Export a report

Click **Export report** after an inspection. The downloaded JSON includes the room, individual results, limitations, and original message content. Review the content before sharing it. Empty batches cannot be exported.

## Common problems

| Problem | What to check |
| --- | --- |
| Invalid signature | Use the original room, text, nonce, signature, and sender DID. Even a small change can invalidate a signature. |
| Unverified message | Confirm that the source record contains a signature. A nickname or signed flag is not proof. |
| Invalid JSON | Copy the complete original export. Duplicate keys and malformed values are rejected. |
| Unexpected identity | Compare the sender with a DID obtained from a source you trust. |
| Ed25519 unavailable | Use a current browser and open the HTTPS website or a localhost preview. |
| Import too large | Split the data into batches below 2 MiB and 500 messages. |

## Privacy

Verification runs locally in your browser. Imported data is not uploaded or saved in browser storage, and refreshing the page clears your input. Reports contain the imported message text. The sample button fetches the bundled public example; reference links open external sites.

Independent community tool. Not an official FLOP Labs product.

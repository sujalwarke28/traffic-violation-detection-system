# Evaluation Q&A (Technical and Non-Technical)

## Technical
- **[Auth flow]** How is authentication implemented?
  - Firebase Web Auth (Google Sign-In). Frontend gets ID token and calls backend with `Authorization: Bearer <token>`. Backend verifies via `verifyFirebaseToken` (`backend/src/utils/auth.js`).
- **[Why Firebase over local sessions?]**
  - Faster integration, secure tokens, minimal server state, easy Google SSO.
- **[Where are protected routes?]**
  - Mounted in `backend/server.js`: `/api/violations`, `/api/drivers`, `/api/payments` all behind `verifyFirebaseToken`.
- **[How are drivers stored uniquely?]**
  - `Driver` model stores `plateNumber` exactly and `plateNumberNormalized` (A–Z0–9). Unique index on normalized ensures no duplicates across formatting variations.
- **[How are violations matched to drivers?]**
  - On `POST /api/violations`, we compute `normalizedPlateText` and look up a `Driver` with matching `plateNumberNormalized`. If found, set `ownerUserId`.
- **[How is helmet/overload detected?]**
  - COCO-SSD detects persons and motorcycles. We compute rider count relative to the motorcycle box. A heuristic over head-region pixels infers helmet presence (dark/bright/colorful thresholds). File: `frontend/admin.js`.
- **[Why client-side ML?]**
  - No server GPU dependency; simpler infra; easy demo. Trade-off: less accuracy vs. dedicated server models.
- **[OCR details]**
  - Tesseract.js on scene canvas and on cropped ID plate canvas. We reset overrides per upload to avoid stale plates. Whitelist A–Z and 0–9.
- **[Data model decisions]**
  - Store exact plate for display + normalized for matching. Violations store payment fields (`paymentStatus`, `amount`, `paidAt`).
- **[Payments security]**
  - Server creates orders (amount in paise). Client only sees `keyId` and `orderId`. Verification uses HMAC with `RAZORPAY_KEY_SECRET`. On valid signature, the violation is marked paid.
- **[Error handling examples]**
  - If `verify` fails → 400 Invalid signature. If profile not found on PATCH → 404. Frontend shows status text.
- **[Why MongoDB]**
  - Flexible schema; easy to store arrays/metadata and evolve models.
- **[How to test payments]**
  - Use Razorpay test credentials (cards/UPI). Checkout opens from Driver Home; network calls show `create-order` and `verify`.

## Non-Technical
- **[Project value]**
  - Digitizes manual violation processing, enables quick payments, and supports safety analytics.
- **[Privacy]**
  - OCR and object detection run in the browser; no raw images leave the client unless saved explicitly by Admin.
- **[Scalability]**
  - Stateless backend + managed auth; MongoDB scales horizontally. Could migrate ML to server if accuracy requirements grow.
- **[Limitations]**
  - Heuristic helmet detection; OCR accuracy depends on image quality; client-only ML may underperform at scale.
- **[Future improvements]**
  - Better plate detection with a dedicated ANPR model, server-side verification, batch imports from CCTV, analytics dashboards, notifications.
- **[Compliance]**
  - Handle PII carefully, secure payment keys via environment, and follow local regulations for fines.

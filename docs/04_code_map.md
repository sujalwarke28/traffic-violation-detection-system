# Code Map: Where Everything Lives

## Frontend (`frontend/`)
- **`index.html`**
  - Landing page (welcome + links). Scripts: `firebase.js`, `landing.js`.
- **`landing.html`**
  - Original landing template (can be removed if `index.html` is the landing).
- **`driver.html` / `driver.js`**
  - Driver Home & Profile (lists violations, Razorpay checkout, editable profile).
  - Key functions: `refreshHome()`, `renderList()`, profile edit handlers (`btnEditProfile`, `btnSaveProfile`).
- **`admin.html` / `admin.js`**
  - Admin upload, detection, OCR, and save. Drag-and-drop tiles. Functions: `ensureCoco()`, `runOCR()`, `estimateRiderCount()`, `detectHelmet()`.
- **`app.js`**
  - Detector page logic (if you keep a dedicated detector page).
- **`firebase.js`**
  - Firebase app and auth wrapper used across pages.
- **`styles.css`**
  - Global styles and components.

## Backend (`backend/`)
- **`server.js`**
  - Express app, CORS, JSON, morgan, Mongo connect, mounts routers.
  - Mounts (protected): `/api/violations`, `/api/drivers`, `/api/payments` with `verifyFirebaseToken`.
- **`src/utils/auth.js`**
  - `verifyFirebaseToken` middleware; validates Firebase ID tokens.

### Models (`backend/src/models/`)
- **`Driver.js`**
  - Stores exact `plateNumber`, and derives `plateNumberNormalized` (unique).
- **`Violation.js`**
  - Stores exact `plateText` and `normalizedPlateText`, payment fields, metadata.

### Routes (`backend/src/routes/`)
- **`violations.js`**
  - `POST /api/violations` create with computed `amount`, owner assignment by normalized plate.
  - Helper `computeAmount()`. Persists exact `plateText` plus normalized.
- **`drivers.js`**
  - `POST /api/drivers/register` registers profile.
  - `GET /api/drivers/profile` fetches profile.
  - `PATCH /api/drivers/profile` edits profile (normalized plate uniqueness).
  - `GET /api/drivers/violations` lists pending/paid for the driver.
- **`payments.js`**
  - `POST /api/payments/create-order` creates Razorpay order and returns `orderId`, `keyId`.
  - `POST /api/payments/verify` verifies signature; sets `paymentStatus='paid'`, `paidAt`.

## Configuration
- **`.env` (backend)**
  - `PORT`, `MONGODB_URI`, `MONGODB_DB`, `GOOGLE_APPLICATION_CREDENTIALS`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
- **`serviceAccountKey.json` (backend)**
  - Firebase Admin credentials referenced by `.env`.

## Data Flow Examples
- **Store user profile in MongoDB**
  - Frontend: `driver.js` → `POST /api/drivers/register` or `PATCH /api/drivers/profile`.
  - Backend: `drivers.js` → `Driver.create()` or `driver.save()`.
- **Razorpay endpoints**
  - Backend: `payments.js` → `create-order`, `verify`.
  - Frontend: `driver.js` Pay button uses both endpoints and Razorpay Checkout.
- **Firebase code**
  - Frontend initialization in `firebase.js`; backend token verification in `src/utils/auth.js`.

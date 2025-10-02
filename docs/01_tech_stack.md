# Tech Stack and Rationale

- **[Frontend: HTML/CSS/JS]**
  - Simple, portable UI without build steps. Styling via `frontend/styles.css`.
- **[Firebase Auth (Web)]**
  - Packages: `firebase-app-compat`, `firebase-auth-compat` loaded in pages like `frontend/driver.html`, `frontend/admin.html`.
  - Reason: Fast, secure Google Sign-In; server verifies ID tokens for protected APIs.
- **[Axios]**
  - HTTP client used throughout frontend to call backend REST endpoints.
- **[Tesseract.js]**
  - OCR for number plate text both in Admin (scene image and ID plate tile) and (optionally) detector page.
- **[TensorFlow.js + COCO-SSD]**
  - Object detection in the browser to find persons/motorcycles; used for rider count and helmet heuristic.
- **[Express.js]**
  - Backend web framework serving REST APIs under `backend/server.js` and `backend/src/routes/*`.
- **[MongoDB + Mongoose]**
  - Data storage. ODM models in `backend/src/models/Driver.js` and `backend/src/models/Violation.js`.
- **[Razorpay]**
  - Real payment flow. Orders created server-side; signature verified before marking a violation as paid.
- **[cors, morgan, dotenv]**
  - CORS for local dev, morgan for logging, dotenv for env variables in `backend/.env`.
- **[nodemon]**
  - Local dev auto-restart on backend changes.

## Data Structures (Mongo Schemas)

- **Driver (`backend/src/models/Driver.js`)**
  - `userId: string` (firebase uid, unique)
  - `email: string`
  - `name: string`
  - `plateNumber: string` (stored exactly as entered)
  - `plateNumberNormalized: string` (A–Z0–9 uppercase; unique; auto-filled pre-validate)
  - `vehicleType: string` (e.g., motorcycle)
  - `vehicleModel?: string`
  - `vehicleColor?: string`
  - `plateImageUrl?: string`
  - Index: `{ plateNumberNormalized: 1 }` unique

- **Violation (`backend/src/models/Violation.js`)**
  - `userId: string` (creator)
  - `ownerUserId?: string` (assigned driver’s uid if matched by plate)
  - `imageUrl?: string` (data URL or link)
  - `plateText?: string` (stored exactly as provided)
  - `normalizedPlateText?: string` (A–Z0–9 uppercase)
  - `helmetDetected: boolean | null`
  - `riderCount: number | null`
  - `violationTypes: string[]` (e.g., NO_HELMET, OVER_CAPACITY)
  - `metadata?: object`
  - `paymentStatus: 'pending' | 'paid'`
  - `amount: number`
  - `paidAt?: Date`
  - Index: `{ normalizedPlateText: 1 }`

## Why These Choices

- **Client-side ML (TF.js + COCO-SSD)** avoids server GPU needs; good for demos.
- **Tesseract.js** keeps OCR fully in-browser; private and quick iteration.
- **Firebase Auth** provides robust, minimal-effort auth with server-side token verification.
- **MongoDB** flexible schema for evolving fields like metadata, violations.
- **Razorpay** simple India-focused payments with test mode and secure signature verification.

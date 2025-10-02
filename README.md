# Traffic Violation Detection System

A full-stack web application for detecting traffic violations using in-browser ML/OCR, Firebase Authentication (Google Sign-In), a Node/Express backend, and MongoDB Atlas for persistence.

> Important: This repository is intended to be public-safe. Follow the checklist below to ensure no secrets are exposed.

## Features

- **Detection & OCR (client-side)**: COCO‑SSD (TensorFlow.js) for motorcycle/person detection, Tesseract.js for license plate OCR.
- **Admin Console**: Upload scene + optional plate image, run detection/OCR, save violations to DB.
- **Driver Portal**: Register vehicle, view assigned violations, pay fines via Razorpay Checkout.
- **Auth**: Firebase Google Sign‑In on frontend, Firebase Admin token verification on backend.
- **Persistence**: MongoDB Atlas with `drivers` and `violations` collections.

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla), TensorFlow.js, Tesseract.js.
- **Backend**: Node.js, Express.js, Mongoose.
- **Database**: MongoDB Atlas and Compass.
- **Auth**: Firebase (Google Sign‑In, Admin SDK for verification).
- **Payments**: Razorpay (demo).

## Repository Structure

```
frontend/           # Static site: landing, admin, driver
  index.html        # Detector demo
  admin.html        # Admin console
  driver.html       # Driver portal
  styles.css        # Shared styles (glass UI)
  app.js            # Detector logic
  admin.js          # Admin flows: upload, detect, OCR, save
  driver.js         # Driver flows: register, profile, violations, pay
  firebase.js       # Firebase web config & helper methods

backend/            # Express API (type: module)
  server.js         # App setup, routes, Mongo connect, auth middleware
  src/
    models/         # Mongoose models (Driver, Violation)
    routes/         # Express routers (violations, drivers, payments)
    utils/auth.js   # Firebase Admin token verification

docs/               # Architecture and planning
```

## Public Repo Safety Checklist (Do This Before/When Making Public)

- **Secrets never in repo**
  - Do NOT commit `.env` files or any keys.
  - Do NOT commit Firebase service account JSON.
  - Do NOT commit your MongoDB connection string.
- **Rotate anything that was ever committed**
  - If secrets ever appeared in git history, rotate them (MongoDB user/password, Firebase service account, Razorpay keys).
- **Use environment variables only**
  - Backend reads all secrets from environment variables on the host.
- **Client Firebase config is OK**
  - Firebase web config in `frontend/firebase.js` is public by design; keep rules secure on the server side.


## Local Development

1) Backend
- Terminal A:
  ```bash
  cd backend
  npm install
  # create .env or export env vars in your shell
  npm start
  # Server: http://localhost:4000  (Health: /health)
  ```

2) Frontend
- Terminal B:
  ```bash
  cd frontend
  # serve static files at http://localhost:8080
  python -m http.server 8080
  ```
- Open `http://localhost:8080/landing.html`.

3) Sign-In & Flows
- Sign in with Google on Landing.
- Admin → `admin.html`: Upload, detect, OCR, and Save → creates a violation in MongoDB.
- Driver → `driver.html`: Register vehicle and view pending/paid violations; pay via Razorpay test.

## API Overview (Protected by Firebase JWT)

Base URL: `http://localhost:4000`

- `GET /health` – Service health
- `POST /api/violations` – Create violation
- `GET /api/violations` – List violations created by current user
- `POST /api/violations/:id/pay` – Mark as paid (server-side fallback)
- `POST /api/drivers/register` – Create driver profile
- `GET /api/drivers/profile` – Get current profile
- `PATCH /api/drivers/profile` – Update profile
- `GET /api/drivers/violations?status=pending|paid` – List assigned violations
- `POST /api/payments/create-order` – Create Razorpay order
- `POST /api/payments/verify` – Verify and mark violation paid

Auth header required for `/api/*`:
```
Authorization: Bearer <Firebase ID Token>
```

## Production Deployment (Free-tier friendly)

- Frontend: **Netlify** (static hosting)
- Backend: **Render** Web Service (Node) – free tier sleeps on idle
- Database: **MongoDB Atlas** (free tier)
- Auth: **Firebase** – add your frontend domain to Authorized domains
- Payments: **Razorpay** (test mode)

### 1) Backend → Render
- Connect GitHub repo → New Web Service
- Root directory: `backend/`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables: add all vars listed above
- Deploy → Test `https://<service>.onrender.com/health`

### 2) Frontend → Netlify
- New site from Git → Publish directory: `frontend`
- Build command: none (static)
- Site URL: `https://<yoursite>.netlify.app`
- Update frontend `API_BASE` in `admin.js`, `driver.js`, and `app.js` to your Render URL
- Commit & deploy

### 3) Firebase & Razorpay
- Firebase Console → Authentication → Authorized domains → add your Netlify domain
- Razorpay (optional) → allow your frontend origin for Checkout; use test keys in env


## Troubleshooting

- `Network Error` on API calls: ensure backend is reachable and URL matches `API_BASE`.
- `401 Unauthorized`: check Firebase ID Token is sent and service account is correct.
- Razorpay issues: ensure keys present and using Test mode; verify signature flow.


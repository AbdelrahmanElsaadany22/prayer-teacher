<div align="center">

<img src="Frontend/front/public/logo.png" alt="Estaqim" width="120" />

# Estaqim · استقم

**A prayer teacher that watches you pray and tells you what to fix.**

Your webcam feed is classified into the postures of the salah in real time, cued by recorded Arabic voice guidance, and scored into a report when you finish.

<img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
<img src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white" alt="NestJS 11" />
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
<img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
<img src="https://img.shields.io/badge/MediaPipe-Pose-0097A7?logo=google&logoColor=white" alt="MediaPipe" />
<img src="https://img.shields.io/badge/Socket.IO-4-010101?logo=socketdotio&logoColor=white" alt="Socket.IO" />

</div>

---

## What it does

Praying correctly is something most people learn by imitation and never get corrected on again. Estaqim puts a teacher in front of you: it watches the posture you are actually in, compares it to the posture the prayer expects at that moment, and speaks the next movement out loud so you are never guessing.

### Live posture recognition

The webcam stream runs through **MediaPipe Pose**, and the resulting 33 body landmarks are classified into the nine postures of the prayer:

| | | |
|---|---|---|
| `qiyam` — standing | `takbeer` — takbeerat al-ihram | `ruku` — bowing |
| `iqama` — rising from ruku' | `sujood` — prostration | `juloos` — sitting between prostrations |
| `tashahhud` — sitting recitation | `salam_right` — turning right | `salam_left` — turning left |

Classification runs on a *stable* pose rather than a per-frame reading, so a hand raised mid-transition never counts as a new posture. Each prayer carries its own sequence, built from the correct number of rak'ahs — Fajr 2, Maghrib 3, Zuhr/Asr/Isha 4 — with the tashahhud and tasleem appearing only in the rak'ahs that actually take them.

### Guided audio, not text on a screen

You are praying — you cannot read a screen. Every cue is a recorded MP3 played in sequence on a single channel so nothing ever overlaps:

1. **The transition sound** made while moving into the posture — the takbir, or *"Sami' Allahu liman hamidah"* when rising from ruku'.
2. **The dhikr** said while holding it, or, in qiyam, the **Qur'an recitation**.
3. **The name of the next movement**, in Arabic or English.

The posture is treated as "held" for the whole sequence, so moving on before the audio finishes is caught as leaving early — the same rule in every posture.

### Real recitation, from a reciter you pick

Every rak'ah recites **Al-Fatiha**; the first two add a random short surah from 86–114 that never repeats the previous rak'ah's. Audio is streamed through the backend's own `/recitation/:surah` proxy so playback never depends on the upstream reciter server's CORS policy. Where a reciter publishes ayah timings, the ayah currently being recited is tracked and shown live.

### A 3D guide that mirrors the timeline

An embedded **Sketchfab** model demonstrates each movement, seeking to the timestamp for the exact posture and rak'ah you are on and looping there until you perform it. The model is recolored at runtime to match the active theme — the prayer rug included — and its facial detail is blurred out.

### The report

Ending a prayer writes a session containing accuracy, duration, mistake count and a per-movement mistake breakdown. Sessions are charted over time with **Recharts**, and profiles can be compared against friends'.

### Around the prayer itself

- **Accounts** — signup with an emailed verification code, JWT sessions, password change.
- **Friends** — search users, send/accept/reject/cancel requests, unfriend.
- **Chat** — real-time messaging over Socket.IO with online presence, per-friend unread badges and seen receipts.
- **Notifications** — pushed live over their own gateway.
- **Profiles** — avatars uploaded to Cloudinary.
- **Theming** — several color themes, generated Islamic background patterns, adjustable corner radius, and a favicon that follows the theme.
- **Bilingual** — full Arabic and English, including separate recorded voice cue sets.

---

## Tech stack

**Frontend** — React 19 · TypeScript · Vite · React Router 7 · MediaPipe Tasks Vision · Socket.IO client · Recharts · React Hook Form + Zod · Axios

**Backend** — NestJS 11 · MongoDB + Mongoose · Passport JWT · Socket.IO · Cloudinary · Nodemailer · class-validator

---

## Project layout

```
Backend/back/            NestJS API
  src/
    auth/                signup, login, email verification, JWT strategy
    users/               profile, avatar, search, stats, comparison
    prayer/prayer/       session recording + the recitation proxy
    friends/             friend requests
    chat/                REST + the ChatGateway websocket
    notification/        the notification gateway
    cloudinary/          avatar uploads
    mail/                verification-code delivery
Frontend/front/          React app
  src/
    features/
      prayer/            pose detection, audio service, 3D guide, report
      auth/ users/       accounts and profiles
      friends/ chat/     social
      notifications/     live notification context
    shared/              theme, i18n, reciter, api client
```

---

## Running it locally

**You need** Node.js 20+, and MongoDB running locally (or an Atlas connection string).

### Backend

```bash
cd Backend/back
npm install
cp .env.example .env     # then fill it in — see the table below
npm run start:dev        # http://localhost:3000
```

### Frontend

```bash
cd Frontend/front
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:3000
npm run dev              # http://localhost:5173
```

Open the app over `https` or `localhost` — browsers only grant camera access on a secure origin.

### Environment

| Variable | Required | Notes |
|---|---|---|
| `MONG0_URL` | yes | MongoDB connection string. The spelling is a zero, not an `O` — the code reads exactly this name. |
| `JWT_SECRET` | yes | Any long random string. |
| `PORT` | no | Defaults to `3000`. |
| `FRONTEND_URL` | no | Comma-separated CORS origins. Defaults to the two Vite dev ports. |
| `CLOUDINARY_CLOUD_NAME` `CLOUDINARY_API_KEY` `CLOUDINARY_API_SECRET` | for avatars | Avatar uploads fail without them. |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` | for email | Leave empty and verification codes are logged to the console instead of sent. |

On the frontend, `VITE_API_URL` is inlined **at build time** — changing the backend URL means rebuilding, not just restarting.

---

## API

All routes except `/auth/signup`, `/auth/login`, `/auth/verify` and `/auth/resend-code` require `Authorization: Bearer <token>`.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/auth/signup` | Register; emails a verification code |
| `POST` | `/auth/verify` | Confirm the emailed code |
| `POST` | `/auth/resend-code` | Send a fresh code |
| `POST` | `/auth/login` | Obtain a JWT |
| `GET` | `/auth/me` | The current user |
| `GET` | `/user/current` | Current user's profile |
| `GET` | `/user/search` | Find users by name |
| `GET` | `/user/comparison` | Compare stats against friends |
| `GET` | `/user/profile/:userId` | A user's public profile |
| `GET` | `/user/profile/:userId/stats` | That user's prayer statistics |
| `PATCH` | `/user/profile-picture` | Upload an avatar to Cloudinary |
| `PATCH` | `/user/name` · `/user/password` | Update account details |
| `POST` | `/prayer` | Record a finished session |
| `GET` | `/prayer` | Paginated session history |
| `GET` | `/recitation/reciters` | Available reciters |
| `GET` | `/recitation/:surah` | Proxied recitation audio |
| `POST` | `/friend-request/:receiverId` | Send a request |
| `GET` | `/friend-request` | Incoming/outgoing requests |
| `PATCH` | `/friend-request/accept/:requestId` | Accept |
| `DELETE` | `/friend-request/reject/:requestId` · `/cancel/:requestId` · `/unfriend/:friendId` | Decline, withdraw, remove |
| `GET` | `/chat/unread-counts` | Unread totals per friend |

Chat is otherwise driven over the websocket — `joinRoom`, `sendMessage`, `getMessages`, `checkOnline`, `markSeen`. See [`Backend/back/CHAT_API.md`](Backend/back/CHAT_API.md) for the REST details.

---

## Deployment

The frontend is a static bundle and deploys anywhere — the repo carries a `vercel.json` with the SPA rewrite already in it.

The backend is a long-lived process, not a serverless function: the chat and notification gateways hold open websocket connections, so it needs a host that keeps a container running. Point `MONG0_URL` at MongoDB Atlas, set `FRONTEND_URL` to the deployed frontend origin, and build the frontend with `VITE_API_URL` set to the API's public URL.

---

## Authors

- **Abdelrahman Elsayed** — [@AbdelrahmanElsaadany22](https://github.com/AbdelrahmanElsaadany22)
- **Abdallah Habsa** — [@abdallah7absa](https://github.com/abdallah7absa)

## License

Copyright © 2026 Abdelrahman Elsayed and Abdallah Habsa. **All rights reserved.**

The source is public so it can be read and evaluated — not reused. Copying,
modifying, deploying, or building on any part of it requires written permission
from both authors. See [LICENSE](LICENSE) for the full terms.

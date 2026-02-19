# ResumeIQ - AI Powered Resume Analyzer & ATS Optimizer

Production-ready full-stack SaaS web app built with Next.js 14 (App Router), TypeScript, Tailwind CSS, ShadCN UI, Framer Motion, Firebase, and OpenAI.

## Features

- Google Sign-In with Firebase Auth
- Protected routes using Next.js middleware + secure session cookie
- Resume upload (PDF/DOCX) to Firebase Storage
- Resume metadata + reports stored in Firestore
- AI analysis with OpenAI:
  - ATS Score (0-100)
  - Keyword Match %
  - Skill Gap Analysis
  - Section-wise Feedback
  - Improvement Suggestions
- Weighted ATS scoring algorithm
- Dashboard with resume history
- Detailed report page with score breakdown
- PDF report download endpoint
- Responsive UI for mobile, tablet, desktop

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- ShadCN-style UI components
- Framer Motion
- Firebase Authentication / Firestore / Storage
- OpenAI API
- pdf-parse + mammoth
- Zod

## ATS Scoring Formula

```txt
ATS Score =
(keywordMatch * 0.30) +
(skillMatch * 0.25) +
(formattingScore * 0.15) +
(experienceScore * 0.20) +
(educationScore * 0.10)
```

Implemented in `lib/atsScoring.ts`.

## Project Structure

```txt
resumeiq/
  app/
    api/
      analyze/route.ts
      upload/route.ts
      resumes/route.ts
      auth/
        session/route.ts
        logout/route.ts
      report/
        [id]/download/route.ts
    dashboard/
      page.tsx
      loading.tsx
    login/page.tsx
    upload/page.tsx
    report/[id]/
      page.tsx
      loading.tsx
    globals.css
    layout.tsx
    not-found.tsx
    page.tsx
  components/
    AuthProvider.tsx
    Navbar.tsx
    ResumeCard.tsx
    ScoreChart.tsx
    ATSBreakdown.tsx
    LoadingSpinner.tsx
    LoginPageClient.tsx
    ui/
      badge.tsx
      button.tsx
      card.tsx
      input.tsx
      label.tsx
      progress.tsx
      select.tsx
      textarea.tsx
  lib/
    firebase.ts
    firebase-admin.ts
    auth-server.ts
    openai.ts
    atsScoring.ts
    resumeParser.ts
    resume-store.ts
    validations.ts
    constants.ts
    utils.ts
  types/
    index.ts
  middleware.ts
  firestore.rules
  storage.rules
  vercel.json
  .env.example
  package.json
```

## Firestore Collections

### `users`
- `uid`
- `name`
- `email`
- `photoURL`
- `createdAt`

### `resumes`
- `id`
- `userId`
- `fileUrl`
- `filePath`
- `fileName`
- `jobRole`
- `atsScore`
- `keywordMatch`
- `skillMatch`
- `formattingScore`
- `experienceScore`
- `educationScore`
- `feedback`
- `createdAt`
- `updatedAt`

## Setup Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Create Firebase Project

1. Go to Firebase Console.
2. Create a project.
3. Enable **Authentication > Sign-in method > Google**.
4. Create **Firestore Database** (production mode recommended).
5. Enable **Storage**.
6. In Project Settings > General, create a Web App and copy client keys.
7. In Project Settings > Service accounts, generate a private key JSON.

## 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill values:

```bash
cp .env.example .env.local
```

Required values:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, default: `gpt-4o-mini`)
- `SESSION_COOKIE_NAME` (optional, default: `session`)

For Firebase Admin credentials, use either:

- `FIREBASE_SERVICE_ACCOUNT_KEY` (full JSON as one line), or
- `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`

## 4. Apply Firebase Security Rules

- Firestore rules file: `firestore.rules`
- Storage rules file: `storage.rules`

Deploy from Firebase CLI:

```bash
firebase deploy --only firestore:rules,storage
```

## 5. Run Locally

```bash
npm run dev
```

App: `http://localhost:3000`

## 6. Production Build Check

```bash
npm run lint
npm run build
```

## 7. Deploy to Vercel

1. Push repo to GitHub.
2. Import project in Vercel.
3. Add all environment variables from `.env.local` into Vercel Project Settings.
4. Deploy.

## API Routes

- `POST /api/auth/session` - creates secure session cookie from Firebase ID token
- `POST /api/auth/logout` - clears session cookie
- `POST /api/upload` - uploads file to Firebase Storage and creates resume record
- `POST /api/analyze` - parses resume, calls OpenAI, computes ATS score, stores report
- `GET /api/resumes` - returns current user's resume history
- `GET /api/report/[id]/download` - generates downloadable PDF report

## Notes

- Upload limit currently set to 5MB in `lib/validations.ts`.
- Only PDF and DOCX are accepted.
- If Next.js build fails due missing envs in your environment, ensure `.env.local` is populated.
- For production, use HTTPS and secure cookies (already handled by `NODE_ENV=production`).

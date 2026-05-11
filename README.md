# Storyuu

> u direct. u connect.

Interactive serialized-fiction platform — read, listen, and vote on what happens next.

This repository contains the full-stack implementation: a React + Vite frontend (`/frontend`) and an Express + MongoDB backend (`/backend`).

## Status

Phase 0 — **Foundation**. Project scaffolding, brand tokens, MongoDB schemas, route map, and stubbed service integrations are in place. No business logic yet.

## Prerequisites

- Node.js 20+
- MongoDB 6+ (local or Atlas)
- npm 9+

## Getting started

```bash
# from repo root — installs root, backend, and frontend
npm run install:all

# copy env templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# run both apps concurrently
npm run dev
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:4000/api/health

## Layout

```
storyuu/
├── frontend/   # React + Vite + TypeScript + Tailwind + Zustand
└── backend/    # Express + TypeScript + Mongoose
```

## Build phases

| Phase | Scope |
|---|---|
| 0 | Foundation (this commit): tokens, schemas, routes, shells |
| 1 | Authentication (sign-up, login, password reset, JWT) |
| 2 | Subscriptions (Stripe Checkout + webhook + plan gating) |
| 3 | Content browsing (channels, stories, library, home) |
| 4 | Reader + audio player |
| 5 | Voting + polls |
| 6 | Marketing landing page (`/`) + legal pages |
| 7 | Admin panel + Super Admin |
| 8 | Notifications + polish |

See `Storyuu_Master_Prompt.pdf` and `Storyuu_Screen_Specification_1.pdf` for full requirements.

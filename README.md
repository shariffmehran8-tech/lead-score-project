# Lead Scoring Desk

AI-powered sales lead scoring. Instead of a trained ML classifier (which needs
historical won/lost outcome data that doesn't exist yet), this uses llms to
read each lead's attributes and behavior signals and reason out a 0-100 score,
tier, and recommended next action — the same way an experienced sales rep
would triage a list by gut feel, but explainable and consistent.

## Architecture

```
lead-scoring-app/
├── server/              Express API
│   ├── server.js         Routes: list/add/delete leads, trigger scoring
│   ├── leadScoring.js     Calls llms model, builds the scoring prompt
│   ├── data.json          Flat-file lead storage (no database)
│   └── .env.example
└── client/              Vite + React frontend
    └── src/
        ├── App.jsx        UI — lead cards, gauge, scoring flow
        └── main.jsx
```

## Setup

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
```

Open `.env` and add your  API key:

```
API_KEY=sk-ant-...
```

Get a key at https://console.com/settings/keys if you don't have one.

```bash
npm start
```

API runs on `http://localhost:4020`.

### 2. Frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Opens on `http://localhost:5180`.

## Using it

Three sample leads are pre-seeded. Click **"Score this lead"** on any card —
LLM model reads the notes and returns a score, tier (hot/warm/cold), reasoning,
key factors, and a recommended next step. Add your own leads with **"+ New
lead"**.

## Notes on the approach

- **Why LLM scoring, not a classifier:** with zero historical outcomes there's
  nothing to fit a model on. Once you've logged real won/lost data (aim for
  50-100+ scored leads with known outcomes), you can train a real classifier
  and use this LLM version as a fallback or as an explainability layer on
  top of it.
- **Field names** used in `leadScoring.js`'s prompt (`company`, `industry`,
  `dealSize`, `source`, `notes`) are isolated in `buildPrompt()` so you can
  adapt them to a different lead schema without touching the rest of the app.
- **Storage** is a flat `data.json` file, no database.

## Deploying for a portfolio

- Backend: Render, Railway, or Fly.io all have free tiers that work well for
  a small Express app like this. Set `API_KEY` as an environment
  variable there, not in a committed `.env`.
- Frontend: `npm run build` in `client/`, then deploy the `dist/` folder to
  Vercel, Netlify, or GitHub Pages. Update `API_BASE` in `App.jsx` to point
  at your deployed backend URL before building.

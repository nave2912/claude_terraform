# Chatbot Frontend

A minimal static chat widget — no build step, no framework. It never accepts
free-text natural language: every question it asks is generated from
`GET /schema-info` (which mirrors `models/schema/*.schema.json`), so a user
can only submit values the schema already allows. This is deliberately
separate from `POST /chat` / `POST /propose` (the free-text, LLM-parsed
path) — this UI only talks to `/schema-info`, `/preview-structured`, and
`/propose-structured`.

## Run locally

1. Start the backend first (see `../backend/README.md`), e.g.:
   ```
   set API_KEY=chatbot-dev-key
   npm run serve --prefix ../backend
   ```
2. Open `index.html` directly in a browser (double-click it, or
   `start index.html` on Windows) — no server needed for the frontend
   itself, it's plain HTML/CSS/JS making `fetch()` calls.
3. In the "API base URL" / "API key" bar, confirm the URL matches where the
   backend is listening (default `http://localhost:3000`) and enter the same
   `API_KEY` value the backend was started with, then click **Connect**.
4. Answer the bot's questions (resource type → environment → key → each
   required schema field). At the end it previews the exact JSON that would
   be written, then **Open pull request** runs the same
   branch → commit → push → PR pipeline as `npm run propose`.

## Why fixed-schema instead of free text

The CLI/API's `/chat` and `/propose` routes accept natural language and use
Claude to parse it into structured fields — flexible, but the shape of what
a user can ask for is only as constrained as the system prompt. This UI
takes the opposite tradeoff: it only ever offers inputs the JSON Schema
already defines (dropdowns for `enum` fields, text inputs with pattern
hints for the rest), so there's no LLM call and no ambiguity to resolve.
Both paths end up going through the same PR review + CI/CD gate before
anything reaches Azure.

## Adding a new resource type

Nothing in `app.js` mentions "resource group" — it walks whatever
`GET /schema-info` returns. Add a new `models/schema/<type>.schema.json` +
module on the backend and this form picks it up automatically.

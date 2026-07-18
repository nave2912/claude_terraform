# Chatbot Backend

Phase 2 of `chatbot/docs/chatbot-architecture.md`: parses natural language
into a schema-valid JSON model change, entirely offline-testable. Does not
yet talk to git/GitHub or Azure — see the architecture doc for what's next.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY for real LLM calls
```

## Test (no LLM calls, no network)

```bash
npm test
```

## Try it

Offline smoke test (canned proposal, zero network calls):
```bash
npm run cli -- --mock
```

Real request (requires `ANTHROPIC_API_KEY`):
```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run cli -- "create a resource group for the analytics team in qa, owner platform-team, cost center CC-AN-001"
```

Neither mode writes to disk or touches git — both only print what *would*
be written, for review. See `chatbot/docs/chatbot-architecture.md` for the
full pipeline this feeds into once `gitprovider/` (Phase 3) exists.

## Layout

| Path | Purpose |
|---|---|
| `src/config/` | Path resolution + dynamic schema registry (reads `models/schema/*.schema.json`) |
| `src/validators/` | Ajv-based validation, mirrors `tests/policy/validate_models.py` |
| `src/intent/` | Claude prompt/tool definitions + API client |
| `src/modelwriter/` | Pure merge function: existing model file + new entry → merged content |
| `src/cli/` | Offline test harness |
| `src/api/`, `src/gitprovider/`, `src/pipeline/`, `src/auth/` | Not yet implemented — Phase 3+ |

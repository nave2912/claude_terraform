# Prompt Design

## Contract

The system prompt and tool definitions (`backend/src/intent/promptBuilder.ts`)
are generated entirely from `models/schema/*.schema.json` at request time —
no resource type name ever appears as a literal string in this file's logic.
The one hardcoded thing is the list of valid environments (`dev`, `qa`,
`prod`), since that's a property of the framework, not of any one schema.

For each schema file, the prompt includes:
- the schema's `description`/`title`
- the per-entry `required` fields, with their own `description` if present

This means: **the moment a new `models/schema/<x>.schema.json` +
`modules/<x>/` pair exists, Claude can propose changes for it** — see
`docs/json-model-guide.md` in the repo root for the schema authoring
convention this depends on (one top-level container-key property per
schema file).

## Tools

Two tools, forced via Claude's tool-use:

1. **`propose_infrastructure_change`** — `{resource_type, environment, key,
   fields}`. `fields` is intentionally typed as a loose `object` in the tool
   schema (Claude's tool-use JSON Schema doesn't cleanly express "validate
   against whichever schema `resource_type` selects"); the real validation
   happens after the call, in `validators.validateEntry()`, against the
   actual per-resource schema. Treat the tool schema as a coarse filter and
   the post-call validation as the real gate.

2. **`request_clarification`** — `{question}`. The system prompt explicitly
   instructs Claude to use this instead of guessing at `owner`,
   `costCenter`, or `dataClassification` when the request doesn't supply
   them. Never silently defaults these — they're compliance-relevant tags
   (see `policies/naming-tagging-standard.md`).

## Known limitations (acceptable for Phase 2, revisit before Phase 6)

- No conversation memory beyond what the caller passes in `history` —
  multi-turn clarification works within one `parseIntent()` call chain, but
  the CLI/API layer is responsible for accumulating and replaying history.
- No environment-based access control in the prompt itself (e.g. nothing
  stops Claude from proposing a `prod` change if asked) — this is
  deliberate: the `ALLOWED_ENVIRONMENTS` gate belongs in the API layer
  (Phase 3+), not the prompt, since prompts are not a reliable enforcement
  boundary. See `chatbot-architecture.md`'s missing-practices list.
- No rate limiting or cost controls on the Anthropic call — flagged in
  `ARCHITECTURE.md`-style missing-practices list in the main planning doc.

## Testing without burning API calls

`validators.test.ts` covers the validation logic with zero LLM calls. When
testing prompt changes, prefer a small manual smoke test
(`npm run cli -- "<message>"`) over adding LLM-dependent tests to the
default `npm test` run — keep CI fast and deterministic per the plan's
verification approach.

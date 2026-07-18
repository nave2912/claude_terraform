# Chatbot Architecture

See the root [`ARCHITECTURE.md`](../../ARCHITECTURE.md) for the Terraform
framework this sits on top of. This document covers only the chatbot layer.

## Scope

The chatbot's entire job is: **understand a natural-language request →
produce a schema-valid JSON diff → open a pull request → report status.**
It never runs `terraform`, never authenticates to Azure, and never merges or
approves anything. All of that stays exactly where it already is — in
`pipelines/github-actions/terraform.yml` and GitHub's branch/environment
protection rules.

## Current status: Phase 2 (parse → validate → merge, offline)

Implemented in `backend/src/`:

- `config/schemaRegistry.ts` — enumerates `models/schema/*.schema.json` at
  runtime. This is the single mechanism that keeps every other module
  resource-type-agnostic: adding a new module + schema (e.g.
  `storage-account`, already present) requires zero code changes here.
- `validators/` — validates a candidate entry or a full model file against
  its schema, using the same `jsonschema`-equivalent semantics as
  `tests/policy/validate_models.py` (Ajv instead of Python's `jsonschema`,
  same Draft-07 contract).
- `intent/` — builds the Claude system prompt and tool definitions
  dynamically from the schema registry (see `prompt-design.md`), calls the
  Anthropic API, and validates whatever Claude proposes before returning it.
- `modelwriter/` — merges a validated entry into
  `models/<env>/<resource-type>.json`. Pure function: given existing file
  content + a new entry, returns the merged content. Never writes to disk
  itself — that's the future `gitprovider/`'s job (Phase 3), so a PR is
  always the audit trail, never a direct write.
- `cli/chat.ts` — offline test harness. `npm run cli -- --mock` exercises
  the full validate→merge loop with a canned proposal and zero network
  calls; `npm run cli -- "<message>"` exercises the real Claude call but
  still never writes to disk or touches git.

## Not yet built

- `gitprovider/` (Phase 3) — GitHub App-based branch/commit/PR creation,
  `models/dev/*.json` only initially.
- `pipeline/` (Phase 4) — polls PR checks and the apply workflow, summarizes
  back into chat.
- `auth/` (Phase 5) — Entra ID SSO for the web widget; Key Vault +
  Managed Identity for the Claude API key and GitHub App credentials.
- `frontend/` and `infra/` (Phase 5-6) — currently placeholder directories;
  see their own READMEs.

## Why the chatbot never writes files or calls git directly today

Every proposal is validated in-process and printed, not persisted. This
means Phase 2 can be fully tested and iterated on (prompt tuning, schema
edge cases) without any GitHub credentials, Azure credentials, or risk of
touching a real model file — the exact same safety principle carried
forward into Phase 3, where writes only ever happen as a PR, never a direct
commit to `main`.

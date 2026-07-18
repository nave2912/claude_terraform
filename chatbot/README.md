# Chatbot

A conversational front-end for the Terraform landing zone in the repo root.
Turns a natural-language request into a schema-valid change to
`models/<env>/*.json`, submitted as a pull request that flows through the
**existing, unmodified** CI/CD pipelines — the chatbot never runs
`terraform`, never authenticates to Azure, and never merges or applies
anything. See [`docs/chatbot-architecture.md`](docs/chatbot-architecture.md)
for the full design and current build status.

| Directory | Status |
|---|---|
| [`backend/`](backend/) | Phase 2 built — parse → validate → merge, fully offline-testable |
| [`frontend/`](frontend/) | Placeholder — Phase 5 |
| [`infra/`](infra/) | Placeholder — Phase 6 |
| [`docs/`](docs/) | Architecture + prompt design |

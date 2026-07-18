# Chatbot Infra — Placeholder

Not yet built. This will hold Terraform for the chatbot's *own* hosting
(Azure Container Apps for the backend, Azure Static Web Apps for the
frontend, one Key Vault for the Claude API key + GitHub App credentials
with the backend reading them via Managed Identity) — Phase 6 in the
approved plan.

Deliberately separate from `environments/{dev,qa,prod}`: this is platform
tooling that hosts the chatbot, not an AzureLearning workload modeled
through the JSON-model pattern. See `chatbot/docs/chatbot-architecture.md`.

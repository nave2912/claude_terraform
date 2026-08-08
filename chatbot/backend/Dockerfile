# Build context must be the repo root: docker build -f chatbot/backend/Dockerfile .
#
# The backend shells out to `git`/`gh` against a real checkout of THIS repo
# (models/*.json, modules/, environments/, schema files) — it's not just an
# API process, it reads and writes repo content. So the image bakes the
# compiled app + prod node_modules, and the entrypoint clones the actual
# GitHub repo into /workspace at container start and runs from inside that
# clone, so REPO_ROOT resolution (chatbot/backend/dist/config -> 4 levels up)
# lands on a real, fresh checkout every cold start.

# ---- build stage: compile TypeScript ----
FROM node:20-alpine AS build
WORKDIR /app
COPY chatbot/backend/package*.json ./
RUN npm ci
COPY chatbot/backend/tsconfig.json ./
COPY chatbot/backend/src ./src
RUN npm run build

# ---- runtime stage ----
FROM node:20-alpine
RUN apk add --no-cache git github-cli

# moduleScaffold/providerSchema.ts shells out to the real `terraform` CLI
# (init + providers schema -json) to source the azurerm provider's own
# machine-readable schema for /tfmodules and /terraform's scaffold-a-new-
# module path — without this binary, every scaffold request fails with a
# misleading "isn't a known azurerm resource type" (getProviderSchema's
# execFileSync throws ENOENT, which the caller was swallowing into that
# generic message regardless of cause; see the fixed catch blocks in
# pipeline/scaffoldModule.ts and scaffoldModulePlan.ts).
# Version pinned to match TF_VERSION in .github/workflows/main.yml —
# keep these in sync.
COPY --from=hashicorp/terraform:1.7.5 /bin/terraform /usr/local/bin/terraform

WORKDIR /app
COPY chatbot/backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

COPY chatbot/backend/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]

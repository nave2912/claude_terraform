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

WORKDIR /app
COPY chatbot/backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

COPY chatbot/backend/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]

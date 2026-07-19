# Build context must be the repo root: docker build -f chatbot/frontend/Dockerfile .
#
# The three env vars this app needs (BACKEND_BASE_URL, BACKEND_API_KEY,
# ANTHROPIC_API_KEY) are read at request time inside App Router server
# routes, not at build time — so they're supplied to the container at
# runtime (e.g. Container App secrets/env), never baked into this image.

# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY chatbot/frontend/package*.json ./
RUN npm ci

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY chatbot/frontend ./
RUN npm run build

# ---- runtime ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# next.config.ts sets output: "standalone" — this copies just the traced
# server bundle + static assets, not the full node_modules tree.
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]

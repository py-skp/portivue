# ---------- Build ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app

# make npm more resilient
RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-factor 2 \
    && npm config set fetch-timeout 60000

# ===== Build-time args with sane defaults =====
ARG BACKEND_ORIGIN=http://backend:8000
ARG NEXT_PUBLIC_BACKEND_ORIGIN=http://localhost:8000
ARG NEXT_PUBLIC_SCHEDULER_API=http://localhost:8001
ARG NEXT_PUBLIC_API=/api

# ===== Export them as ENV for Next.js build =====
ENV BACKEND_ORIGIN=$BACKEND_ORIGIN \
    NEXT_PUBLIC_BACKEND_ORIGIN=$NEXT_PUBLIC_BACKEND_ORIGIN \
    NEXT_PUBLIC_SCHEDULER_API=$NEXT_PUBLIC_SCHEDULER_API \
    NEXT_PUBLIC_API=$NEXT_PUBLIC_API \
    NEXT_TELEMETRY_DISABLED=1

# lockfile-based install
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* .npmrc* ./
RUN npm ci --no-audit --no-fund

# app sources
COPY . .
RUN mkdir -p public

# build next.js
RUN npm run build

# prune dev deps
RUN npm prune --omit=dev

# ---------- Run ----------
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

# Use the non-root 'node' user provided by the base image
USER node

# EXPOSE is largely informational
# The CMD uses the PORT env var if provided
CMD ["sh", "-c", "npm run start -- -p ${PORT:-3000}"]
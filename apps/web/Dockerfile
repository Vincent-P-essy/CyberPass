FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS dependencies

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN npm ci

FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS builder

WORKDIR /workspace

ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=dependencies /workspace/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/web ./apps/web
COPY packages ./packages
RUN npm --workspace @cyberpass/web run build

FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /workspace

COPY --from=builder --chown=node:node /workspace/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /workspace/apps/web/.next/static ./apps/web/.next/static

USER node

EXPOSE 3000

CMD ["node", "apps/web/server.js"]

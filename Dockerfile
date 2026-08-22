# Local Next.js dev image for Docker Compose (live reload).
# Usage: docker compose up --build   →  http://localhost:3000
# Host `npm run dev` still works without Docker.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine

RUN apk add --no-cache libc6-compat su-exec

WORKDIR /app

COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* .npmrc* ./

RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi \
    && chown -R node:node /app

COPY --chown=node:node . .

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]

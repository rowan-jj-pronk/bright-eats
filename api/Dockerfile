FROM node:22-bookworm-slim

WORKDIR /app/api

COPY api/package*.json ./
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && npm ci \
  && apt-get purge -y --auto-remove python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY api/tsconfig.json ./
COPY api/src ./src
COPY api/scripts ./scripts
COPY shared /app/shared

RUN DB_PATH=/app/seed/brighte-eats.sqlite node scripts/create-db.mjs

ENV DB_PATH=/data/brighte-eats.sqlite
ENV PORT=4000
EXPOSE 4000

CMD ["sh", "scripts/entrypoint.sh"]
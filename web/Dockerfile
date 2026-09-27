FROM node:22-bookworm-slim

WORKDIR /app/web

COPY web/package*.json ./
RUN npm ci

COPY web/index.html ./
COPY web/tsconfig.json web/vite.config.ts ./
COPY web/src ./src
COPY shared /app/shared

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
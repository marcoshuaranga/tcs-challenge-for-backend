FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
WORKDIR /app/apps/orders-worker
CMD ["node", "--import", "tsx/esm", "src/index.ts"]

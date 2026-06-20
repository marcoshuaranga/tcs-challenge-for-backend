FROM node:24-alpine
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
WORKDIR /app/apps/orders-api
EXPOSE 3000
CMD ["pnpm", "exec", "tsx", "src/index.ts"]

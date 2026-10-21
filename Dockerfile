FROM node:22.23.4-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
FROM node:22.23.4-alpine
WORKDIR /app
ENV HOST=0.0.0.0
COPY --from=build /app/dist ./dist
COPY server.mjs ./server.mjs
USER node
EXPOSE 4310
CMD ["node", "server.mjs"]

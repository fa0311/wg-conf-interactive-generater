FROM node:24 AS builder
WORKDIR /app
RUN npm install -g pnpm@10.30.0

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build


FROM node:24 AS runtime
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

ENTRYPOINT ["npm", "start"]
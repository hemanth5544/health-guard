FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json apps/backend/tsconfig.json ./apps/backend/
COPY packages/shared-types/package.json packages/shared-types/tsconfig.json ./packages/shared-types/
COPY packages/iam-evaluator/package.json packages/iam-evaluator/tsconfig.json ./packages/iam-evaluator/
COPY packages/tsconfig/package.json packages/tsconfig/base.json ./packages/tsconfig/

RUN pnpm install --frozen-lockfile=false

COPY apps/backend ./apps/backend
COPY packages ./packages

RUN pnpm --filter @healthguard/backend prisma:generate

EXPOSE 3000

CMD ["pnpm","--filter","@healthguard/backend","dev"]


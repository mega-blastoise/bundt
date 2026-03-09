FROM oven/bun:1.3-alpine AS base
WORKDIR /app

# Copy workspace root config
COPY package.json ./

# Copy only the packages playground depends on
COPY packages/prev/package.json packages/prev/package.json
COPY packages/prev/src/ packages/prev/src/
COPY packages/prev/dist/ packages/prev/dist/
COPY packages/prev/build/ packages/prev/build/
COPY packages/prev/tsconfig.json packages/prev/tsconfig.json
COPY packages/prev/tsconfig.build.json packages/prev/tsconfig.build.json

COPY internal/shared/ internal/shared/
COPY internal/build-utils/ internal/build-utils/

COPY websites/playground/ websites/playground/

# Install without lockfile since we only have a workspace subset
RUN bun install

WORKDIR /app/websites/playground
EXPOSE 3000
CMD ["bun", "run", "src/server.ts"]

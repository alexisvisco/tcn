FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY src ./src
COPY data ./data

# Build with "bun" target to support Node.js builtins
RUN bun build ./src/app.ts --outdir ./dist --target bun

EXPOSE 3000

ENTRYPOINT ["bun", "run", "dist/app.js"]

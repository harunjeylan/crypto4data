# Stage 1: Install dependencies and build
FROM node:lts-alpine3.21 AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.10.0 --activate

# Set work directory
WORKDIR /usr/src/app

# Copy only necessary files for dependency installation
COPY ./pnpm-lock.yaml ./package.json ./

# Install dependencies for the workspace
RUN pnpm install --frozen-lockfile

# Copy remaining source code
COPY ./public ./public
COPY ./src ./src
COPY ./tailwind.config.ts ./tailwind.config.ts
COPY ./tsconfig.json ./tsconfig.json
COPY ./next.config.ts ./next.config.ts
COPY ./postcss.config.mjs ./postcss.config.mjs
COPY ./server.js ./server.js

# Build the application
RUN pnpm build

# Stage 2: Production image
FROM node:lts-alpine3.21 AS production

# Install shadow for user management and create non-root user
RUN apk add --no-cache shadow && addgroup -S appgroup && adduser -S appuser -G appgroup

# Set working directory
WORKDIR /usr/src/app

# Copy built application and runtime dependencies
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/tailwind.config.ts ./tailwind.config.ts
COPY --from=builder /usr/src/app/tsconfig.json ./tsconfig.json
COPY --from=builder /usr/src/app/next.config.ts ./next.config.ts
COPY --from=builder /usr/src/app/postcss.config.mjs ./postcss.config.mjs
COPY --from=builder /usr/src/app/server.js ./server.js
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Adjust ownership of all files to appuser:appgroup
RUN chown -R appuser:appgroup /usr/src/app

# Switch to non-root user
USER appuser

# Expose the port (server.js uses MAIN_CLIENT_PORT or defaults to 3001)
EXPOSE 3060

# Start the custom server
CMD ["node", "server.js"]
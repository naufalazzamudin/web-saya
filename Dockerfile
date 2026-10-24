# ==============================================================================
# HOTEL IT INVENTORY MANAGEMENT - MULTI-STAGE DOCKERFILE
# Deployable to Docker, VPS, Render, Railway, Kubernetes, AWS, GCP, etc.
# ==============================================================================

# STAGE 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build frontend bundle
COPY . .
RUN npm run build

# STAGE 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies and tsx for execution
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy server code and source utilities
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/vite.config.ts ./

# Create persistent data and uploads directory with proper permissions
RUN mkdir -p /app/data/uploads && chown -R node:node /app

# Switch to non-privileged user for security
USER node

# Expose port (default 3000, overrideable via PORT env variable)
EXPOSE 3000

# Volume for data persistence across container restarts
VOLUME ["/app/data"]

# Container healthcheck using our built-in /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-3000}/api/health || exit 1

# Start server
CMD ["node", "--import", "tsx", "server.ts"]

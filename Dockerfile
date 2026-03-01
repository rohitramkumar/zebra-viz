# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build the app (client and server)
RUN npm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* ./

# Install all dependencies (including dev, since vite is bundled)
RUN npm ci

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data

# Expose the port
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Start the server
CMD ["node", "dist/index.js"]
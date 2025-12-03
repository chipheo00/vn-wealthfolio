# Wealthfolio Documentation Docker Image
# Local development and production documentation server

FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace and documentation package files
COPY ../../package*.json ./
COPY ../../pnpm-workspace.yaml ./
COPY ../../pnpm-lock.yaml ./
COPY ./package.json ./docs/docusaurus/package.json

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code for API generation
COPY ../../src ./src
COPY ../../src-tauri ./src-tauri
COPY ../../src-server ./src-server
COPY ../../src-core ./src-core
COPY ../../packages ./packages
COPY ../../docs ./docs

# Copy Docusaurus source (from current context)
COPY . ./docs/docusaurus

# Set working directory to docs/docusaurus
WORKDIR /app/docs/docusaurus

# Build documentation
RUN pnpm build

# Change back to root for serving
WORKDIR /app

# Expose port for documentation server
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the documentation server
CMD ["pnpm", "docs:serve"]

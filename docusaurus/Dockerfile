# Wealthfolio Documentation Docker Image
# Local development and production documentation server

FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy docs package files (docs is standalone)
COPY ./package.json ./
COPY ./.npmrc ./

# Install docs dependencies
RUN pnpm install

# Copy docs content
COPY . ./

# Build documentation
RUN pnpm build

# Expose port for documentation server
EXPOSE 3010

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3010/ || exit 1

# Start the documentation server
CMD ["pnpm", "serve", "--port", "3010", "--host", "0.0.0.0"]

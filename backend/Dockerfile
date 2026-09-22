FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDeps so tsc is available)
RUN npm ci

# Copy source
COPY . .

# Compile TypeScript
RUN npm run build

# Remove devDependencies after build to keep image lean
RUN npm prune --production

EXPOSE 3001

CMD ["node", "dist/index.js"]

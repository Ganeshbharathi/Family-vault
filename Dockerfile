FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean npm cache and install with legacy-peer-deps to avoid arborist edgesOut bug
RUN npm install --legacy-peer-deps

# Copy application source
COPY . .

# Build the frontend assets
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npx", "tsx", "server.ts"]

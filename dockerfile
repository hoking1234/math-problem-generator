# === Stage 1: Build ===
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all project files and build
COPY . .
RUN npm run build

# === Stage 2: Run (Production) ===
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy everything from the build stage
COPY --from=build /app ./

# Expose port
EXPOSE 3000

# Start the Next.js server
CMD ["npm", "start"]

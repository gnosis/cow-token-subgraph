
FROM node:lts as base

# Add package file
COPY package.json ./
COPY yarn.lock ./

# Install deps
RUN yarn install

# Copy source
COPY src ./src
COPY tsconfig.json ./tsconfig.json

# Build dist
RUN yarn build

# Start production image build
FROM node:lts-slim

# Copy node modules and build directory
COPY --from=base /dist /dist

# Expose port 8080
EXPOSE 8080
CMD ["dist/server.js"]
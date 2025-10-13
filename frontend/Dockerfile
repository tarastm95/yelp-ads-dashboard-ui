FROM node:18-alpine
WORKDIR /app

# Install dependencies
COPY package*.json bun.lockb ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

CMD ["sh", "-c", "if [ \"$NODE_ENV\" = 'development' ]; then npm start; else npx serve -s dist -l 3000; fi"]

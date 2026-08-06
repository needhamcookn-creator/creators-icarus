FROM mcr.microsoft.com/playwright:v1.50.1-noble

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

EXPOSE 3001 9222

ENV PORT=3001
ENV HEADLESS=true

CMD ["node", "dist/server.js"]

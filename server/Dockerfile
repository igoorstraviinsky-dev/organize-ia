# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Run
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist
# Copia o ecosystem se necessário para o container, embora o compose possa disparar o node direto
COPY ecosystem.config.js ./

EXPOSE 3001

CMD ["node", "dist/index.js"]

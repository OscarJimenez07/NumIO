# ===== Build stage =====
FROM node:20-alpine AS build
WORKDIR /app

# openssl: requerido por Prisma. python3/make/g++: requeridos para compilar bcrypt nativo.
RUN apk add --no-cache openssl python3 make g++

COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma ./prisma

RUN npm install

COPY src ./src

RUN npx prisma generate
# Mismo motivo que en el frontend: en 1 GB de RAM el compilador necesita un
# techo de memoria mayor que el que Node calcula solo.
RUN NODE_OPTIONS=--max-old-space-size=2560 npm run build

# ===== Runtime stage =====
FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/src/main.js"]

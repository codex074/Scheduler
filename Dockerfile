FROM node:20-bookworm-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/dev.db

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN chmod +x docker/entrypoint.sh
RUN npx prisma generate
RUN npx next build --webpack

ENV NODE_ENV=production

EXPOSE 3000

ENTRYPOINT ["./docker/entrypoint.sh"]

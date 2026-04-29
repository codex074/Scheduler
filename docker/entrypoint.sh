#!/bin/sh
set -eu

mkdir -p /app/data

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec npm start

#!/bin/sh
set -eu

node scripts/seed-runtime-db.mjs
exec npm run dev
#!/usr/bin/env node
// Mints a signed HS256 JWT for local development. Run via: pnpm token
import { createHmac } from 'node:crypto';

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('JWT_SECRET is not set. Run: pnpm token (which loads .env automatically)');
  process.exit(1);
}

const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(
  JSON.stringify({
    sub: 'demo-user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  }),
).toString('base64url');
const signature = createHmac('sha256', secret)
  .update(`${header}.${payload}`)
  .digest('base64url');

console.log(`Bearer ${header}.${payload}.${signature}`);

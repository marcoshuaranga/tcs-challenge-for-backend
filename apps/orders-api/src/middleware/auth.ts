import { jwt } from 'hono/jwt';

export function jwtAuth(secret: string) {
  return jwt({ secret, alg: 'HS256' });
}

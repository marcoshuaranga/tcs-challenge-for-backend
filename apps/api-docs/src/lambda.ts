import { handle } from 'hono/aws-lambda';
import { buildApp } from './app';

export const handler = handle(buildApp(process.env['API_URL']));

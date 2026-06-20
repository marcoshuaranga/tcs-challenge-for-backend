import { handle } from 'hono/aws-lambda';
import { makeDocsApp } from './app';

export const handler = handle(makeDocsApp());

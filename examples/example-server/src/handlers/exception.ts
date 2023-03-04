import type { Express } from 'express';
import { registerHttpApiHandler } from 'express-yaschema-api-handler';

import * as api from '../api';

export const register = (app: Express) =>
  registerHttpApiHandler(app, api.exception.POST, {}, async ({ express: _express, input, output: _output }) => {
    throw new Error(input.body.echo);
  });

import type { Express } from 'express';
import { registerHttpApiHandler } from 'express-yaschema-api-handler';
import { StatusCodes } from 'http-status-codes';

import * as api from '../api';

export const register = (app: Express) =>
  registerHttpApiHandler(app, api.arrayQuery.GET, {}, async ({ express: _express, input, output }) => {
    output.failure(StatusCodes.BAD_REQUEST, {
      body: input.query.values.map((v) => `(${typeof v}) ${String(v)}`).join(', ')
    });
  });

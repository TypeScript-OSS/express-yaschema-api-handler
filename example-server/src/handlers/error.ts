import type { Express } from 'express';
import { registerHttpApiHandler } from 'express-yaschema-api-handler';
import { StatusCodes } from 'http-status-codes';

import * as api from '../api';

export const register = (app: Express) => {
  registerHttpApiHandler(app, api.error.POST, {}, async ({ express: _express, input, output }) => {
    output.failure(StatusCodes.BAD_REQUEST, {
      headers: {},
      body: (input.body.echo?.length ?? 0) > 0 ? `PONG ${input.body.echo ?? ''}` : 'PONG'
    });
  });
};

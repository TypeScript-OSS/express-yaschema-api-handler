import bodyParser from 'body-parser';
import express from 'express';
import type * as http from 'http';
import { StatusCodes } from 'http-status-codes';
import { schema } from 'yaschema';
import { makeHttpApi, setDefaultUrlBase } from 'yaschema-api';
import { apiFetch } from 'yaschema-api-fetcher';

import { finalizeApiHandlerRegistrations } from '../register-api-handler/register-api-handler.js';
import { registerHttpApiHandler } from '../register-http-api-handler/register-http-api-handler.js';

const port = Number.parseInt(process.env.PORT ?? '8088');

const POST = makeHttpApi({
  method: 'POST',
  routeType: 'rest',
  url: '/ping',
  isSafeToRetry: true,
  schemas: {
    request: {
      body: schema.object({
        echo: schema.string().allowEmptyString().optional()
      })
    },
    successResponse: {
      status: schema.number(StatusCodes.OK),
      body: schema.string()
    }
  }
});

describe('Ping', () => {
  let server: http.Server | undefined;

  beforeAll(
    async () =>
      new Promise<void>((resolve, reject) => {
        const app = express();

        app.use(bodyParser.json({ type: 'application/json' }));

        registerHttpApiHandler(app, POST, {}, async ({ express: _express, input, output }) => {
          output.success(StatusCodes.OK, { body: (input.body.echo?.length ?? 0) > 0 ? `PONG ${input.body.echo ?? ''}` : 'PONG' });
        });

        finalizeApiHandlerRegistrations();

        try {
          server = app.listen(port, () => {
            console.log(`Example app listening on port ${port}`);

            resolve();
          });
        } catch (e) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject(e);
        }
      })
  );

  beforeAll(() => {
    setDefaultUrlBase(`http://localhost:${port}`);
  });

  afterAll(
    async () =>
      new Promise<void>((resolve, reject) => {
        if (server === undefined) {
          setTimeout(resolve, 0);
          return;
        }

        server.close((error) => {
          if (error !== undefined) {
            reject(error);
          } else {
            setTimeout(resolve, 0);
          }
        });
      })
  );

  it('should work', async () => {
    console.log('CALLING should work');
    const res = await apiFetch(POST, { body: { echo: 'Hello World' } });
    expect(res.ok).toBeTruthy();
    if (!res.ok) {
      return;
    }

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body).toBe('PONG Hello World');

    expect(true).toBe(true);
  });
});

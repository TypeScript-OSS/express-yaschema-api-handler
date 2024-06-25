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
  url: '/array-query',
  isSafeToRetry: true,
  schemas: {
    request: {
      query: schema.object({
        values: schema.array({
          items: schema.oneOf(schema.string('hello', 'world'), schema.number(1, 2, 3).setAllowedSerializationForms(['number', 'string']))
        })
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
          output.success(StatusCodes.OK, {
            body: `GOT ${input.query.values.length} values: ${input.query.values.map((v) => `(${typeof v}) ${v}`).join(', ')}`
          });
        });

        finalizeApiHandlerRegistrations();

        try {
          server = app.listen(port, () => {
            console.log(`Example app listening on port ${port}`);

            resolve();
          });
        } catch (e) {
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
    const res = await apiFetch(POST, { query: { values: ['hello', 1, 'world', 2, 3] as Array<'hello' | 'world' | 1 | 2 | 3> } });
    expect(res.ok).toBeTruthy();
    if (!res.ok) {
      return;
    }

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body).toBe('GOT 5 values: (string) hello, (number) 1, (string) world, (number) 2, (number) 3');

    expect(true).toBe(true);
  });
});

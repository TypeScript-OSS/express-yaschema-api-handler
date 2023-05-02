import bodyParser from 'body-parser';
import express from 'express';
import type * as http from 'http';
import { StatusCodes } from 'http-status-codes';
import nodeFetch from 'node-fetch';
import { schema } from 'yaschema';
import { makeHttpApi, setDefaultUrlBase } from 'yaschema-api';
import type { Fetch } from 'yaschema-api-fetcher';
import { apiFetch, setFetch } from 'yaschema-api-fetcher';

import { finalizeApiHandlerRegistrations } from '../register-api-handler/register-api-handler';
import { registerHttpApiHandler } from '../register-http-api-handler/register-http-api-handler';

const port = Number.parseInt(process.env.PORT ?? '8088');

const POST = makeHttpApi({
  method: 'POST',
  routeType: 'rest',
  url: '/send',
  isSafeToRetry: true,
  schemas: {
    request: {},
    successResponse: {
      status: schema.number(StatusCodes.OK)
    }
  }
});

describe('No Body', () => {
  let server: http.Server | undefined;

  beforeAll(
    async () =>
      new Promise<void>((resolve, reject) => {
        const app = express();

        app.use(bodyParser.json({ type: 'application/json' }));

        registerHttpApiHandler(app, POST, {}, async ({ express: _express, output }) => {
          output.success(StatusCodes.OK, {});
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
    setFetch(nodeFetch as Fetch);
  });

  afterAll(
    async () =>
      new Promise<void>((resolve, reject) => {
        if (server === undefined) {
          return resolve();
        }

        server.close((error) => {
          if (error !== undefined) {
            reject(error);
          } else {
            resolve();
          }
        });
      })
  );

  it('should work', async () => {
    const res = await apiFetch(POST, {});
    expect(res.ok).toBeTruthy();
    if (!res.ok) {
      return;
    }

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body).toBeUndefined();

    expect(true).toBe(true);
  });
});

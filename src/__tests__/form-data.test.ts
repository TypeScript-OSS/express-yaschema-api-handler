import 'fast-text-encoding'; // node-fetch 3 needs this polyfill in Node

import bodyParser from 'body-parser';
import express from 'express';
import type * as http from 'http';
import { StatusCodes } from 'http-status-codes';
import nodeFetch, { Blob, FormData } from 'node-fetch';
import { schema } from 'yaschema';
import { makeHttpApi, setDefaultUrlBase } from 'yaschema-api';
import type { BlobConstructor, Fetch } from 'yaschema-api-fetcher';
import { apiFetch, setBlobConstructor, setFetch, setFormDataConstructor } from 'yaschema-api-fetcher';

import { acceptFilesMiddlewares } from '../middleware/accept-files-middlewares';
import { finalizeApiHandlerRegistrations } from '../register-api-handler/register-api-handler';
import { registerHttpApiHandler } from '../register-http-api-handler/register-http-api-handler';

const port = Number.parseInt(process.env.PORT ?? '8088');

const POST = makeHttpApi({
  method: 'POST',
  routeType: 'rest',
  url: '/form',
  requestType: 'form-data',
  schemas: {
    request: {
      body: schema.object({
        one: schema.string(),
        two: schema.regex(/\d{8}-\d{4}/),
        three: schema.any(), // File
        four: schema.object({ a: schema.string() })
      })
    },
    successResponse: {
      status: schema.number(StatusCodes.OK),
      body: schema.string()
    }
  }
});

describe('Params', () => {
  let server: http.Server | undefined;

  beforeAll(
    async () =>
      new Promise<void>((resolve, reject) => {
        const app = express();

        app.use(bodyParser.json({ type: 'application/json' }));
        app.use(bodyParser.urlencoded({ extended: true }));

        registerHttpApiHandler(
          app,
          POST,
          { middlewares: acceptFilesMiddlewares({ three: 1 }) },
          async ({ express: _express, input, output }) => {
            const three = (input.body.three as Express.Multer.File[])[0];

            output.success(StatusCodes.OK, {
              body: `GOT ${input.body.one} AND ${input.body.two} AND file (${three.buffer.toString('utf-8')}) with length ${
                three.size
              } AND ${JSON.stringify(input.body.four)}`
            });
          }
        );

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
    setFormDataConstructor(FormData);
    setBlobConstructor(Blob as BlobConstructor);
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
    const res = await apiFetch(POST, {
      body: {
        one: 'hello',
        two: '12345678-9876',
        three: new Blob([Buffer.from('hi there', 'utf-8')]),
        four: { a: 'hi' }
      }
    });
    expect(res.ok).toBeTruthy();
    if (!res.ok) {
      return;
    }

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body).toBe('GOT hello AND 12345678-9876 AND file (hi there) with length 8 AND {"a":"hi"}');

    expect(true).toBe(true);
  });
});

import bodyParser from 'body-parser';
import express from 'express';
import type * as http from 'http';
import { StatusCodes } from 'http-status-codes';
import { schema } from 'yaschema';
import { makeHttpApi, setDefaultUrlBase } from 'yaschema-api';
import { apiFetch } from 'yaschema-api-fetcher';

import { acceptFilesMiddlewares } from '../middleware/accept-files-middlewares.js';
import { finalizeApiHandlerRegistrations } from '../register-api-handler/register-api-handler.js';
import { registerHttpApiHandler } from '../register-http-api-handler/register-http-api-handler.js';

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
        four: schema.object({ a: schema.string() }),
        five: schema.array(), // Files,
        six: schema.array({ items: schema.number() })
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
          { middlewares: acceptFilesMiddlewares({ three: 1, 'five[]': 2 }) },
          async ({ express: _express, input, output }) => {
            const three = (input.body.three as Express.Multer.File[])[0];
            const five = input.body.five as Express.Multer.File[];

            output.success(StatusCodes.OK, {
              body: `GOT ${input.body.one} AND ${input.body.two} AND file(three) (${three.buffer.toString('utf-8')}) with length ${
                three.size
              } AND ${JSON.stringify(input.body.four)} AND file(five[0]) (${five[0].buffer.toString('utf-8')}) with length ${five[0].size} AND file(five[1]) (${five[1].buffer.toString('utf-8')}) with length ${five[1].size} AND ${JSON.stringify(input.body.six)}`
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
    const res = await apiFetch(POST, {
      body: {
        one: 'hello',
        two: '12345678-9876',
        three: new Blob([Buffer.from('hi there', 'utf-8')]),
        four: { a: 'hi' },
        five: [new Blob([Buffer.from('hello world', 'utf-8')]), new Blob([Buffer.from('goodbye world', 'utf-8')])],
        six: [3.14, 2, -91.4]
      }
    });
    expect(res.ok).toBeTruthy();
    if (!res.ok) {
      return;
    }

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body).toBe(
      'GOT hello AND 12345678-9876 AND file(three) (hi there) with length 8 AND {"a":"hi"} AND file(five[0]) (hello world) with length 11 AND file(five[1]) (goodbye world) with length 13 AND [3.14,2,-91.4]'
    );

    expect(true).toBe(true);
  });
});

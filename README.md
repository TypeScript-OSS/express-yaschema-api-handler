# express-yaschema-api-handler

[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]

Express support for handling APIs declared using yaschema-api.

## Basic Example

```typescript
export const POST = makeHttpApi({
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

…

export const register = (app: Express) => {
  registerHttpApiHandler(app, POST, {}, async ({ express: _express, input, output }) => {
    output.success(200, { headers: {}, body: (input.body.echo?.length ?? 0) > 0 ? `PONG ${input.body.echo ?? ''}` : 'PONG' });
  });
};
```

## Thanks

Thanks for checking it out.  Feel free to create issues or otherwise provide feedback.

[API Docs](https://passfolio.github.io/express-yaschema-api-handler/)

Be sure to check out our other [Open Source @ Passfolio](https://github.com/Passfolio) projects as well.

<!-- Definitions -->

[downloads-badge]: https://img.shields.io/npm/dm/express-yaschema-api-handler.svg

[downloads]: https://www.npmjs.com/package/express-yaschema-api-handler

[size-badge]: https://img.shields.io/bundlephobia/minzip/express-yaschema-api-handler.svg

[size]: https://bundlephobia.com/result?p=express-yaschema-api-handler

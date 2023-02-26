import { StatusCodes } from 'http-status-codes';
import { schema } from 'yaschema';
import { makeHttpApi } from 'yaschema-api';

export const GET = makeHttpApi({
  method: 'GET',
  routeType: 'rest',
  url: '/array-query',
  isSafeToRetry: true,
  schemas: {
    request: {
      query: schema.object({
        values: schema.array({
          items: schema.oneOf3(
            schema.number().setAllowedSerializationForms(['number', 'string']),
            schema.boolean().setAllowedSerializationForms(['boolean', 'string']),
            schema.string()
          )
        })
      })
    },
    successResponse: {
      status: schema.number(StatusCodes.OK),
      body: schema.string()
    },
    failureResponse: {
      status: schema.number(StatusCodes.BAD_REQUEST),
      body: schema.string()
    }
  }
});

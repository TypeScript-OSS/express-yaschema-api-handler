import bodyParser from 'body-parser';
import express from 'express';
import { getAsyncHandlerWrapper, setAsyncHandlerWrapper } from 'express-yaschema-api-handler';

import * as handlers from './handlers';

const port = 8080;

const originalAsyncHandlerWrapper = getAsyncHandlerWrapper();
setAsyncHandlerWrapper((handler) =>
  originalAsyncHandlerWrapper(async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (e) {
      console.error(e);
      throw e;
    }
  })
);

export const launchServer = () => {
  const app = express();

  app.use(bodyParser.json({ type: 'application/json' }));

  handlers.register(app);

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
};
launchServer();

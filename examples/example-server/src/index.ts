import bodyParser from 'body-parser';
import express from 'express';
import { finalizeApiHandlerRegistrations, getHttpApiHandlerWrapper, setHttpApiHandlerWrapper } from 'express-yaschema-api-handler';

import * as handlers from './handlers';

const port = 8080;

const originalAsyncHandlerWrapper = getHttpApiHandlerWrapper();
setHttpApiHandlerWrapper((handler) =>
  originalAsyncHandlerWrapper(async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (e) {
      console.error(e);
      throw e;
    }
  })
);

export const launchServer = async () => {
  const app = express();

  app.use(bodyParser.json({ type: 'application/json' }));

  await handlers.register(app);

  finalizeApiHandlerRegistrations();

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
};
launchServer();

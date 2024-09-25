import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export type HttpApiHandlerWrapper = (handler: AsyncRequestHandler) => AsyncRequestHandler;

let globalHttpApiHandlerWrapper: HttpApiHandlerWrapper =
  (handler: AsyncRequestHandler): AsyncRequestHandler =>
  async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (_e) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Internal server error');
    }
  };

export const getHttpApiHandlerWrapper = () => globalHttpApiHandlerWrapper;

export const setHttpApiHandlerWrapper = (wrapper: HttpApiHandlerWrapper) => {
  globalHttpApiHandlerWrapper = wrapper;
};

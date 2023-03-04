import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;

type HttpApiHandlerWrapper = (handler: AsyncRequestHandler) => AsyncRequestHandler;

let globalHttpApiHandlerWrapper: HttpApiHandlerWrapper =
  (handler: AsyncRequestHandler): AsyncRequestHandler =>
  async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (e) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Internal server error');
    }
  };

export const getHttpApiHandlerWrapper = () => globalHttpApiHandlerWrapper;

export const setHttpApiHandlerWrapper = (wrapper: HttpApiHandlerWrapper) => {
  globalHttpApiHandlerWrapper = wrapper;
};

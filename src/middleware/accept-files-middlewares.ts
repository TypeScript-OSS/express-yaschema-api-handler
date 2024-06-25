import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import multer from 'multer';

export const acceptFilesMiddlewares = (maxCountsByField: Record<string, number>, multerOptions?: multer.Options): RequestHandler[] => [
  multer(multerOptions).fields(Object.entries(maxCountsByField).map(([key, value]) => ({ name: key, maxCount: value }))),
  mapMulterFilesIntoRequestBodyMiddleware
];

// Helpers

const mapMulterFilesIntoRequestBodyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.body === null) {
    req.body = {};
  } else if (typeof req.body !== 'object') {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send('Internal server error');
    return;
  }

  // Purposely mis-typing body here because fields unrelated to files may be other types, but we don't care about those here
  const bodyObj = req.body as Record<string, Express.Multer.File[]>;

  if (Array.isArray(req.files)) {
    for (const file of req.files) {
      bodyObj[file.fieldname] = bodyObj[file.fieldname] ?? [];
      bodyObj[file.fieldname].push(file);
    }
  } else if (req.files !== undefined) {
    for (const [key, files] of Object.entries(req.files)) {
      bodyObj[key] = files;
    }
  }

  if (req.file !== undefined) {
    const file = req.file;
    bodyObj[file.fieldname] = bodyObj[file.fieldname] ?? [];
    bodyObj[file.fieldname].push(file);
  }

  next();
  return;
};

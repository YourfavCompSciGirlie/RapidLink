import type { ErrorResponse } from '@rapidlink/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';

import { HttpError } from '../lib/http-error.js';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new HttpError(404, 'NOT_FOUND', `Route ${request.method} ${request.path} was not found`));
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const isHttpError = error instanceof HttpError;
  const statusCode = isHttpError ? error.statusCode : 500;
  const body: ErrorResponse = {
    error: {
      code: isHttpError ? error.code : 'INTERNAL_SERVER_ERROR',
      message: isHttpError ? error.message : 'An unexpected error occurred',
    },
  };

  response.status(statusCode).json(body);
};

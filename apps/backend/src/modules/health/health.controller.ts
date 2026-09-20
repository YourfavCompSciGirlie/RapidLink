import type { HealthResponse } from '@rapidlink/shared';
import type { RequestHandler } from 'express';

export const getHealth: RequestHandler = (_request, response) => {
  const body: HealthResponse = {
    status: 'ok',
    service: 'rapidlink-api',
    timestamp: new Date().toISOString(),
  };

  response.status(200).json(body);
};

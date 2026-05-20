import type { RequestHandler } from 'express';
import { AppError } from './errorHandler';
import { verifyAccessToken } from '../utils/jwt';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  try {
    req.user = verifyAccessToken(header.slice('Bearer '.length));
    return next();
  } catch {
    return next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
};

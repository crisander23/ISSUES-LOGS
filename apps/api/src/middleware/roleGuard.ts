import type { RequestHandler } from 'express';
import { UserRole } from '@prisma/client';
import { AppError } from './errorHandler';

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }

    if (req.user.role === UserRole.UNASSIGNED) {
      return next(new AppError('Your account is pending approval by your Admin', 403, 'PENDING_APPROVAL'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN'));
    }

    return next();
  };
}

import { Router } from 'express';
import { env } from '../config/env';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import * as authService from '../services/auth.service';

const router = Router();

function setRefreshCookie(res: import('express').Response, token: string, expiresAt: Date) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
    path: '/api/auth',
  });
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const data = await authService.register(req.body);
    res.status(201).json({ success: true, data });
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = await authService.login(req.body);
    setRefreshCookie(res, data.refreshToken, data.refreshExpiresAt);
    res.json({
      success: true,
      data: {
        accessToken: data.accessToken,
        pendingApproval: data.pendingApproval,
        user: data.user,
      },
    });
  }),
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await authService.logout(req.cookies?.refreshToken);
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ success: true, data: { message: 'Logged out' } });
  }),
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const data = await authService.refresh(req.cookies?.refreshToken);
    setRefreshCookie(res, data.refreshToken, data.refreshExpiresAt);
    res.json({
      success: true,
      data: {
        accessToken: data.accessToken,
        pendingApproval: data.pendingApproval,
        user: data.user,
      },
    });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = await authService.me(req.user!.userId);
    res.json({ success: true, data });
  }),
);

router.get(
  '/verify-email',
  asyncHandler(async (req, res) => {
    await authService.verifyEmail(String(req.query.token ?? ''));
    res.redirect(`${env.APP_URL}/login?verified=true`);
  }),
);

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const data = await authService.forgotPassword(req.body);
    res.json({ success: true, data });
  }),
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body);
    res.json({ success: true, data: { message: 'Password has been reset' } });
  }),
);

router.get(
  '/invite/:token',
  asyncHandler(async (req, res) => {
    const data = await authService.getInvite(req.params.token);
    res.json({ success: true, data });
  }),
);

router.post(
  '/invite/:token/accept',
  asyncHandler(async (req, res) => {
    const data = await authService.acceptInvite(req.params.token, req.body);
    setRefreshCookie(res, data.refreshToken, data.refreshExpiresAt);
    res.status(201).json({
      success: true,
      data: {
        accessToken: data.accessToken,
        user: data.user,
      },
    });
  }),
);

export default router;

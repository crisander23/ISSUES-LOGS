import crypto from 'crypto';
import { Router } from 'express';
import { InviteStatus, UserRole } from '@prisma/client';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../utils/asyncHandler';
import { sendBestEffortEmail } from '../services/email.service';

const router = Router();
router.use(requireAuth, requireRole(UserRole.ADMIN, UserRole.QA, UserRole.DEV));

const memberSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  role: true,
  isActive: true,
  isEmailVerified: true,
  createdAt: true,
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const members = await prisma.user.findMany({
      where: { organizationId: req.user!.orgId },
      select: memberSelect,
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ success: true, data: members });
  }),
);

router.post(
  '/invite',
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const data = z.object({ email: z.string().email(), role: z.enum([UserRole.ADMIN, UserRole.QA, UserRole.DEV]) }).parse(req.body);
    const token = crypto.randomBytes(32).toString('hex');
    const invite = await prisma.invite.create({
      data: {
        email: data.email.toLowerCase(),
        role: data.role,
        token,
        organizationId: req.user!.orgId,
        invitedById: req.user!.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await sendBestEffortEmail({
      organizationId: req.user!.orgId,
      to: invite.email,
      type: 'invite',
      subject: 'You were invited to 2DOC Issues Log',
      heading: 'Join your project workspace',
      preview: 'Accept your invitation to 2DOC Issues Log.',
      body: `<p>You have been invited as ${invite.role}. This invitation expires in 7 days.</p>`,
      action: { label: 'Accept invite', href: `${env.APP_URL}/invite/${invite.token}` },
    });

    res.status(201).json({ success: true, data: invite });
  }),
);

router.get(
  '/invites',
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const invites = await prisma.invite.findMany({
      where: { organizationId: req.user!.orgId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: invites });
  }),
);

router.post(
  '/invites/:id/resend',
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const invite = await prisma.invite.findFirst({ where: { id: req.params.id, organizationId: req.user!.orgId } });
    if (!invite) throw new AppError('Invite not found', 404, 'INVITE_NOT_FOUND');
    await sendBestEffortEmail({
      organizationId: req.user!.orgId,
      to: invite.email,
      type: 'invite',
      subject: 'Reminder: accept your 2DOC Issues Log invite',
      heading: 'Your invite is waiting',
      preview: 'Accept your invitation to 2DOC Issues Log.',
      body: `<p>Your invitation as ${invite.role} is still available.</p>`,
      action: { label: 'Accept invite', href: `${env.APP_URL}/invite/${invite.token}` },
    });
    res.json({ success: true, data: { message: 'Invite resent' } });
  }),
);

router.delete(
  '/invites/:id',
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    await prisma.invite.updateMany({
      where: { id: req.params.id, organizationId: req.user!.orgId },
      data: { status: InviteStatus.Expired },
    });
    res.json({ success: true, data: { message: 'Invite cancelled' } });
  }),
);

router.patch(
  '/:id/role',
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.userId) {
      throw new AppError('You cannot change your own role', 400, 'SELF_ROLE_CHANGE');
    }

    const data = z.object({ role: z.enum([UserRole.ADMIN, UserRole.QA, UserRole.DEV]) }).parse(req.body);
    const target = await prisma.user.findFirst({ where: { id: req.params.id, organizationId: req.user!.orgId } });
    if (!target) throw new AppError('Member not found', 404, 'MEMBER_NOT_FOUND');

    const user = await prisma.user.update({
      where: { id: target.id },
      data: { role: data.role },
      select: memberSelect,
    });

    res.json({ success: true, data: user });
  }),
);

router.delete(
  '/:id',
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.userId) {
      throw new AppError('You cannot remove yourself', 400, 'SELF_REMOVE');
    }
    const result = await prisma.user.updateMany({
      where: { id: req.params.id, organizationId: req.user!.orgId },
      data: { isActive: false },
    });
    if (result.count === 0) throw new AppError('Member not found', 404, 'MEMBER_NOT_FOUND');
    res.json({ success: true, data: { message: 'Member removed' } });
  }),
);

export default router;

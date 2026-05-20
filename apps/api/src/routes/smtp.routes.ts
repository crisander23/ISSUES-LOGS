import { Router } from 'express';
import { SmtpEncryption, UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { asyncHandler } from '../utils/asyncHandler';
import { encrypt } from '../utils/crypto';
import { sendEmail } from '../services/email.service';

const router = Router();
router.use(requireAuth, requireRole(UserRole.ADMIN));

const smtpSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  encryption: z.nativeEnum(SmtpEncryption),
  username: z.string().min(1),
  password: z.string().min(1),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const smtp = await prisma.smtpConfig.findUnique({ where: { organizationId: req.user!.orgId } });
    if (!smtp) return res.json({ success: true, data: null });
    res.json({
      success: true,
      data: {
        ...smtp,
        passwordEncrypted: undefined,
        password: '********',
      },
    });
  }),
);

router.post(
  '/test',
  asyncHandler(async (req, res) => {
    const data = smtpSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });
    const temp = await prisma.smtpConfig.upsert({
      where: { organizationId: req.user!.orgId },
      update: { ...data, passwordEncrypted: encrypt(data.password), isVerified: false },
      create: { ...data, passwordEncrypted: encrypt(data.password), organizationId: req.user!.orgId, isVerified: false },
    });

    try {
      await sendEmail({
        organizationId: req.user!.orgId,
        to: user.email,
        type: 'smtp-test',
        subject: '2DOC Issues Log SMTP test',
        heading: 'SMTP test successful',
        preview: 'Your SMTP settings are working.',
        body: '<p>This confirms your SMTP configuration can send mail.</p>',
      });
      await prisma.smtpConfig.update({ where: { id: temp.id }, data: { isVerified: true } });
      res.json({ success: true, data: { message: 'SMTP test successful' } });
    } catch (error) {
      await prisma.smtpConfig.update({ where: { id: temp.id }, data: { isVerified: false } });
      throw error;
    }
  }),
);

router.post(
  '/save',
  asyncHandler(async (req, res) => {
    const data = smtpSchema.parse(req.body);
    const smtp = await prisma.smtpConfig.upsert({
      where: { organizationId: req.user!.orgId },
      update: { ...data, passwordEncrypted: encrypt(data.password), isVerified: true },
      create: { ...data, passwordEncrypted: encrypt(data.password), organizationId: req.user!.orgId, isVerified: true },
    });
    res.json({ success: true, data: { ...smtp, passwordEncrypted: undefined, password: '********' } });
  }),
);

router.delete(
  '/',
  asyncHandler(async (req, res) => {
    await prisma.smtpConfig.deleteMany({ where: { organizationId: req.user!.orgId } });
    res.json({ success: true, data: { message: 'SMTP configuration removed' } });
  }),
);

export default router;

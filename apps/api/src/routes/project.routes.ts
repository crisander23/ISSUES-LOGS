import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth, requireRole(UserRole.ADMIN, UserRole.QA, UserRole.DEV));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { organizationId: req.user!.orgId },
      include: { systems: { orderBy: { order: 'asc' } }, organization: true },
    });
    if (!project) throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    res.json({ success: true, data: project });
  }),
);

router.patch(
  '/',
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const data = z.object({ name: z.string().min(1).optional(), description: z.string().nullable().optional() }).parse(req.body);
    const project = await prisma.project.findUnique({ where: { organizationId: req.user!.orgId } });
    if (!project) throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    const updated = await prisma.project.update({ where: { id: project.id }, data });
    res.json({ success: true, data: updated });
  }),
);

router.get(
  '/activity',
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { organizationId: req.user!.orgId } });
    if (!project) throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    const logs = await prisma.activityLog.findMany({
      where: { user: { organizationId: req.user!.orgId } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    res.json({ success: true, data: logs });
  }),
);

export default router;

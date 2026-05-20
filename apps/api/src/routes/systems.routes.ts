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

async function getProjectId(orgId: string) {
  const project = await prisma.project.findUnique({ where: { organizationId: orgId } });
  if (!project) throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  return project.id;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const projectId = await getProjectId(req.user!.orgId);
    const systems = await prisma.system.findMany({ where: { projectId }, orderBy: { order: 'asc' } });
    res.json({ success: true, data: systems });
  }),
);

router.post(
  '/',
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const data = z.object({ name: z.string().min(1), order: z.number().int().optional() }).parse(req.body);
    const projectId = await getProjectId(req.user!.orgId);
    const system = await prisma.system.create({ data: { ...data, projectId } });
    res.status(201).json({ success: true, data: system });
  }),
);

router.patch(
  '/reorder',
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const data = z.object({ systems: z.array(z.object({ id: z.string(), order: z.number().int() })) }).parse(req.body);
    const projectId = await getProjectId(req.user!.orgId);
    await prisma.$transaction(
      data.systems.map((system) =>
        prisma.system.updateMany({ where: { id: system.id, projectId }, data: { order: system.order } }),
      ),
    );
    res.json({ success: true, data: { message: 'Systems reordered' } });
  }),
);

router.patch(
  '/:id',
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const data = z.object({ name: z.string().min(1).optional(), order: z.number().int().optional() }).parse(req.body);
    const projectId = await getProjectId(req.user!.orgId);
    const result = await prisma.system.updateMany({ where: { id: req.params.id, projectId }, data });
    if (result.count === 0) throw new AppError('System not found', 404, 'SYSTEM_NOT_FOUND');
    const system = await prisma.system.findUnique({ where: { id: req.params.id } });
    res.json({ success: true, data: system });
  }),
);

router.delete(
  '/:id',
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const projectId = await getProjectId(req.user!.orgId);
    const issueCount = await prisma.issue.count({ where: { systemId: req.params.id, projectId } });
    if (issueCount > 0) throw new AppError('Cannot remove a system with existing issues', 409, 'SYSTEM_HAS_ISSUES');
    const result = await prisma.system.deleteMany({ where: { id: req.params.id, projectId } });
    if (result.count === 0) throw new AppError('System not found', 404, 'SYSTEM_NOT_FOUND');
    res.json({ success: true, data: { message: 'System deleted' } });
  }),
);

export default router;

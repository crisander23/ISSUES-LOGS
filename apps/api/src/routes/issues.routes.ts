import { Router } from 'express';
import { IssueCategory, IssuePriority, IssueStatus, IssueType, Prisma, UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { AppError } from '../middleware/errorHandler';
import { asyncHandler } from '../utils/asyncHandler';
import { getPagination } from '../utils/pagination';
import { sendBestEffortEmail } from '../services/email.service';

const router = Router();
router.use(requireAuth, requireRole(UserRole.ADMIN, UserRole.QA, UserRole.DEV));

const issueInclude = {
  system: true,
  reportedBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
  closedBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
};

const createIssueSchema = z.object({
  description: z.string().min(1),
  category: z.nativeEnum(IssueCategory),
  priority: z.nativeEnum(IssuePriority).default(IssuePriority.P4),
  type: z.nativeEnum(IssueType).default(IssueType.SW),
  appModule: z.string().optional(),
  systemId: z.string().min(1),
  assignedToId: z.string().optional(),
  dateRaised: z.string().datetime().optional(),
});

const patchIssueSchema = createIssueSchema.partial().extend({
  status: z.nativeEnum(IssueStatus).optional(),
  remarks: z.string().nullable().optional(),
});

function requireUser(req: import('express').Request) {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user;
}

async function getProject(orgId: string) {
  const project = await prisma.project.findUnique({ where: { organizationId: orgId } });
  if (!project) throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
  return project;
}

async function generateTicketNumber(projectId: string): Promise<string> {
  const counter = await prisma.ticketCounter.upsert({
    where: { projectId },
    update: { count: { increment: 1 } },
    create: { projectId, count: 1 },
  });
  return `IF${String(counter.count).padStart(3, '0')}`;
}

router.get(
  '/export/csv',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const project = await getProject(user.orgId);
    const where = buildIssueWhere(req, project.id);
    const issues = await prisma.issue.findMany({
      where,
      include: issueInclude,
      orderBy: { createdAt: 'desc' },
    });

    const rows = [
      ['Ticket', 'Status', 'Category', 'Priority', 'Type', 'System', 'Module', 'Description', 'Resolution'],
      ...issues.map((issue) => [
        issue.ticketNumber,
        issue.status,
        issue.category,
        issue.priority,
        issue.type,
        issue.system.name,
        issue.appModule ?? '',
        issue.description,
        issue.resolution ?? '',
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    res.header('Content-Type', 'text/csv');
    res.attachment(`issues-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csv);
  }),
);

function buildIssueWhere(req: import('express').Request, projectId: string): Prisma.IssueWhereInput {
  const where: Prisma.IssueWhereInput = { projectId };
  if (req.query.status) where.status = req.query.status as IssueStatus;
  if (req.query.category) where.category = req.query.category as IssueCategory;
  if (req.query.system) where.systemId = String(req.query.system);
  if (req.query.q) {
    const q = String(req.query.q);
    where.OR = [
      { ticketNumber: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { appModule: { contains: q, mode: 'insensitive' } },
    ];
  }
  return where;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const project = await getProject(user.orgId);
    const { page, limit, skip } = getPagination(req.query);
    const where = buildIssueWhere(req, project.id);
    const [total, issues] = await prisma.$transaction([
      prisma.issue.count({ where }),
      prisma.issue.findMany({ where, include: issueInclude, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    ]);

    res.json({
      success: true,
      data: issues,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }),
);

router.post(
  '/',
  requireRole(UserRole.ADMIN, UserRole.QA),
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const data = createIssueSchema.parse(req.body);
    const project = await getProject(user.orgId);
    const system = await prisma.system.findFirst({ where: { id: data.systemId, projectId: project.id } });
    if (!system) throw new AppError('System not found', 404, 'SYSTEM_NOT_FOUND');

    const issue = await prisma.issue.create({
      data: {
        ...data,
        ticketNumber: await generateTicketNumber(project.id),
        dateRaised: data.dateRaised ? new Date(data.dateRaised) : undefined,
        projectId: project.id,
        reportedById: user.userId,
      },
      include: issueInclude,
    });

    await prisma.activityLog.create({
      data: {
        action: 'issue.created',
        description: `${issue.ticketNumber} was logged`,
        userId: user.userId,
        issueId: issue.id,
      },
    });

    res.status(201).json({ success: true, data: issue });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const project = await getProject(user.orgId);
    const issue = await prisma.issue.findFirst({
      where: { id: req.params.id, projectId: project.id },
      include: issueInclude,
    });
    if (!issue) throw new AppError('Issue not found', 404, 'ISSUE_NOT_FOUND');
    res.json({ success: true, data: issue });
  }),
);

router.patch(
  '/:id',
  requireRole(UserRole.ADMIN, UserRole.QA),
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const project = await getProject(user.orgId);
    const data = patchIssueSchema.parse(req.body);
    const existing = await prisma.issue.findFirst({ where: { id: req.params.id, projectId: project.id } });
    if (!existing) throw new AppError('Issue not found', 404, 'ISSUE_NOT_FOUND');

    const issue = await prisma.issue.update({
      where: { id: existing.id },
      data: {
        ...data,
        dateRaised: data.dateRaised ? new Date(data.dateRaised) : undefined,
      },
      include: issueInclude,
    });
    res.json({ success: true, data: issue });
  }),
);

router.patch(
  '/:id/resolve',
  requireRole(UserRole.DEV),
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const project = await getProject(user.orgId);
    const data = z
      .object({ resolution: z.string().min(1), dateSubmittedToQA: z.string().datetime().optional(), remarks: z.string().optional() })
      .parse(req.body);
    const existing = await prisma.issue.findFirst({ where: { id: req.params.id, projectId: project.id } });
    if (!existing) throw new AppError('Issue not found', 404, 'ISSUE_NOT_FOUND');

    const issue = await prisma.issue.update({
      where: { id: existing.id },
      data: {
        resolution: data.resolution,
        remarks: data.remarks,
        assignedToId: user.userId,
        status: IssueStatus.Pending,
        dateSubmittedToQA: data.dateSubmittedToQA ? new Date(data.dateSubmittedToQA) : new Date(),
      },
      include: issueInclude,
    });

    await sendBestEffortEmail({
      organizationId: user.orgId,
      to: issue.reportedBy.email,
      type: 'issue-resolved',
      subject: `${issue.ticketNumber} is ready for QA`,
      heading: 'Issue resolved',
      preview: `${issue.ticketNumber} has been submitted to QA.`,
      body: `<p>${issue.ticketNumber} has been resolved and is ready for verification.</p>`,
      action: { label: 'Open issue', href: `${process.env.APP_URL ?? 'http://localhost:3000'}/board` },
    });

    res.json({ success: true, data: issue });
  }),
);

router.patch(
  '/:id/close',
  requireRole(UserRole.ADMIN, UserRole.QA),
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const project = await getProject(user.orgId);
    const data = z.object({ dateClosed: z.string().datetime().optional(), remarks: z.string().optional() }).parse(req.body);
    const existing = await prisma.issue.findFirst({ where: { id: req.params.id, projectId: project.id } });
    if (!existing) throw new AppError('Issue not found', 404, 'ISSUE_NOT_FOUND');
    const dateClosed = data.dateClosed ? new Date(data.dateClosed) : new Date();
    const daysOpen = Math.max(0, Math.ceil((dateClosed.getTime() - existing.dateRaised.getTime()) / 86400000));

    const issue = await prisma.issue.update({
      where: { id: existing.id },
      data: {
        status: IssueStatus.Closed,
        dateClosed,
        daysOpen,
        remarks: data.remarks,
        closedById: user.userId,
      },
      include: issueInclude,
    });
    res.json({ success: true, data: issue });
  }),
);

router.delete(
  '/:id',
  requireRole(UserRole.ADMIN),
  asyncHandler(async (req, res) => {
    const user = requireUser(req);
    const project = await getProject(user.orgId);
    const existing = await prisma.issue.findFirst({ where: { id: req.params.id, projectId: project.id } });
    if (!existing) throw new AppError('Issue not found', 404, 'ISSUE_NOT_FOUND');
    await prisma.issue.delete({ where: { id: existing.id } });
    res.json({ success: true, data: { message: 'Issue deleted' } });
  }),
);

export default router;

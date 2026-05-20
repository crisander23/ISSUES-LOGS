import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  await prisma.activityLog.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.system.deleteMany();
  await prisma.ticketCounter.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.user.deleteMany();
  await prisma.project.deleteMany();
  await prisma.smtpConfig.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: {
      name: 'Demo Organization',
      slug: 'demo-org',
      code: 'DEMO',
      description: 'Sample organization for development and testing',
    },
  });

  const project = await prisma.project.create({
    data: {
      name: 'Demo Project',
      description: 'Sample project for testing the issues log',
      organizationId: org.id,
    },
  });

  await prisma.ticketCounter.create({ data: { projectId: project.id, count: 4 } });

  const systemNames = ['Auth Module', 'Dashboard', 'Reports', 'User Management', 'Notifications'];
  const systems = await Promise.all(
    systemNames.map((name, i) => prisma.system.create({ data: { name, order: i, projectId: project.id } })),
  );

  const hash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      passwordHash: hash,
      firstName: 'Maria',
      lastName: 'Lopez',
      role: UserRole.ADMIN,
      isEmailVerified: true,
      organizationId: org.id,
    },
  });


  const qa = await prisma.user.create({
    data: {
      email: 'qa@demo.com',
      passwordHash: hash,
      firstName: 'Alice',
      lastName: 'Chen',
      role: UserRole.QA,
      isEmailVerified: true,
      organizationId: org.id,
    },
  });

  const dev = await prisma.user.create({
    data: {
      email: 'dev@demo.com',
      passwordHash: hash,
      firstName: 'Bob',
      lastName: 'Santos',
      role: UserRole.DEV,
      isEmailVerified: true,
      organizationId: org.id,
    },
  });

  const issuesData = [
    {
      ticketNumber: 'IF001',
      description: 'Login button unresponsive after failed password attempt',
      category: 'High' as const,
      priority: 'P1' as const,
      type: 'SW' as const,
      appModule: 'Login Page',
      status: 'Open' as const,
      systemId: systems[0].id,
      reportedById: qa.id,
      dateRaised: new Date(Date.now() - 12 * 86400000),
    },
    {
      ticketNumber: 'IF002',
      description: 'Widget counts are not refreshing in real-time',
      category: 'Medium' as const,
      priority: 'P2' as const,
      type: 'SW' as const,
      appModule: 'Overview Widget',
      status: 'Open' as const,
      systemId: systems[1].id,
      reportedById: qa.id,
      dateRaised: new Date(Date.now() - 8 * 86400000),
    },
    {
      ticketNumber: 'IF003',
      description: 'Export to CSV includes blank rows between data entries',
      category: 'Low' as const,
      priority: 'P3' as const,
      type: 'SW' as const,
      appModule: 'Export Panel',
      status: 'Pending' as const,
      resolution: 'Added a filter to strip empty rows before serialization',
      systemId: systems[2].id,
      reportedById: admin.id,
      assignedToId: dev.id,
      dateRaised: new Date(Date.now() - 14 * 86400000),
      dateSubmittedToQA: new Date(Date.now() - 3 * 86400000),
      remarks: 'Waiting for QA sign-off on edge cases',
    },
    {
      ticketNumber: 'IF004',
      description: 'Session token not invalidated on logout from other devices',
      category: 'Critical' as const,
      priority: 'P1' as const,
      type: 'SW' as const,
      appModule: 'Session Management',
      status: 'Closed' as const,
      resolution: 'Implemented global session revocation on logout event',
      systemId: systems[0].id,
      reportedById: qa.id,
      assignedToId: dev.id,
      closedById: qa.id,
      dateRaised: new Date(Date.now() - 45 * 86400000),
      dateSubmittedToQA: new Date(Date.now() - 35 * 86400000),
      dateClosed: new Date(Date.now() - 32 * 86400000),
      daysOpen: 13,
    },
  ];

  for (const data of issuesData) {
    await prisma.issue.create({ data: { ...data, projectId: project.id } });
  }

  console.log('Seed complete.');
  console.log('Demo accounts (password: Password123!):');
  console.log('  ADMIN: admin@demo.com');
  console.log('  QA:    qa@demo.com');
  console.log('  DEV:   dev@demo.com');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

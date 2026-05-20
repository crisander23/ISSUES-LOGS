import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { InviteStatus, UserRole } from '@prisma/client';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { sendBestEffortEmail } from './email.service';

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

export const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: passwordSchema,
  organizationCode: z.string().min(1).transform((value) => value.trim().toUpperCase()),
});

export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const acceptInviteSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: passwordSchema,
});

function publicUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  isEmailVerified: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    organizationId: user.organizationId,
    isEmailVerified: user.isEmailVerified,
  };
}

async function createRefreshToken(userId: string) {
  const token = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return { token, expiresAt };
}

export async function register(input: z.infer<typeof registerSchema>) {
  const data = registerSchema.parse(input);
  const organization = await prisma.organization.findUnique({ where: { code: data.organizationCode } });

  if (!organization) {
    throw new AppError('Organization code was not found', 404, 'ORG_NOT_FOUND');
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError('Email is already registered', 409, 'EMAIL_EXISTS');
  }

  const emailVerifyToken = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: UserRole.UNASSIGNED,
      organizationId: organization.id,
      emailVerifyToken,
      emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await sendBestEffortEmail({
    organizationId: organization.id,
    to: user.email,
    type: 'verify-email',
    subject: 'Verify your 2DOC Issues Log account',
    heading: 'Verify your email address',
    preview: 'Finish creating your 2DOC Issues Log account.',
    body: '<p>Welcome to 2DOC Issues Log. Verify your email, then your Admin can approve your project access.</p>',
    action: {
      label: 'Verify email',
      href: `${env.API_URL}/api/auth/verify-email?token=${emailVerifyToken}`,
    },
  });

  return { message: 'Check your email to verify your account' };
}

export async function login(input: z.infer<typeof loginSchema>) {
  const data = loginSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new AppError('Account is inactive', 403, 'ACCOUNT_INACTIVE');
  }

  if (!user.isEmailVerified) {
    throw new AppError('Please verify your email before signing in', 403, 'EMAIL_NOT_VERIFIED');
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    orgId: user.organizationId,
    role: user.role,
  });
  const refreshToken = await createRefreshToken(user.id);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    accessToken,
    refreshToken: refreshToken.token,
    refreshExpiresAt: refreshToken.expiresAt,
    pendingApproval: user.role === UserRole.UNASSIGNED,
    user: publicUser(user),
  };
}

export async function logout(refreshToken?: string) {
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
}

export async function refresh(refreshToken?: string) {
  if (!refreshToken) {
    throw new AppError('Refresh token required', 401, 'REFRESH_REQUIRED');
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });
  const nextRefresh = await createRefreshToken(stored.userId);

  return {
    accessToken: generateAccessToken({
      userId: stored.user.id,
      orgId: stored.user.organizationId,
      role: stored.user.role,
    }),
    refreshToken: nextRefresh.token,
    refreshExpiresAt: nextRefresh.expiresAt,
    pendingApproval: stored.user.role === UserRole.UNASSIGNED,
    user: publicUser(stored.user),
  };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return {
    ...publicUser(user),
    organization: user.organization,
  };
}

export async function verifyEmail(token: string) {
  const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } });
  if (!user || !user.emailVerifyExpiry || user.emailVerifyExpiry < new Date()) {
    throw new AppError('Verification link is invalid or expired', 400, 'INVALID_VERIFY_TOKEN');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiry: null,
    },
  });
}

export async function forgotPassword(input: z.infer<typeof forgotPasswordSchema>) {
  const { email } = forgotPasswordSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { message: 'If an account exists, a reset email has been sent' };
  }

  const token = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await sendBestEffortEmail({
    organizationId: user.organizationId,
    to: user.email,
    type: 'forgot-password',
    subject: 'Reset your 2DOC Issues Log password',
    heading: 'Reset your password',
    preview: 'Use this link to set a new password.',
    body: '<p>You requested a password reset. This link expires in one hour.</p>',
    action: { label: 'Reset password', href: `${env.APP_URL}/reset-password?token=${token}` },
  });

  return { message: 'If an account exists, a reset email has been sent' };
}

export async function resetPassword(input: z.infer<typeof resetPasswordSchema>) {
  const data = resetPasswordSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { passwordResetToken: data.token } });

  if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
    throw new AppError('Reset link is invalid or expired', 400, 'INVALID_RESET_TOKEN');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(data.password, 12),
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });
}

export async function getInvite(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invite || invite.status !== InviteStatus.Pending || invite.expiresAt < new Date()) {
    throw new AppError('Invite is invalid or expired', 404, 'INVITE_NOT_FOUND');
  }

  return {
    email: invite.email,
    role: invite.role,
    organization: {
      name: invite.organization.name,
      code: invite.organization.code,
    },
  };
}

export async function acceptInvite(token: string, input: z.infer<typeof acceptInviteSchema>) {
  const data = acceptInviteSchema.parse(input);
  const invite = await prisma.invite.findUnique({ where: { token } });

  if (!invite || invite.status !== InviteStatus.Pending || invite.expiresAt < new Date()) {
    throw new AppError('Invite is invalid or expired', 404, 'INVITE_NOT_FOUND');
  }

  const existing = await prisma.user.findUnique({ where: { email: invite.email.toLowerCase() } });
  if (existing) {
    throw new AppError('Email is already registered', 409, 'EMAIL_EXISTS');
  }

  const user = await prisma.user.create({
    data: {
      email: invite.email.toLowerCase(),
      passwordHash: await bcrypt.hash(data.password, 12),
      firstName: data.firstName,
      lastName: data.lastName,
      role: invite.role,
      organizationId: invite.organizationId,
      isEmailVerified: true,
    },
  });

  await prisma.invite.update({
    where: { id: invite.id },
    data: { status: InviteStatus.Accepted, acceptedAt: new Date() },
  });

  const nextRefresh = await createRefreshToken(user.id);

  return {
    accessToken: generateAccessToken({ userId: user.id, orgId: user.organizationId, role: user.role }),
    refreshToken: nextRefresh.token,
    refreshExpiresAt: nextRefresh.expiresAt,
    user: publicUser(user),
  };
}

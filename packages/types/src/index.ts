export type UserRole = 'ADMIN' | 'QA' | 'DEV' | 'UNASSIGNED';

export type IssueStatus = 'Open' | 'Pending' | 'Closed';

export type IssueCategory = 'Critical' | 'High' | 'Medium' | 'Low';

export type IssuePriority = 'P1' | 'P2' | 'P3' | 'P4';

export type IssueType = 'SW' | 'C' | 'HW';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  organizationId: string | null;
  organization?: Organization | null;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  code: string;
  description: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface System {
  id: string;
  name: string;
  order: number;
  projectId: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  ticketNumber: string;
  description: string;
  resolution: string | null;
  category: IssueCategory;
  priority: IssuePriority;
  type: IssueType;
  appModule: string | null;
  status: IssueStatus;
  remarks: string | null;
  daysOpen: number;
  dateRaised: string;
  dateSubmittedToQA: string | null;
  dateClosed: string | null;
  projectId: string;
  systemId: string;
  system?: System;
  reportedById: string;
  reportedBy?: User;
  assignedToId: string | null;
  assignedTo?: User | null;
  closedById: string | null;
  closedBy?: User | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  description: string;
  metadata: any | null;
  userId: string;
  user?: User;
  issueId: string | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

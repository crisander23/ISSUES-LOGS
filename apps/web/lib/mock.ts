export type IssueStatus = "Open" | "Pending" | "Closed";
export type IssueCategory = "Critical" | "High" | "Medium" | "Low";
export type IssueRole = "ADMIN" | "QA" | "DEV";

export interface MockIssue {
  id: string;
  system: string;
  description: string;
  resolution: string;
  category: IssueCategory;
  priority: "P1" | "P2" | "P3" | "P4";
  type: "SW" | "C" | "HW";
  module: string;
  assignee: string;
  status: IssueStatus;
  reportedBy: string;
  dateRaised: string;
  dateSubmittedToQA: string;
  dateClosed: string;
  daysOpen: number;
  remarks: string;
}

const day = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
};

export const systems = ["Auth Module", "Dashboard", "Reports", "User Management", "Notifications"];

export const issues: MockIssue[] = [
  {
    id: "IF001",
    system: "Auth Module",
    description: "Login button unresponsive after failed password attempt",
    resolution: "",
    category: "High",
    priority: "P1",
    type: "SW",
    module: "Login Page",
    assignee: "",
    status: "Open",
    reportedBy: "Alice Chen",
    dateRaised: day(12),
    dateSubmittedToQA: "",
    dateClosed: "",
    daysOpen: 12,
    remarks: "",
  },
  {
    id: "IF002",
    system: "Dashboard",
    description: "Widget counts are not refreshing in real-time",
    resolution: "",
    category: "Medium",
    priority: "P2",
    type: "SW",
    module: "Overview Widget",
    assignee: "",
    status: "Open",
    reportedBy: "Alice Chen",
    dateRaised: day(8),
    dateSubmittedToQA: "",
    dateClosed: "",
    daysOpen: 8,
    remarks: "",
  },
  {
    id: "IF003",
    system: "Auth Module",
    description: "Password reset email not delivered to some providers",
    resolution: "",
    category: "Critical",
    priority: "P1",
    type: "SW",
    module: "Forgot Password",
    assignee: "",
    status: "Open",
    reportedBy: "Alice Chen",
    dateRaised: day(5),
    dateSubmittedToQA: "",
    dateClosed: "",
    daysOpen: 5,
    remarks: "",
  },
  {
    id: "IF004",
    system: "Reports",
    description: "Export to CSV includes blank rows between data entries",
    resolution: "Added a filter to strip empty rows before serialization",
    category: "Low",
    priority: "P3",
    type: "SW",
    module: "Export Panel",
    assignee: "Bob Santos",
    status: "Pending",
    reportedBy: "Maria Lopez",
    dateRaised: day(14),
    dateSubmittedToQA: day(3),
    dateClosed: "",
    daysOpen: 14,
    remarks: "Waiting for QA sign-off on edge cases",
  },
  {
    id: "IF005",
    system: "User Management",
    description: "Admin cannot deactivate accounts created via SSO",
    resolution: "Extended the deactivation handler to cover SSO-provisioned accounts",
    category: "High",
    priority: "P2",
    type: "SW",
    module: "User Table",
    assignee: "Bob Santos",
    status: "Pending",
    reportedBy: "Alice Chen",
    dateRaised: day(18),
    dateSubmittedToQA: day(5),
    dateClosed: "",
    daysOpen: 18,
    remarks: "Pending regression test",
  },
  {
    id: "IF006",
    system: "Dashboard",
    description: "Sidebar collapses unexpectedly on screens under 1280px",
    resolution: "Added responsive breakpoint at 1280px and tested on target devices",
    category: "Medium",
    priority: "P3",
    type: "SW",
    module: "Navigation",
    assignee: "Bob Santos",
    status: "Closed",
    reportedBy: "Alice Chen",
    dateRaised: day(30),
    dateSubmittedToQA: day(22),
    dateClosed: day(20),
    daysOpen: 10,
    remarks: "",
  },
  {
    id: "IF007",
    system: "Auth Module",
    description: "Session token not invalidated on logout from other devices",
    resolution: "Implemented global session revocation on logout event",
    category: "Critical",
    priority: "P1",
    type: "SW",
    module: "Session Management",
    assignee: "Bob Santos",
    status: "Closed",
    reportedBy: "Maria Lopez",
    dateRaised: day(45),
    dateSubmittedToQA: day(35),
    dateClosed: day(32),
    daysOpen: 13,
    remarks: "",
  },
  {
    id: "IF008",
    system: "Reports",
    description: "Date range picker does not respect timezone settings",
    resolution: "Switched date calculations to use UTC offset from user profile",
    category: "Medium",
    priority: "P2",
    type: "C",
    module: "Report Filters",
    assignee: "Bob Santos",
    status: "Closed",
    reportedBy: "Alice Chen",
    dateRaised: day(60),
    dateSubmittedToQA: day(50),
    dateClosed: day(48),
    daysOpen: 12,
    remarks: "",
  },
  {
    id: "IF009",
    system: "Notifications",
    description: "Email digest not sent when user has no new activity",
    resolution: "",
    category: "Low",
    priority: "P4",
    type: "SW",
    module: "Email Digest",
    assignee: "",
    status: "Open",
    reportedBy: "Alice Chen",
    dateRaised: day(3),
    dateSubmittedToQA: "",
    dateClosed: "",
    daysOpen: 3,
    remarks: "",
  },
  {
    id: "IF010",
    system: "Dashboard",
    description: "Chart tooltips overlap on small viewport sizes",
    resolution: "",
    category: "Low",
    priority: "P4",
    type: "SW",
    module: "Analytics Chart",
    assignee: "",
    status: "Open",
    reportedBy: "Alice Chen",
    dateRaised: day(1),
    dateSubmittedToQA: "",
    dateClosed: "",
    daysOpen: 1,
    remarks: "",
  },
];

export const members = [
  { name: "Maria Lopez", email: "admin@demo.com", role: "ADMIN" as IssueRole },
  { name: "Peter Manager", email: "pm@demo.com", role: "ADMIN" as IssueRole },
  { name: "Alice Chen", email: "qa@demo.com", role: "QA" as IssueRole },
  { name: "Bob Santos", email: "dev@demo.com", role: "DEV" as IssueRole },
];

export const pendingMembers = [
  { name: "Nina Pending", email: "waiting@demo.com" },
  { name: "Evan Awaiting", email: "evan@example.com" },
];

export const activity = [
  { who: "Bob Santos", action: "submitted resolution for", target: "IF005", time: "2h ago" },
  { who: "Alice Chen", action: "logged new issue", target: "IF010", time: "5h ago" },
  { who: "Bob Santos", action: "closed", target: "IF006", time: "1d ago" },
  { who: "Alice Chen", action: "logged new issue", target: "IF009", time: "2d ago" },
  { who: "Bob Santos", action: "submitted resolution for", target: "IF004", time: "3d ago" },
];

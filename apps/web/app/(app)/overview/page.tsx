"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AlertOctagon, Clock, CheckCircle2, Flame, Activity } from "lucide-react";

interface System {
  id: string;
  name: string;
}

interface Issue {
  id: string;
  status: "Open" | "Pending" | "Closed";
  priority: "P1" | "P2" | "P3" | "P4";
  category: "Critical" | "High" | "Medium" | "Low";
  systemId: string;
  assignedToId: string | null;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  } | null;
}

export default function OverviewPage() {

  // Fetch project & systems
  const { data: projectData, isLoading: isLoadingProject } = useQuery({
    queryKey: ["project"],
    queryFn: async () => {
      const res = await api.get("/api/project");
      return res.data.data;
    },
  });

  // Fetch all issues
  const { data: issuesData = [], isLoading: isLoadingIssues } = useQuery<Issue[]>({
    queryKey: ["issues", "all"],
    queryFn: async () => {
      const res = await api.get("/api/issues?limit=1000");
      return res.data.data;
    },
  });

  // Fetch members
  const { data: members = [], isLoading: isLoadingMembers } = useQuery<Member[]>({
    queryKey: ["members"],
    queryFn: async () => {
      const res = await api.get("/api/members");
      return res.data.data;
    },
  });

  // Fetch recent activity
  const { data: activityLogs = [], isLoading: isLoadingActivity } = useQuery<ActivityLog[]>({
    queryKey: ["activityLogs"],
    queryFn: async () => {
      const res = await api.get("/api/project/activity");
      return res.data.data;
    },
  });

  if (isLoadingProject || isLoadingIssues || isLoadingMembers || isLoadingActivity) {
    return (
      <div className="page flex items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-2 text-xs text-[var(--t3)]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <span>Loading project metrics...</span>
        </div>
      </div>
    );
  }

  const open = issuesData.filter((i) => i.status === "Open").length;
  const pending = issuesData.filter((i) => i.status === "Pending").length;
  const closed = issuesData.filter((i) => i.status === "Closed").length;
  const critical = issuesData.filter((i) => i.category === "Critical" && i.status !== "Closed").length;

  // Grouped by system
  const systems: System[] = projectData?.systems || [];
  const systemMetrics = systems.map((sys) => {
    const sysIssues = issuesData.filter((i) => i.systemId === sys.id);
    const sysTotal = sysIssues.length;
    const sysClosed = sysIssues.filter((i) => i.status === "Closed").length;
    const sysPercent = sysTotal > 0 ? Math.round((sysClosed / sysTotal) * 100) : 0;
    return {
      ...sys,
      total: sysTotal,
      closed: sysClosed,
      percent: sysPercent,
    };
  });

  // Dev workloads (Open & Pending issues assigned to devs)
  const developers = members.filter((m) => m.role === "DEV" || m.role === "ADMIN");
  const devWorkloads = developers.map((dev) => {
    const activeCount = issuesData.filter(
      (i) => i.assignedToId === dev.id && (i.status === "Open" || i.status === "Pending")
    ).length;
    return {
      ...dev,
      activeCount,
    };
  }).sort((a, b) => b.activeCount - a.activeCount);

  return (
    <div className="page overflow-y-auto">
      <div className="pg-inner space-y-6">
        <div className="pg-header">
          <div className="pg-title">Dashboard Overview</div>
          <div className="pg-sub">{projectData?.name || "Project"} &mdash; Real-time status indices and health reports</div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="stat-card flex items-center justify-between p-4 bg-white border border-[var(--border)] rounded-lg">
            <div>
              <div className="stat-num text-[var(--open-d)] font-mono text-2xl font-bold">{open}</div>
              <div className="stat-lbl text-xs text-[var(--t3)] font-semibold uppercase">Open Defect Index</div>
            </div>
            <AlertOctagon size={24} className="text-[var(--open-d)] opacity-85" />
          </div>

          <div className="stat-card flex items-center justify-between p-4 bg-white border border-[var(--border)] rounded-lg">
            <div>
              <div className="stat-num text-[var(--pend-d)] font-mono text-2xl font-bold">{pending}</div>
              <div className="stat-lbl text-xs text-[var(--t3)] font-semibold uppercase">Pending Verification</div>
            </div>
            <Clock size={24} className="text-[var(--pend-d)] opacity-85" />
          </div>

          <div className="stat-card flex items-center justify-between p-4 bg-white border border-[var(--border)] rounded-lg">
            <div>
              <div className="stat-num text-[var(--done-d)] font-mono text-2xl font-bold">{closed}</div>
              <div className="stat-lbl text-xs text-[var(--t3)] font-semibold uppercase">Verified Closed</div>
            </div>
            <CheckCircle2 size={24} className="text-[var(--done-d)] opacity-85" />
          </div>

          <div className="stat-card flex items-center justify-between p-4 bg-white border border-[var(--border)] rounded-lg">
            <div>
              <div className="stat-num text-[var(--crit-t)] font-mono text-2xl font-bold">{critical}</div>
              <div className="stat-lbl text-xs text-[var(--t3)] font-semibold uppercase">Unresolved Critical</div>
            </div>
            <Flame size={24} className="text-[var(--crit-t)] opacity-85" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Performance Status */}
          <div className="lg:col-span-2 space-y-4">
            <section className="pg-section">
              <div className="pg-sh">
                <div>
                  <div className="pg-sh-title">System Resolution Rates</div>
                  <div className="pg-sh-sub">Distribution of closed issues by module</div>
                </div>
              </div>
              <div className="pg-body space-y-4">
                {systemMetrics.length === 0 ? (
                  <p className="text-xs text-[var(--t3)]">No systems configured for this project.</p>
                ) : (
                  systemMetrics.map((sys) => (
                    <div key={sys.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{sys.name}</span>
                        <span className="text-[var(--t3)]">
                          {sys.closed}/{sys.total} closed ({sys.percent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--hover)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                          style={{ width: `${sys.percent}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Recent activity stream */}
            <section className="pg-section">
              <div className="pg-sh">
                <div>
                  <div className="pg-sh-title">Recent Activity Logs</div>
                  <div className="pg-sh-sub">Last 10 system and defect transactions</div>
                </div>
              </div>
              <div className="pg-body divide-y divide-[var(--border)]">
                {activityLogs.length === 0 ? (
                  <p className="text-xs text-[var(--t3)] py-2">No activity logged yet.</p>
                ) : (
                  activityLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 py-3 last:pb-0">
                      <div className="mt-0.5 rounded bg-[var(--qa-bg)] p-1 text-[var(--qa)]">
                        <Activity size={13} />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <p className="text-xs text-[var(--text)]">
                          <span className="font-semibold">
                            {log.user ? `${log.user.firstName} ${log.user.lastName}` : "System"}
                          </span>{" "}
                          {log.description}
                        </p>
                        <p className="text-[10px] text-[var(--t3)]">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Dev Workload distribution */}
          <div className="space-y-4">
            <section className="pg-section">
              <div className="pg-sh">
                <div>
                  <div className="pg-sh-title">Developer Workload</div>
                  <div className="pg-sh-sub">Active tickets assigned to developers</div>
                </div>
              </div>
              <div className="pg-body space-y-3">
                {devWorkloads.length === 0 ? (
                  <p className="text-xs text-[var(--t3)]">No developers in organization.</p>
                ) : (
                  devWorkloads.map((dev) => (
                    <div
                      key={dev.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3 bg-white"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-[var(--dev-bg)] text-[var(--dev)] flex items-center justify-center font-semibold text-[10px]">
                          {dev.firstName[0]}
                          {dev.lastName[0]}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[var(--text)]">
                            {dev.firstName} {dev.lastName}
                          </div>
                          <div className="text-[10px] text-[var(--t3)]">{dev.role}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            dev.activeCount >= 5
                              ? "bg-[var(--crit-bg)] text-[var(--crit-t)]"
                              : dev.activeCount >= 2
                              ? "bg-[var(--high-bg)] text-[var(--high-t)]"
                              : "bg-[var(--done-bg)] text-[var(--done-t)]"
                          }`}
                        >
                          {dev.activeCount} active
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

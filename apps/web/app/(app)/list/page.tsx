"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Send, Check, Trash2, Search, Plus, Download } from "lucide-react";
import { useState } from "react";
import { IssueModal } from "@/components/issues/IssueModal";

interface System {
  id: string;
  name: string;
}

interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Issue {
  id: string;
  ticketNumber: string;
  description: string;
  category: "Critical" | "High" | "Medium" | "Low";
  priority: "P1" | "P2" | "P3" | "P4";
  type: "SW" | "C" | "HW";
  status: "Open" | "Pending" | "Closed";
  appModule: string | null;
  dateRaised: string;
  daysOpen: number;
  system: System;
  reportedBy: UserSummary;
  assignedTo: UserSummary | null;
}

const statusOrder: Array<"Open" | "Pending" | "Closed"> = ["Open", "Pending", "Closed"];

function daysClass(issue: Issue) {
  if (issue.status === "Closed") return "dd";
  if (issue.daysOpen > 30) return "dl";
  if (issue.daysOpen > 10) return "dm";
  return "do";
}

export default function ListPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: issues = [], isLoading } = useQuery<Issue[]>({
    queryKey: ["issues", "list"],
    queryFn: async () => {
      const res = await api.get("/api/issues?limit=1000");
      return res.data.data;
    },
  });

  const handleExportCSV = async () => {
    try {
      const res = await api.get("/api/issues/export/csv", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `issues-export-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
    } catch {
      alert("Failed to export CSV");
    }
  };

interface AxiosErrorLike {
  response?: {
    data?: {
      error?: string;
    };
  };
}

  const resolveMutation = useMutation({
    mutationFn: async ({ id, resolution }: { id: string; resolution: string }) => {
      return api.patch(`/api/issues/${id}/resolve`, { resolution });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      alert("Issue resolved!");
    },
    onError: (err: unknown) => {
      alert((err as AxiosErrorLike).response?.data?.error || "Failed to resolve issue.");
    },
  });

  const closeMutation = useMutation({
    mutationFn: async ({ id, remarks }: { id: string; remarks: string }) => {
      return api.patch(`/api/issues/${id}/close`, { remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      alert("Issue closed & verified!");
    },
    onError: (err: unknown) => {
      alert((err as AxiosErrorLike).response?.data?.error || "Failed to close issue.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/issues/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      alert("Issue deleted.");
    },
    onError: (err: unknown) => {
      alert((err as AxiosErrorLike).response?.data?.error || "Failed to delete issue.");
    },
  });

  const filteredIssues = issues.filter((issue) => {
    const term = search.toLowerCase();
    return (
      issue.ticketNumber.toLowerCase().includes(term) ||
      issue.description.toLowerCase().includes(term) ||
      issue.system.name.toLowerCase().includes(term) ||
      (issue.appModule && issue.appModule.toLowerCase().includes(term))
    );
  });

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-2 text-xs text-[var(--t3)]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <span>Loading issue list...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-hidden">
      {/* Search and Log Control Row */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-3.5 bg-[var(--sb)] shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)]" />
          <input
            className="fc pl-9 py-1.5 text-xs w-full bg-white"
            placeholder="Search defects by ID, description, system..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="btn flex items-center gap-1 text-xs"
          >
            <Download size={13} /> Export CSV
          </button>
          {(user?.role === "QA" || user?.role === "ADMIN") && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-fill flex items-center gap-1 text-xs"
            >
              <Plus size={13} /> Log Issue
            </button>
          )}
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto list-wrap">
        <table className="ltable w-full text-left border-collapse">
          <thead className="bg-[var(--sb)] sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">System</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Assignee</th>
              <th className="px-4 py-3">Date Raised</th>
              <th className="px-4 py-3 text-right" />
            </tr>
          </thead>
          <tbody>
            {statusOrder.map((status) => {
              const rows = filteredIssues.filter((issue) => issue.status === status);
              return (
                <span key={status} style={{ display: "contents" }}>
                  <tr className="lt-grp">
                    <td colSpan={10} className="px-4 py-2 text-xs font-semibold text-[var(--t2)] bg-[#f8f9fa] border-y border-[var(--border)]">
                      <span className={`bdg b-${status}`}>
                        <span className="bdg-dot" />
                        {status}
                      </span>{" "}
                      - {rows.length} defect{rows.length === 1 ? "" : "s"}
                    </td>
                  </tr>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-6 text-center text-xs text-[var(--t4)]">
                        No defects in {status} state matching search
                      </td>
                    </tr>
                  ) : (
                    rows.map((issue) => (
                      <tr
                        key={issue.id}
                        onClick={() => setSelectedIssueId(issue.id)}
                        className="hover:bg-[var(--hover)] transition-all cursor-pointer border-b border-[var(--border)]"
                      >
                        <td className="lt-id px-4 py-3 font-semibold text-xs mono text-[var(--t3)]">
                          {issue.ticketNumber}
                        </td>
                        <td className="lt-title px-4 py-3">
                          <div className="text-xs font-medium text-[var(--text)] line-clamp-2 max-w-md">
                            {issue.description}
                          </div>
                          {issue.appModule && (
                            <div className="lt-sub text-[10px] text-[var(--t4)] mt-0.5">
                              {issue.appModule}
                            </div>
                          )}
                        </td>
                        <td className="lt-sys px-4 py-3 text-xs text-[var(--t2)]">
                          {issue.system.name}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`bdg b-${issue.category} text-[9px]`}>{issue.category}</span>
                        </td>
                        <td className="lt-p px-4 py-3 text-xs text-center font-mono font-bold text-[var(--t3)]">
                          {issue.priority}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`bdg b-${issue.status} text-[9px]`}>
                            <span className="bdg-dot" />
                            {issue.status}
                          </span>
                        </td>
                        <td className={`lt-days px-4 py-3 text-xs font-mono font-semibold ${daysClass(issue)}`}>
                          {issue.daysOpen}d
                        </td>
                        <td className="lt-who px-4 py-3 text-xs text-[var(--t3)]">
                          {issue.assignedTo
                            ? `${issue.assignedTo.firstName} ${issue.assignedTo.lastName.slice(0, 1)}.`
                            : "Unassigned"}
                        </td>
                        <td className="lt-date px-4 py-3 text-xs text-[var(--t3)]">
                          {new Date(issue.dateRaised).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1.5">
                            {issue.status === "Open" && (user?.role === "DEV" || user?.role === "ADMIN") && (
                              <button
                                onClick={() => {
                                  const res = prompt("Enter developer resolution summary/action plan:");
                                  if (res) resolveMutation.mutate({ id: issue.id, resolution: res });
                                }}
                                className="btn h-6 w-6 p-0 flex items-center justify-center bg-[var(--pend-bg)] text-[var(--pend-d)] hover:bg-[var(--pend-d)] hover:text-white"
                                title="Resolve Defect"
                              >
                                <Send size={11} />
                              </button>
                            )}
                            {issue.status === "Pending" && (user?.role === "QA" || user?.role === "ADMIN") && (
                              <button
                                onClick={() => {
                                  const rem = prompt("Enter verification closure remarks (optional):") || "";
                                  closeMutation.mutate({ id: issue.id, remarks: rem });
                                }}
                                className="btn h-6 w-6 p-0 flex items-center justify-center bg-[var(--done-bg)] text-[var(--done-d)] hover:bg-[var(--done-d)] hover:text-white"
                                title="Verify & Close Defect"
                              >
                                <Check size={11} />
                              </button>
                            )}
                            {user?.role === "ADMIN" && (
                              <button
                                onClick={() => {
                                  if (confirm(`Delete issue ${issue.ticketNumber} forever?`)) {
                                    deleteMutation.mutate(issue.id);
                                  }
                                }}
                                className="btn btn-danger h-6 w-6 p-0 flex items-center justify-center"
                                title="Delete Defect"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </span>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Unified Issue Modal */}
      {(selectedIssueId || showCreateModal) && (
        <IssueModal
          issueId={selectedIssueId}
          onClose={() => {
            setSelectedIssueId(null);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

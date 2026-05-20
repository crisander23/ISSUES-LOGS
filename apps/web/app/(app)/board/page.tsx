"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { Plus, Search, CheckCircle, Download } from "lucide-react";
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

const statuses: Array<{ key: "Open" | "Pending" | "Closed"; label: string; dot: string; stripe: string }> = [
  { key: "Open", label: "Open Defect Logs", dot: "d-open", stripe: "ks-open" },
  { key: "Pending", label: "Pending Verification", dot: "d-pend", stripe: "ks-pend" },
  { key: "Closed", label: "Closed / Verified", dot: "d-done", stripe: "ks-done" },
];

function initials(firstName?: string, lastName?: string) {
  if (!firstName && !lastName) return "?";
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

export default function BoardPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Client-side pagination states per column
  const [pages, setPages] = useState<Record<string, number>>({
    Open: 0,
    Pending: 0,
    Closed: 0,
  });

  const PAGE_SIZE = 5;

  const { data: issues = [], isLoading } = useQuery<Issue[]>({
    queryKey: ["issues", "board"],
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

  const filteredIssues = issues.filter((issue) => {
    const term = search.toLowerCase();
    return (
      issue.ticketNumber.toLowerCase().includes(term) ||
      issue.description.toLowerCase().includes(term) ||
      issue.system.name.toLowerCase().includes(term) ||
      (issue.appModule && issue.appModule.toLowerCase().includes(term))
    );
  });

  const handlePrevPage = (statusKey: string) => {
    setPages((prev) => ({
      ...prev,
      [statusKey]: Math.max(0, prev[statusKey] - 1),
    }));
  };

  const handleNextPage = (statusKey: string, totalCount: number) => {
    setPages((prev) => ({
      ...prev,
      [statusKey]: Math.min(Math.ceil(totalCount / PAGE_SIZE) - 1, prev[statusKey] + 1),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--bg)]">
        <div className="flex flex-col items-center gap-2 text-xs text-[var(--t3)]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <span>Loading Kanban board...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">
      {/* Board controls/headers */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-3.5 bg-[var(--sb)]">
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

      {/* Kanban lanes */}
      <div className="flex-1 overflow-x-auto p-6 flex gap-6 align-stretch min-h-0">
        {statuses.map((status) => {
          const colIssues = filteredIssues.filter((issue) => issue.status === status.key);
          const currentPage = pages[status.key] || 0;
          const startIndex = currentPage * PAGE_SIZE;
          const visibleIssues = colIssues.slice(startIndex, startIndex + PAGE_SIZE);
          const totalPages = Math.ceil(colIssues.length / PAGE_SIZE);

          return (
            <section key={status.key} className="kcol flex flex-col w-[320px] shrink-0 border border-[var(--border)] rounded-lg bg-[var(--sb)] overflow-hidden">
              <div className={`kstripe ${status.stripe} h-1 w-full shrink-0`} />
              <div className="kcol-head flex items-center gap-2 px-4 py-3.5 border-b border-[var(--border)] bg-white shrink-0">
                <span className={`sb-dot ${status.dot}`} />
                <span className="kcol-title font-semibold text-xs text-[var(--text)]">{status.label}</span>
                <span className="kcol-ct text-[10px] font-bold text-[var(--t3)] bg-[var(--hover)] px-2 py-0.5 rounded-full ml-auto">
                  {colIssues.length}
                </span>
                {status.key === "Open" && (user?.role === "QA" || user?.role === "ADMIN") && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="kcol-add p-1 hover:bg-[var(--hover)] rounded text-[var(--t3)]"
                    title="Log Issue"
                  >
                    <Plus size={13} />
                  </button>
                )}
              </div>

              {/* Scrollable Cards Container */}
              <div className="kcards flex-1 overflow-y-auto p-3.5 space-y-3">
                {visibleIssues.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[var(--t4)]">
                    <CheckCircle size={28} className="opacity-40 mb-2" />
                    <span className="text-[11px]">No issues in this state</span>
                  </div>
                ) : (
                  visibleIssues.map((issue) => (
                    <article
                      key={issue.id}
                      onClick={() => setSelectedIssueId(issue.id)}
                      className="kcard bg-white border border-[var(--border)] rounded-lg p-3 hover:shadow-md cursor-pointer transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`bdg b-${issue.category} text-[9px]`}>{issue.category}</span>
                        <span className="mono text-[10px] font-semibold text-[var(--t3)]">
                          {issue.ticketNumber}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-[var(--text)] line-clamp-3 mb-3 leading-relaxed">
                        {issue.description}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] border-dashed text-[10px] text-[var(--t3)]">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-[var(--hover)] px-1.5 py-0.5 rounded font-mono font-medium">
                            {issue.system.name}
                          </span>
                          {issue.appModule && (
                            <span className="text-[var(--t4)] max-w-16 truncate" title={issue.appModule}>
                              {issue.appModule}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`font-mono text-[9px] px-1 rounded ${
                            issue.daysOpen > 14
                              ? "bg-[var(--crit-bg)] text-[var(--crit-t)] font-semibold"
                              : "bg-[var(--hover)] text-[var(--t3)]"
                          }`}>
                            {issue.daysOpen}d
                          </span>
                          <div className="flex -space-x-1 ml-1">
                            <div
                              className="w-4 h-4 rounded-full bg-[var(--qa-bg)] text-[var(--qa)] flex items-center justify-center text-[7px] font-bold border border-white"
                              title={`Reported by ${issue.reportedBy.firstName} ${issue.reportedBy.lastName}`}
                            >
                              {initials(issue.reportedBy.firstName, issue.reportedBy.lastName)}
                            </div>
                            {issue.assignedTo && (
                              <div
                                className="w-4 h-4 rounded-full bg-[var(--dev-bg)] text-[var(--dev)] flex items-center justify-center text-[7px] font-bold border border-white"
                                title={`Assigned to ${issue.assignedTo.firstName} ${issue.assignedTo.lastName}`}
                              >
                                {initials(issue.assignedTo.firstName, issue.assignedTo.lastName)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>

              {/* Column Footer Paging */}
              <div className="kpager shrink-0 flex items-center justify-between border-t border-[var(--border)] px-4 py-2 bg-white text-[10px]">
                <span className="text-[var(--t3)]">
                  {colIssues.length ? `${startIndex + 1}-${Math.min(startIndex + PAGE_SIZE, colIssues.length)}` : "0"} of {colIssues.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 0}
                    onClick={() => handlePrevPage(status.key)}
                    className="h-5 w-5 rounded border border-[var(--border)] bg-white text-[11px] text-[var(--t3)] disabled:opacity-30 flex items-center justify-center hover:bg-[var(--hover)]"
                  >
                    ‹
                  </button>
                  <span className="text-[10px] text-[var(--t3)] font-medium">
                    {currentPage + 1}/{Math.max(1, totalPages)}
                  </span>
                  <button
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => handleNextPage(status.key, colIssues.length)}
                    className="h-5 w-5 rounded border border-[var(--border)] bg-white text-[11px] text-[var(--t3)] disabled:opacity-30 flex items-center justify-center hover:bg-[var(--hover)]"
                  >
                    ›
                  </button>
                </div>
              </div>
            </section>
          );
        })}
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

"use client";

import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { X, ShieldAlert } from "lucide-react";
import { useEffect } from "react";

interface IssueModalProps {
  issueId: string | null; // null for Create mode
  onClose: () => void;
}

interface IssueFormInput {
  description: string;
  category: "Critical" | "High" | "Medium" | "Low";
  priority: "P1" | "P2" | "P3" | "P4";
  type: "SW" | "C" | "HW";
  appModule?: string;
  systemId: string;
  assignedToId?: string;
  dateRaised?: string;
  resolution?: string;
  remarks?: string;
  dateClosed?: string;
}

export function IssueModal({ issueId, onClose }: IssueModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isCreate = !issueId;

interface SystemItem {
  id: string;
  name: string;
}

interface MemberItem {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

  // Fetch systems list
  const { data: systems = [] } = useQuery<SystemItem[]>({
    queryKey: ["systems"],
    queryFn: async () => {
      const res = await api.get("/api/systems");
      return res.data.data;
    },
  });

  // Fetch team members list
  const { data: members = [] } = useQuery<MemberItem[]>({
    queryKey: ["members"],
    queryFn: async () => {
      const res = await api.get("/api/members");
      return res.data.data;
    },
  });

  // Fetch issue details if editing/viewing
  const { data: issue, isLoading } = useQuery({
    queryKey: ["issue", issueId],
    queryFn: async () => {
      if (!issueId) return null;
      const res = await api.get(`/api/issues/${issueId}`);
      return res.data.data;
    },
    enabled: !!issueId,
  });

  const { register, handleSubmit, reset } = useForm<IssueFormInput>({
    defaultValues: {
      description: "",
      category: "Medium",
      priority: "P4",
      type: "SW",
      appModule: "",
      systemId: "",
      assignedToId: "",
      dateRaised: new Date().toISOString().slice(0, 10),
      resolution: "",
      remarks: "",
      dateClosed: new Date().toISOString().slice(0, 10),
    },
  });

  // Sync form with loaded issue details
  useEffect(() => {
    if (issue) {
      reset({
        description: issue.description || "",
        category: issue.category || "Medium",
        priority: issue.priority || "P4",
        type: issue.type || "SW",
        appModule: issue.appModule || "",
        systemId: issue.systemId || "",
        assignedToId: issue.assignedToId || "",
        dateRaised: issue.dateRaised ? issue.dateRaised.slice(0, 10) : new Date().toISOString().slice(0, 10),
        resolution: issue.resolution || "",
        remarks: issue.remarks || "",
        dateClosed: issue.dateClosed ? issue.dateClosed.slice(0, 10) : new Date().toISOString().slice(0, 10),
      });
    } else if (isCreate) {
      reset({
        description: "",
        category: "Medium",
        priority: "P4",
        type: "SW",
        appModule: "",
        systemId: systems[0]?.id || "",
        assignedToId: "",
        dateRaised: new Date().toISOString().slice(0, 10),
        resolution: "",
        remarks: "",
        dateClosed: new Date().toISOString().slice(0, 10),
      });
    }
  }, [issue, isCreate, reset, systems]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: Partial<IssueFormInput>) => {
      return api.post("/api/issues", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<IssueFormInput>) => {
      return api.patch(`/api/issues/${issueId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      onClose();
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (data: { resolution: string; remarks?: string | null }) => {
      return api.patch(`/api/issues/${issueId}/resolve`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      onClose();
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (data: { remarks?: string | null; dateClosed?: string }) => {
      return api.patch(`/api/issues/${issueId}/close`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return api.delete(`/api/issues/${issueId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      onClose();
    },
  });

  const onSubmit = (formData: IssueFormInput) => {
    if (isCreate) {
      createMutation.mutate({
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        type: formData.type,
        appModule: formData.appModule || undefined,
        systemId: formData.systemId,
        assignedToId: formData.assignedToId || undefined,
        dateRaised: formData.dateRaised ? new Date(formData.dateRaised).toISOString() : new Date().toISOString(),
      });
    } else {
      // If QA/Admin and issue is open, we can update details
      if ((user?.role === "QA" || user?.role === "ADMIN") && issue?.status === "Open") {
        updateMutation.mutate({
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          type: formData.type,
          appModule: formData.appModule || undefined,
          systemId: formData.systemId,
          assignedToId: formData.assignedToId || undefined,
          dateRaised: formData.dateRaised ? new Date(formData.dateRaised).toISOString() : undefined,
        });
      }
    }
  };

  const handleResolve = (formData: IssueFormInput) => {
    if (formData.resolution) {
      resolveMutation.mutate({
        resolution: formData.resolution,
        remarks: formData.remarks || null,
      });
    }
  };

  const handleClose = (formData: IssueFormInput) => {
    closeMutation.mutate({
      remarks: formData.remarks || null,
      dateClosed: formData.dateClosed ? new Date(formData.dateClosed).toISOString() : new Date().toISOString(),
    });
  };

  if (isLoading && !isCreate) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="w-full max-w-lg rounded-[10px] border border-[var(--border)] bg-white p-6 shadow-md flex items-center justify-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          <span className="text-xs text-[var(--t3)]">Loading details...</span>
        </div>
      </div>
    );
  }

  // Determine allowed actions
  const isEditable = isCreate || (issue?.status === "Open" && (user?.role === "QA" || user?.role === "ADMIN"));
  const canResolve = !isCreate && issue?.status === "Open" && (user?.role === "DEV" || user?.role === "ADMIN");
  const canClose = !isCreate && issue?.status === "Pending" && (user?.role === "QA" || user?.role === "ADMIN");
  const canDelete = !isCreate && user?.role === "ADMIN";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-[10px] border border-[var(--border)] bg-white shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">
              {isCreate ? "Create New Issue" : `${issue?.ticketNumber}: Issue Details`}
            </h2>
            {!isCreate && (
              <span className={`bdg b-${issue?.status} mt-1 inline-block`}>
                <span className="bdg-dot" />
                {issue?.status}
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-[var(--t3)] hover:bg-[var(--hover)] hover:text-[var(--text)]">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Step Workflow Indicator */}
          {!isCreate && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--sb)] p-4 flex items-center justify-around text-xs">
              <div className={`flex items-center gap-2 ${issue?.status === "Open" ? "text-[var(--open-text)] font-semibold" : "text-[var(--t3)]"}`}>
                <div className={`h-5 w-5 rounded-full flex items-center justify-center border ${issue?.status !== "Open" ? "bg-[var(--open-d)] text-white border-[var(--open-d)]" : "border-[var(--open-d)]"}`}>
                  1
                </div>
                <span>Logged (Open)</span>
              </div>
              <div className="h-[1px] w-12 bg-[var(--border)] flex-1 mx-2" />
              <div className={`flex items-center gap-2 ${issue?.status === "Pending" ? "text-[var(--pending-text)] font-semibold" : "text-[var(--t3)]"}`}>
                <div className={`h-5 w-5 rounded-full flex items-center justify-center border ${issue?.status === "Closed" ? "bg-[var(--pend-d)] text-white border-[var(--pend-d)]" : issue?.status === "Pending" ? "border-[var(--pend-d)] text-[var(--pend-d)]" : "border-[var(--border)]"}`}>
                  2
                </div>
                <span>Resolved (Pending)</span>
              </div>
              <div className="h-[1px] w-12 bg-[var(--border)] flex-1 mx-2" />
              <div className={`flex items-center gap-2 ${issue?.status === "Closed" ? "text-[var(--closed-text)] font-semibold" : "text-[var(--t3)]"}`}>
                <div className={`h-5 w-5 rounded-full flex items-center justify-center border ${issue?.status === "Closed" ? "bg-[var(--done-d)] text-white border-[var(--done-d)]" : "border-[var(--border)]"}`}>
                  3
                </div>
                <span>Verified (Closed)</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* QA Fields / Primary Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="pg-field">
                <label className="text-xs font-semibold text-[var(--t2)]">System / Module</label>
                <select
                  disabled={!isEditable}
                  className="fc w-full border border-[var(--border)] rounded px-3 py-2 bg-white disabled:bg-[var(--sb)]"
                  {...register("systemId", { required: true })}
                >
                  {systems.map((sys) => (
                    <option key={sys.id} value={sys.id}>{sys.name}</option>
                  ))}
                </select>
              </div>

              <div className="pg-field">
                <label className="text-xs font-semibold text-[var(--t2)]">App Module / Component</label>
                <input
                  disabled={!isEditable}
                  className="fc w-full border border-[var(--border)] rounded px-3 py-2 disabled:bg-[var(--sb)]"
                  placeholder="e.g. Navigation bar, Login screen"
                  {...register("appModule")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="pg-field">
                <label className="text-xs font-semibold text-[var(--t2)]">Category</label>
                <select
                  disabled={!isEditable}
                  className="fc w-full border border-[var(--border)] rounded px-3 py-2 bg-white disabled:bg-[var(--sb)]"
                  {...register("category")}
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="pg-field">
                <label className="text-xs font-semibold text-[var(--t2)]">Priority</label>
                <select
                  disabled={!isEditable}
                  className="fc w-full border border-[var(--border)] rounded px-3 py-2 bg-white disabled:bg-[var(--sb)]"
                  {...register("priority")}
                >
                  <option value="P1">P1 (Immediate)</option>
                  <option value="P2">P2 (High)</option>
                  <option value="P3">P3 (Medium)</option>
                  <option value="P4">P4 (Low)</option>
                </select>
              </div>

              <div className="pg-field">
                <label className="text-xs font-semibold text-[var(--t2)]">Type</label>
                <select
                  disabled={!isEditable}
                  className="fc w-full border border-[var(--border)] rounded px-3 py-2 bg-white disabled:bg-[var(--sb)]"
                  {...register("type")}
                >
                  <option value="SW">Software (SW)</option>
                  <option value="C">Configuration (C)</option>
                  <option value="HW">Hardware (HW)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="pg-field">
                <label className="text-xs font-semibold text-[var(--t2)]">Assignee (Developer)</label>
                <select
                  disabled={!isEditable}
                  className="fc w-full border border-[var(--border)] rounded px-3 py-2 bg-white disabled:bg-[var(--sb)]"
                  {...register("assignedToId")}
                >
                  <option value="">Unassigned</option>
                  {members
                    .filter((m) => m.role === "DEV" || m.role === "ADMIN")
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.role})</option>
                    ))}
                </select>
              </div>

              <div className="pg-field">
                <label className="text-xs font-semibold text-[var(--t2)]">Date Raised</label>
                <input
                  type="date"
                  disabled={!isEditable}
                  className="fc w-full border border-[var(--border)] rounded px-3 py-2 disabled:bg-[var(--sb)]"
                  {...register("dateRaised")}
                />
              </div>
            </div>

            <div className="pg-field">
              <label className="text-xs font-semibold text-[var(--t2)]">Issue Description</label>
              <textarea
                disabled={!isEditable}
                rows={3}
                className="fc w-full border border-[var(--border)] rounded px-3 py-2 disabled:bg-[var(--sb)] resize-none"
                placeholder="Detail the defect or problem..."
                {...register("description", { required: true })}
              />
            </div>

            {/* QA/Admin Primary Form Submit */}
            {isEditable && (
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="btn">Cancel</button>
                <button type="submit" className="btn btn-fill">
                  {isCreate ? "Create Issue" : "Save Changes"}
                </button>
              </div>
            )}
          </form>

          {/* Workflow Resolving Form (Developer action) */}
          {issue?.status === "Open" && canResolve && (
            <div className="border-t border-[var(--border)] pt-5">
              <h3 className="text-sm font-semibold text-[var(--pend-t)] mb-3">Resolve Defect (Developer Section)</h3>
              <form onSubmit={handleSubmit(handleResolve)} className="space-y-4">
                <div className="pg-field">
                  <label className="text-xs font-semibold text-[var(--t2)]">Resolution / Action Plan</label>
                  <textarea
                    rows={3}
                    className="fc w-full border border-[var(--border)] rounded px-3 py-2 resize-none"
                    placeholder="Specify the action taken to fix this issue..."
                    {...register("resolution", { required: true })}
                  />
                </div>
                <div className="pg-field">
                  <label className="text-xs font-semibold text-[var(--t2)]">Remarks</label>
                  <input
                    className="fc w-full border border-[var(--border)] rounded px-3 py-2"
                    placeholder="Notes or developer observations..."
                    {...register("remarks")}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={onClose} className="btn">Cancel</button>
                  <button type="submit" className="btn btn-fill bg-[var(--pend-d)] text-white hover:bg-[var(--pend-t)]">
                    Submit Resolution
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Displays Resolution Summary if already resolved */}
          {issue?.status !== "Open" && issue?.resolution && (
            <div className="border-t border-[var(--border)] pt-5 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--t2)]">Developer Resolution Details</h3>
              <div className="rounded-[8px] border border-[#ffedd5] bg-[#fffbeb] p-4 text-xs text-[var(--t2)] space-y-2">
                <p><strong>Action Taken:</strong> {issue.resolution}</p>
                {issue.remarks && <p><strong>Developer Remarks:</strong> {issue.remarks}</p>}
                <p className="text-[var(--t3)]">
                  Resolved by {issue.assignedTo?.firstName} {issue.assignedTo?.lastName} on {new Date(issue.dateSubmittedToQA).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {/* Workflow Closing Form (QA action) */}
          {issue?.status === "Pending" && canClose && (
            <div className="border-t border-[var(--border)] pt-5">
              <h3 className="text-sm font-semibold text-[var(--done-t)] mb-3">Verify & Close Issue (QA Section)</h3>
              <form onSubmit={handleSubmit(handleClose)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="pg-field">
                    <label className="text-xs font-semibold text-[var(--t2)]">Verification Date</label>
                    <input
                      type="date"
                      className="fc w-full border border-[var(--border)] rounded px-3 py-2"
                      {...register("dateClosed")}
                    />
                  </div>
                  <div className="pg-field">
                    <label className="text-xs font-semibold text-[var(--t2)]">Final Remarks</label>
                    <input
                      className="fc w-full border border-[var(--border)] rounded px-3 py-2"
                      placeholder="e.g. Tested on build v1.2 and verified"
                      {...register("remarks")}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={onClose} className="btn">Cancel</button>
                  <button type="submit" className="btn btn-fill bg-[var(--done-d)] text-white hover:bg-[var(--done-t)]">
                    Verify & Close Issue
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Displays Closure Details if closed */}
          {issue?.status === "Closed" && (
            <div className="border-t border-[var(--border)] pt-5 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--t2)]">Verification & Closure Summary</h3>
              <div className="rounded-[8px] border border-[#dcfce7] bg-[#f0fdf4] p-4 text-xs text-[var(--t2)] space-y-2">
                <p><strong>Remarks:</strong> {issue.remarks || "No closure remarks provided."}</p>
                <p><strong>Days Open:</strong> {issue.daysOpen} days</p>
                <p className="text-[var(--t3)]">
                  Closed by {issue.closedBy?.firstName} {issue.closedBy?.lastName} on {new Date(issue.dateClosed).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Delete button for Admin only */}
        {canDelete && (
          <div className="border-t border-[var(--border)] px-5 py-4 bg-[var(--sb)] flex justify-between items-center rounded-b-[10px]">
            <span className="text-[11px] text-[var(--t3)] flex items-center gap-1">
              <ShieldAlert size={12} className="text-red-500" /> Administrative Action Area
            </span>
            <button
              onClick={() => {
                if (confirm("Are you sure you want to delete this issue forever? This action is irreversible.")) {
                  deleteMutation.mutate();
                }
              }}
              className="btn btn-danger"
            >
              Delete Issue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

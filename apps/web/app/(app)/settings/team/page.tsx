"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";
import { Mail, Check, Trash2, RotateCcw } from "lucide-react";

interface Member {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "QA" | "DEV" | "UNASSIGNED";
  isActive: boolean;
}

interface Invite {
  id: string;
  email: string;
  role: "ADMIN" | "QA" | "DEV";
  status: "Pending" | "Accepted" | "Expired";
  createdAt: string;
}

function initials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

export default function TeamSettingsPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === "ADMIN";

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      email: "",
      role: "QA" as "ADMIN" | "QA" | "DEV",
    },
  });

  // Query members
  const { data: members = [], isLoading: isLoadingMembers } = useQuery<Member[]>({
    queryKey: ["members"],
    queryFn: async () => {
      const res = await api.get("/api/members");
      return res.data.data;
    },
  });

  // Query invites
  const { data: invites = [], isLoading: isLoadingInvites } = useQuery<Invite[]>({
    queryKey: ["invites"],
    queryFn: async () => {
      if (!isAdmin) return [];
      const res = await api.get("/api/members/invites");
      return res.data.data;
    },
    enabled: isAdmin,
  });

  // Roles assignments for pending users
  const [pendingRoles, setPendingRoles] = useState<Record<string, "QA" | "DEV">>({});

interface AxiosErrorLike {
  response?: {
    data?: {
      error?: string;
    };
  };
}

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return api.patch(`/api/members/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err: unknown) => {
      alert((err as AxiosErrorLike).response?.data?.error || "Failed to approve user.");
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return api.patch(`/api/members/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      alert("User role updated successfully.");
    },
    onError: (err: unknown) => {
      alert((err as AxiosErrorLike).response?.data?.error || "Failed to update role.");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return api.delete(`/api/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (err: unknown) => {
      alert((err as AxiosErrorLike).response?.data?.error || "Failed to remove member.");
    },
  });

  const sendInviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      return api.post("/api/members/invite", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      reset();
      alert("Invite sent successfully.");
    },
    onError: (err: unknown) => {
      alert((err as AxiosErrorLike).response?.data?.error || "Failed to send invitation.");
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      return api.post(`/api/members/invites/${inviteId}/resend`);
    },
    onSuccess: () => {
      alert("Invite resent successfully.");
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      return api.delete(`/api/members/invites/${inviteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });

  const pendingApprovals = members.filter((m) => m.role === "UNASSIGNED" && m.isActive);
  const activeMembers = members.filter((m) => m.role !== "UNASSIGNED" && m.isActive);

  const onSubmitInvite = (data: { email: string; role: string }) => {
    sendInviteMutation.mutate(data);
  };

  if (isLoadingMembers || (isAdmin && isLoadingInvites)) {
    return (
      <div className="p-6 text-xs text-[var(--t3)]">Loading team settings...</div>
    );
  }

  return (
    <>
      {/* Pending Approvals */}
      <section className="pg-section">
        <div className="pg-sh">
          <div>
            <div className="pg-sh-title">Pending Approval</div>
            <div className="pg-sh-sub">Assign a project role before these users can enter the workspace</div>
          </div>
        </div>
        <div className="pg-body">
          {pendingApprovals.length === 0 ? (
            <p className="text-xs text-[var(--t3)] py-3">No pending user registrations waiting for approval.</p>
          ) : (
            <table className="team-table w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs text-[var(--t3)] uppercase font-semibold">
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Assign Role</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.map((member) => (
                  <tr key={member.id} className="border-b border-[var(--border)] text-sm">
                    <td className="py-3">
                      <div className="font-semibold">{member.firstName} {member.lastName}</div>
                    </td>
                    <td className="py-3 text-[var(--t3)]">{member.email}</td>
                    <td className="py-3">
                      <select
                        disabled={!isAdmin}
                        className="fc max-w-28 px-2 py-1"
                        value={pendingRoles[member.id] || "QA"}
                        onChange={(e) => setPendingRoles({ ...pendingRoles, [member.id]: e.target.value as "QA" | "DEV" })}
                      >
                        <option value="QA">QA</option>
                        <option value="DEV">DEV</option>
                      </select>
                    </td>
                    <td className="py-3 text-right">
                      {isAdmin ? (
                        <button
                          onClick={() => approveMutation.mutate({ userId: member.id, role: pendingRoles[member.id] || "QA" })}
                          className="btn btn-fill flex items-center gap-1 ml-auto"
                        >
                          <Check size={13} /> Approve
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--t4)]">Admin only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Team Members */}
      <section className="pg-section mt-6">
        <div className="pg-sh">
          <div>
            <div className="pg-sh-title">Team Members</div>
            <div className="pg-sh-sub">Users and their roles in this project</div>
          </div>
        </div>
        <div className="pg-body">
          <table className="team-table w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs text-[var(--t3)] uppercase font-semibold">
                <th className="py-2 w-10"></th>
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeMembers.map((member) => (
                <tr key={member.id} className="border-b border-[var(--border)] text-sm">
                  <td className="py-3">
                    <div className="tm-av bg-[var(--accent)] text-white font-semibold text-[10px] w-6 h-6 rounded-full flex items-center justify-center">
                      {initials(member.firstName, member.lastName)}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="font-semibold">{member.firstName} {member.lastName}</div>
                  </td>
                  <td className="py-3 text-[var(--t3)]">{member.email}</td>
                  <td className="py-3">
                    <select
                      disabled={!isAdmin || member.id === currentUser?.id}
                      className="fc max-w-32 px-2 py-1 bg-white disabled:bg-transparent disabled:border-none disabled:p-0"
                      value={member.role}
                      onChange={(e) => changeRoleMutation.mutate({ userId: member.id, role: e.target.value })}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="QA">QA</option>
                      <option value="DEV">DEV</option>
                    </select>
                  </td>
                  <td className="py-3 text-right">
                    {isAdmin && member.id !== currentUser?.id ? (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove ${member.firstName} from the team?`)) {
                            removeMemberMutation.mutate(member.id);
                          }
                        }}
                        className="btn btn-danger"
                      >
                        Remove
                      </button>
                    ) : member.id === currentUser?.id ? (
                      <span className="text-xs text-[var(--t4)] font-medium">You</span>
                    ) : (
                      <span className="text-xs text-[var(--t4)]">Admin only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Send Invite Form */}
          {isAdmin && (
            <form onSubmit={handleSubmit(onSubmitInvite)} className="pg-row mt-6 pt-5 border-t border-[var(--border)]">
              <div className="pg-field flex-1">
                <label>Email Address</label>
                <input
                  type="email"
                  className="fc"
                  placeholder="collaborator@example.com"
                  {...register("email", { required: true })}
                />
              </div>
              <div className="pg-field max-w-32">
                <label>Workspace Role</label>
                <select className="fc bg-white" {...register("role")}>
                  <option value="QA">QA</option>
                  <option value="DEV">DEV</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <button type="submit" className="btn btn-fill flex items-center gap-1">
                <Mail size={13} /> Send Invite
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Pending Invites (Admin only) */}
      {isAdmin && (
        <section className="pg-section mt-6">
          <div className="pg-sh">
            <div>
              <div className="pg-sh-title">Pending Invitations</div>
              <div className="pg-sh-sub">Manage sent organization invites</div>
            </div>
          </div>
          <div className="pg-body">
            {invites.filter((i) => i.status === "Pending").length === 0 ? (
              <p className="text-xs text-[var(--t3)] py-3">No active pending invitations.</p>
            ) : (
              <table className="team-table w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs text-[var(--t3)] uppercase font-semibold">
                    <th className="py-2">Email</th>
                    <th className="py-2">Role</th>
                    <th className="py-2">Sent Date</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites
                    .filter((i) => i.status === "Pending")
                    .map((invite) => (
                      <tr key={invite.id} className="border-b border-[var(--border)] text-sm">
                        <td className="py-3 font-medium">{invite.email}</td>
                        <td className="py-3 text-[var(--t3)]">{invite.role}</td>
                        <td className="py-3 text-[var(--t3)]">{new Date(invite.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 text-right flex justify-end gap-1.5">
                          <button
                            onClick={() => resendInviteMutation.mutate(invite.id)}
                            className="btn h-7 px-2 py-0 flex items-center gap-1"
                            title="Resend Invitation"
                          >
                            <RotateCcw size={12} /> Resend
                          </button>
                          <button
                            onClick={() => cancelInviteMutation.mutate(invite.id)}
                            className="btn btn-danger h-7 px-2 py-0 flex items-center gap-1"
                            title="Cancel Invitation"
                          >
                            <Trash2 size={12} /> Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
    </>
  );
}

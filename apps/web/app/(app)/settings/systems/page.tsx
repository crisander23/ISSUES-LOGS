"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { X, ArrowUp, ArrowDown, Plus } from "lucide-react";
import { useState } from "react";

interface System {
  id: string;
  name: string;
  order: number;
}

export default function SystemsSettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const [newSystemName, setNewSystemName] = useState("");

  const { data: systems = [], isLoading } = useQuery<System[]>({
    queryKey: ["systems"],
    queryFn: async () => {
      const res = await api.get("/api/systems");
      return res.data.data;
    },
  });

interface AxiosErrorLike {
  response?: {
    data?: {
      error?: string;
    };
  };
}

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      return api.post("/api/systems", { name, order: systems.length });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systems"] });
      setNewSystemName("");
    },
    onError: (err: unknown) => {
      alert((err as AxiosErrorLike).response?.data?.error || "Failed to add system module.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/api/systems/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systems"] });
    },
    onError: (err: unknown) => {
      alert((err as AxiosErrorLike).response?.data?.error || "Failed to delete system module.");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (payload: { id: string; order: number }[]) => {
      return api.patch("/api/systems/reorder", { systems: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systems"] });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSystemName.trim()) return;
    addMutation.mutate(newSystemName.trim());
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    if (!isAdmin) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= systems.length) return;

    const list = [...systems];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Map to API payload
    const payload = list.map((item, idx) => ({
      id: item.id,
      order: idx,
    }));

    reorderMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <section className="pg-section">
        <div className="p-6 text-xs text-[var(--t3)]">Loading systems...</div>
      </section>
    );
  }

  return (
    <section className="pg-section">
      <div className="pg-sh">
        <div>
          <div className="pg-sh-title">Systems</div>
          <div className="pg-sh-sub">Systems or modules issues are logged against</div>
        </div>
      </div>
      <div className="pg-body">
        {!isAdmin && (
          <div className="mb-4 rounded-md border border-[#ddd6fe] bg-[var(--pm-bg)] p-3 text-[13px] text-[var(--t2)]">
            <strong className="text-[var(--pm)]">Admin only.</strong> Users can view these systems, but configuration belongs to Workspace Admins.
          </div>
        )}

        <div className="space-y-2 mb-6">
          {systems.map((system, idx) => (
            <div
              key={system.id}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-white p-3 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--t4)] font-mono">#{idx + 1}</span>
                <span className="text-sm font-medium">{system.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isAdmin && (
                  <>
                    <button
                      disabled={idx === 0}
                      onClick={() => moveItem(idx, "up")}
                      className="p-1 rounded text-[var(--t3)] hover:bg-[var(--hover)] hover:text-[var(--text)] disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      disabled={idx === systems.length - 1}
                      onClick={() => moveItem(idx, "down")}
                      className="p-1 rounded text-[var(--t3)] hover:bg-[var(--hover)] hover:text-[var(--text)] disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove the system "${system.name}"?`)) {
                          deleteMutation.mutate(system.id);
                        }
                      }}
                      className="p-1 rounded text-[var(--crit-t)] hover:bg-[var(--crit-bg)]"
                      title="Delete"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {isAdmin && (
          <form onSubmit={handleAdd} className="pg-row pt-4 border-t border-[var(--border)]">
            <div className="pg-field flex-1">
              <label>Add New System Module</label>
              <input
                className="fc"
                value={newSystemName}
                onChange={(e) => setNewSystemName(e.target.value)}
                placeholder="e.g. Payments Gateway"
              />
            </div>
            <button type="submit" className="btn btn-fill flex items-center gap-1">
              <Plus size={14} /> Add System
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

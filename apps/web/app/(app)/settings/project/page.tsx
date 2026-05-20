"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";

export default function ProjectSettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  const { data: project, isLoading } = useQuery({
    queryKey: ["project"],
    queryFn: async () => {
      const res = await api.get("/api/project");
      return res.data.data;
    },
  });

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: "",
      code: "",
      description: "",
    },
  });

  useEffect(() => {
    if (project) {
      reset({
        name: project.name || "",
        code: project.code || "",
        description: project.description || "",
      });
    }
  }, [project, reset]);

interface AxiosErrorLike {
  response?: {
    data?: {
      error?: string;
    };
  };
}

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string | null }) => {
      return api.patch("/api/project", {
        name: data.name,
        description: data.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project"] });
      alert("Project settings saved successfully!");
    },
    onError: (err: unknown) => {
      alert((err as AxiosErrorLike).response?.data?.error || "Failed to update project settings.");
    },
  });

  const onSubmit = (data: { name: string; description?: string | null }) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <section className="pg-section">
        <div className="p-6 text-xs text-[var(--t3)]">Loading project details...</div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pg-section">
      <div className="pg-sh">
        <div>
          <div className="pg-sh-title">Project Information</div>
          <div className="pg-sh-sub">Name and details shown across the app</div>
        </div>
        {isAdmin && <button type="submit" className="btn btn-fill">Save</button>}
      </div>
      <div className="pg-body">
        {!isAdmin && (
          <div className="mb-4 rounded-md border border-[#ddd6fe] bg-[var(--pm-bg)] p-3 text-[13px] text-[var(--t2)]">
            <strong className="text-[var(--pm)]">Admin only.</strong> You can view these settings, but configuration is restricted to Workspace Admins.
          </div>
        )}
        <div className="frow">
          <div className="pg-field">
            <label>Project Name</label>
            <input
              disabled={!isAdmin}
              className="fc"
              placeholder="e.g. My SaaS App"
              {...register("name", { required: true })}
            />
          </div>
          <div className="pg-field">
            <label>Short Code</label>
            <input
              disabled
              className="fc mono"
              title="Short code cannot be changed once project is created."
              {...register("code")}
            />
          </div>
        </div>
        <div className="pg-field mt-3">
          <label>Description</label>
          <input
            disabled={!isAdmin}
            className="fc"
            placeholder="Details about the project..."
            {...register("description")}
          />
        </div>
      </div>
    </form>
  );
}

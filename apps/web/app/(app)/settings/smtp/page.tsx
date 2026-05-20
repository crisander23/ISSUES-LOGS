"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, RefreshCw, Trash2 } from "lucide-react";

export default function SmtpSettingsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const [testing, setTesting] = useState(false);

  const { data: smtp, isLoading } = useQuery({
    queryKey: ["smtp"],
    queryFn: async () => {
      const res = await api.get("/api/smtp");
      return res.data.data;
    },
  });

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      host: "",
      port: 587,
      encryption: "TLS",
      username: "",
      password: "",
      fromName: "2DOC Issues Log",
      fromEmail: "",
    },
  });

  useEffect(() => {
    if (smtp) {
      reset({
        host: smtp.host || "",
        port: smtp.port || 587,
        encryption: smtp.encryption || "TLS",
        username: smtp.username || "",
        password: smtp.password || "",
        fromName: smtp.fromName || "2DOC Issues Log",
        fromEmail: smtp.fromEmail || "",
      });
    }
  }, [smtp, reset]);

interface SmtpFormInput {
  host: string;
  port: number | string;
  encryption: string;
  username: string;
  password?: string;
  fromName: string;
  fromEmail: string;
}

interface AxiosErrorLike {
  response?: {
    data?: {
      error?: string;
    };
  };
}

  const testMutation = useMutation({
    mutationFn: async (data: SmtpFormInput) => {
      setTesting(true);
      return api.post("/api/smtp/test", {
        ...data,
        port: Number(data.port),
      });
    },
    onSuccess: () => {
      setTesting(false);
      queryClient.invalidateQueries({ queryKey: ["smtp"] });
      alert("SMTP test connection successful! A test email has been sent.");
    },
    onError: (err: unknown) => {
      setTesting(false);
      alert((err as AxiosErrorLike).response?.data?.error || "SMTP test connection failed. Please check credentials.");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: SmtpFormInput) => {
      return api.post("/api/smtp/save", {
        ...data,
        port: Number(data.port),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smtp"] });
      alert("SMTP configuration saved successfully!");
    },
    onError: (err: unknown) => {
      alert((err as AxiosErrorLike).response?.data?.error || "Failed to save SMTP configuration.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return api.delete("/api/smtp");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["smtp"] });
      reset({
        host: "",
        port: 587,
        encryption: "TLS",
        username: "",
        password: "",
        fromName: "2DOC Issues Log",
        fromEmail: "",
      });
      alert("SMTP configuration deleted.");
    },
  });

  const onSubmit = (data: SmtpFormInput) => {
    saveMutation.mutate(data);
  };

  const onTest = () => {
    // Collect current form values
    const values = watch();
    testMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="p-6 text-xs text-[var(--t3)]">Loading SMTP settings...</div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pg-section">
      <div className="pg-sh">
        <div>
          <div className="pg-sh-title">SMTP Configuration</div>
          <div className="pg-sh-sub">Use your organization email domain for notifications</div>
        </div>
        {smtp ? (
          smtp.isVerified ? (
            <span className="bdg b-Closed flex items-center gap-1">
              <CheckCircle size={12} /> Verified
            </span>
          ) : (
            <span className="bdg b-Open flex items-center gap-1">
              <AlertCircle size={12} /> Unverified
            </span>
          )
        ) : (
          <span className="bdg b-Low">Not Configured</span>
        )}
      </div>
      <div className="pg-body">
        {!isAdmin && (
          <div className="mb-4 rounded-md border border-[#ddd6fe] bg-[var(--pm-bg)] p-3 text-[13px] text-[var(--t2)]">
            <strong className="text-[var(--pm)]">Admin only.</strong> SMTP connection settings can only be managed by Workspace Admins.
          </div>
        )}

        <div className="frow">
          <div className="pg-field flex-1">
            <label>Host</label>
            <input
              disabled={!isAdmin}
              className="fc"
              placeholder="smtp.mailtrap.io"
              {...register("host", { required: true })}
            />
          </div>
          <div className="pg-field max-w-36">
            <label>Port</label>
            <input
              disabled={!isAdmin}
              type="number"
              className="fc mono"
              placeholder="587"
              {...register("port", { required: true })}
            />
          </div>
        </div>

        <div className="frow mt-3">
          <div className="pg-field">
            <label>Encryption</label>
            <select disabled={!isAdmin} className="fc bg-white" {...register("encryption")}>
              <option value="TLS">TLS (STARTTLS)</option>
              <option value="SSL">SSL</option>
              <option value="NONE">None</option>
            </select>
          </div>
          <div className="pg-field">
            <label>Username</label>
            <input
              disabled={!isAdmin}
              className="fc"
              placeholder="SMTP username"
              {...register("username", { required: true })}
            />
          </div>
        </div>

        <div className="frow mt-3">
          <div className="pg-field">
            <label>Password</label>
            <input
              disabled={!isAdmin}
              type="password"
              className="fc"
              placeholder="SMTP password"
              {...register("password", { required: true })}
            />
          </div>
          <div className="pg-field">
            <label>From Name</label>
            <input
              disabled={!isAdmin}
              className="fc"
              placeholder="e.g. 2DOC Notifications"
              {...register("fromName", { required: true })}
            />
          </div>
        </div>

        <div className="pg-field mt-3">
          <label>From Email</label>
          <input
            disabled={!isAdmin}
            type="email"
            className="fc"
            placeholder="noreply@myorganization.com"
            {...register("fromEmail", { required: true })}
          />
        </div>

        {isAdmin && (
          <div className="mt-6 flex justify-between items-center pt-4 border-t border-[var(--border)]">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={testing}
                onClick={onTest}
                className="btn flex items-center gap-1"
              >
                {testing && <RefreshCw size={12} className="animate-spin" />}
                Test Connection
              </button>
              <button type="submit" className="btn btn-fill">Save Configuration</button>
            </div>
            {smtp && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to delete SMTP settings? Standard system notifications will be used instead.")) {
                    deleteMutation.mutate();
                  }
                }}
                className="btn btn-danger flex items-center gap-1"
              >
                <Trash2 size={13} /> Delete Config
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  );
}

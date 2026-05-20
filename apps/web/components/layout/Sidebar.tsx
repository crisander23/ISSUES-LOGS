"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChevronDown, LayoutDashboard, ListFilter, Search, Settings, Users } from "lucide-react";
import { issues, systems } from "@/lib/mock";
import { LogoutButton } from "./LogoutButton";

export function Sidebar() {
  const pathname = usePathname();
  const isAdminConsole = pathname.startsWith("/overview") || pathname.startsWith("/settings/team");
  const counts = {
    all: issues.length,
    open: issues.filter((issue) => issue.status === "Open").length,
    pending: issues.filter((issue) => issue.status === "Pending").length,
    closed: issues.filter((issue) => issue.status === "Closed").length,
  };

  if (isAdminConsole) {
    return (
      <aside className="sb">
        <div className="sb-top">
          <div className="ws-icon">2D</div>
          <div className="ws-name">2DOC Admin</div>
          <ChevronDown size={12} className="text-[var(--t3)]" />
        </div>

        <div className="sb-search">
          <Search size={13} />
          Search projects...
          <kbd>⌘K</kbd>
        </div>

        <div className="sb-sec">
          <div className="sb-lbl">Admin</div>
          <Link className="sb-item on" href="/overview">
            <LayoutDashboard />
            Overview
          </Link>
          <Link className={`sb-item ${pathname.startsWith("/overview") ? "on" : ""}`} href="/overview#projects">
            <Building2 />
            Projects
            <span className="sb-ct">1</span>
          </Link>
          <Link className={`sb-item ${pathname.startsWith("/settings/team") ? "on" : ""}`} href="/settings/team">
            <Users />
            Users
            <span className="sb-ct">4</span>
          </Link>
        </div>

        <div className="sb-div" />

        <div className="sb-sec">
          <div className="sb-lbl">Scope</div>
          <div className="px-2 py-1 text-xs leading-5 text-[var(--t3)]">
            Admin can manage projects and users. Issue boards and system setup belong inside a project workspace.
          </div>
        </div>

        <div className="flex-1" />
        <div className="sb-div" />

        <div className="sb-sec pb-1">
          <Link className={`sb-item ${pathname.startsWith("/settings/team") ? "on" : ""}`} href="/settings/team">
            <Settings />
            User Management
          </Link>
        </div>

        <div className="sb-user">
          <div className="text-[11px] uppercase tracking-[.03em] text-[var(--t4)]">Signed in as</div>
          <div className="mt-1 flex items-center gap-2">
            <div className="tm-av bg-[var(--pm)]">ML</div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium">Maria Lopez</div>
              <div className="text-[11px] text-[var(--t3)]">Admin</div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>
    );
  }

  return (
    <aside className="sb">
      <div className="sb-top">
        <div className="ws-icon">2D</div>
        <div className="ws-name">Demo Project</div>
        <ChevronDown size={12} className="text-[var(--t3)]" />
      </div>

      <div className="sb-search">
        <Search size={13} />
        Search issues...
        <kbd>⌘K</kbd>
      </div>

      <div className="sb-sec">
        <Link className={`sb-item ${pathname === "/overview" ? "on" : ""}`} href="/overview">
          <LayoutDashboard />
          Overview
        </Link>
        <div className="sb-lbl">Issues</div>
        <Link className={`sb-item ${pathname === "/board" || pathname === "/list" ? "on" : ""}`} href="/board">
          <ListFilter />
          All Issues
          <span className="sb-ct">{counts.all}</span>
        </Link>
        <Link className="sb-item" href="/board?status=Open">
          <span className="sb-dot d-open" />
          Open
          <span className="sb-ct">{counts.open}</span>
        </Link>
        <Link className="sb-item" href="/board?status=Pending">
          <span className="sb-dot d-pend" />
          Pending Review
          <span className="sb-ct">{counts.pending}</span>
        </Link>
        <Link className="sb-item" href="/board?status=Closed">
          <span className="sb-dot d-done" />
          Closed
          <span className="sb-ct">{counts.closed}</span>
        </Link>
      </div>

      <div className="sb-div" />

      <div className="sb-sec">
        <div className="sb-lbl">Systems</div>
        {systems.map((system) => (
          <Link key={system} className="sb-item" href={`/board?system=${encodeURIComponent(system)}`}>
            <ListFilter />
            {system}
            <span className="sb-ct">{issues.filter((issue) => issue.system === system).length}</span>
          </Link>
        ))}
      </div>

      <div className="flex-1" />
      <div className="sb-div" />

      <div className="sb-sec pb-1">
        <Link className={`sb-item ${pathname.startsWith("/settings") ? "on" : ""}`} href="/settings/project">
          <Settings />
          Settings
        </Link>
      </div>

      <div className="sb-user">
        <div className="text-[11px] uppercase tracking-[.03em] text-[var(--t4)]">Signed in as</div>
        <div className="mt-1 flex items-center gap-2">
          <div className="tm-av bg-[var(--pm)]">ML</div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium">Maria Lopez</div>
            <div className="text-[11px] text-[var(--t3)]">Admin</div>
          </div>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}

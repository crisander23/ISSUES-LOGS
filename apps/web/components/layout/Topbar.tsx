"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, KanbanSquare, List, Plus, Settings } from "lucide-react";

function currentLabel(pathname: string) {
  if (pathname.startsWith("/settings/team")) return "Users";
  if (pathname.startsWith("/list")) return "List";
  if (pathname.startsWith("/overview")) return "Overview";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Board";
}

function workspaceLabel(pathname: string) {
  if (pathname.startsWith("/overview") || pathname.startsWith("/settings/team")) return "2DOC Admin";
  return "Demo Project";
}

export function Topbar() {
  const pathname = usePathname();
  const isBoard = pathname.startsWith("/board");
  const isList = pathname.startsWith("/list");
  const isManagerPage = pathname.startsWith("/settings") || pathname.startsWith("/overview");
  const isAdminPage = pathname.startsWith("/overview") || pathname.startsWith("/settings/team");

  return (
    <header className="topbar">
      <div className="tbc">
        <span>{workspaceLabel(pathname)}</span>
        <span className="text-[var(--t4)]">/</span>
        <span className="cur">{currentLabel(pathname)}</span>
      </div>

      <div className="tb-r">
        {!isManagerPage && (
          <>
            <div className="vtabs">
              <Link href="/board" className={`vtab ${isBoard ? "on" : ""}`}>
                <KanbanSquare size={13} />
                Board
              </Link>
              <Link href="/list" className={`vtab ${isList ? "on" : ""}`}>
                <List size={13} />
                List
              </Link>
            </div>
            <button className="btn">
              <Download size={13} />
              Export
            </button>
          </>
        )}
        <Link href={isAdminPage ? "/settings/team" : "/settings/project"} className="btn btn-pm">
          <Settings size={13} />
          {isAdminPage ? "User Management" : "Settings"}
        </Link>
        {!isManagerPage && (
          <button className="btn btn-fill">
            <Plus size={13} />
            New Issue
          </button>
        )}
      </div>
    </header>
  );
}

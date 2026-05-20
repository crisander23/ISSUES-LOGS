"use client";

import { usePathname } from "next/navigation";
import { Filter, Search, SlidersHorizontal } from "lucide-react";
import { issues, systems } from "@/lib/mock";

export function FilterBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/settings") || pathname.startsWith("/overview")) return null;

  return (
    <div className="filterbar">
      <div className="fi">
        <Search size={13} className="text-[var(--t4)]" />
        <input placeholder="Search issues..." />
      </div>
      <div className="fsel">
        <Filter size={11} className="text-[var(--t4)]" />
        <select defaultValue="">
          <option value="">Category</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>
      <div className="fsel">
        <SlidersHorizontal size={11} className="text-[var(--t4)]" />
        <select defaultValue="">
          <option value="">System</option>
          {systems.map((system) => (
            <option key={system}>{system}</option>
          ))}
        </select>
      </div>
      <div className="fb-r">
        <span className="fb-ct">{issues.length} issues</span>
        <button className="text-xs text-[var(--t4)] hover:text-[var(--t2)]">Clear</button>
      </div>
    </div>
  );
}

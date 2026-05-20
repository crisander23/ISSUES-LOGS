import { FilterBar } from "@/components/layout/FilterBar";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard>
      <div className="app-frame">
        <Sidebar />
        <div className="main">
          <Topbar />
          <FilterBar />
          {children}
        </div>
      </div>
    </RoleGuard>
  );
}

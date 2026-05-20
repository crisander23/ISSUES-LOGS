export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page">
      <div className="pg-inner">
        <div className="pg-header">
          <div className="pg-title">Settings</div>
          <div className="pg-sub">Manage your project, systems, team members, and SMTP configuration.</div>
        </div>
        {children}
      </div>
    </div>
  );
}

import { BarChart3, Bell, Database, Gauge, MessageSquareText, Settings, Workflow } from 'lucide-react';

const navItems = [
  { label: 'Overview', icon: Gauge, active: true },
  { label: 'Feedback', icon: MessageSquareText },
  { label: 'Analytics', icon: BarChart3 },
  { label: 'Sources', icon: Database },
  { label: 'Automation', icon: Workflow },
  { label: 'Alerts', icon: Bell },
  { label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="sidebar glass-panel" aria-label="Primary navigation">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">OS</div>
        <div>
          <strong>OmniSense AI</strong>
          <span>Sentiment analytics</span>
        </div>
      </div>
      <nav className="nav-list">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`nav-item cursor-pointer ${item.active ? 'active' : ''}`}
              type="button"
              key={item.label}
              aria-current={item.active ? 'page' : undefined}
            >
              <Icon aria-hidden="true" size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <span>Workspace</span>
        <strong>Demo Retail VN</strong>
      </div>
    </aside>
  );
}

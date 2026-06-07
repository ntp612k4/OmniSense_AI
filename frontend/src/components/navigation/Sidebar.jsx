import { BarChart3, Bell, Database, FlaskConical, Gauge, MessageSquareText, Settings, Workflow } from 'lucide-react';

const navItems = [
  { id: 'overview', label: 'Tong quan', icon: Gauge },
  { id: 'test-lab', label: 'Test Lab', icon: FlaskConical },
  { id: 'feedback', label: 'Phan hoi', icon: MessageSquareText },
  { id: 'analytics', label: 'Phan tich', icon: BarChart3 },
  { id: 'sources', label: 'Nguon du lieu', icon: Database },
  { id: 'automation', label: 'Tu dong hoa', icon: Workflow },
  { id: 'alerts', label: 'Canh bao', icon: Bell },
  { id: 'settings', label: 'Cai dat', icon: Settings },
];

export function Sidebar({ activeView, onViewChange }) {
  return (
    <aside className="sidebar glass-panel" aria-label="Primary navigation">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">OS</div>
        <div>
          <strong>OmniSense AI</strong>
          <span>Phan tich cam xuc</span>
        </div>
      </div>
      <nav className="nav-list">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              className={`nav-item cursor-pointer ${isActive ? 'active' : ''}`}
              type="button"
              key={item.label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onViewChange(item.id)}
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

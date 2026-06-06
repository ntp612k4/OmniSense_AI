import { BarChart3, BrainCircuit, Database, FileDown, Search, Settings, ShieldCheck } from 'lucide-react';
import { ChartPanel } from './chart/ChartPanel.jsx';
import { DataTable } from './data-table/DataTable.jsx';
import { KpiCard } from './kpi/KpiCard.jsx';
import { Sidebar } from './navigation/Sidebar.jsx';
import { ThemeToggle } from './theme/ThemeToggle.jsx';
import { kpis } from '../data/dashboardData.js';

export function DashboardLayout() {
  return (
    <div className="dashboard-shell">
      <Sidebar />
      <main className="main-panel">
        <header className="top-header">
          <div>
            <p className="section-kicker">Customer Intelligence</p>
            <h1>OmniSense AI Dashboard</h1>
            <p className="header-subtitle">Monitor customer sentiment, channel health, and AI analysis quality in one workspace.</p>
          </div>
          <div className="header-actions">
            <label className="search-box" htmlFor="dashboard-search">
              <Search aria-hidden="true" size={18} />
              <input id="dashboard-search" type="search" placeholder="Search feedback" />
            </label>
            <ThemeToggle />
            <button className="export-button cursor-pointer" type="button">
              <FileDown aria-hidden="true" size={18} />
              Export Report
            </button>
          </div>
        </header>

        <section className="status-grid" aria-label="System status">
          <div className="status-item glass-panel">
            <BrainCircuit aria-hidden="true" size={20} />
            <span>MTL model online</span>
          </div>
          <div className="status-item glass-panel">
            <Database aria-hidden="true" size={20} />
            <span>MySQL sync ready</span>
          </div>
          <div className="status-item glass-panel">
            <ShieldCheck aria-hidden="true" size={20} />
            <span>Data quality checked</span>
          </div>
          <div className="status-item glass-panel">
            <BarChart3 aria-hidden="true" size={20} />
            <span>Weekly trend active</span>
          </div>
        </section>

        <section className="kpi-grid" aria-label="Key performance indicators">
          {kpis.map((item) => (
            <KpiCard key={item.label} item={item} />
          ))}
        </section>

        <section className="content-grid">
          <ChartPanel />
          <aside className="insight-panel glass-panel">
            <div>
              <p className="section-kicker">AI Insight</p>
              <h2>Service friction increased in billing conversations.</h2>
              <p>
                Negative billing reviews are up 6.3% from the previous period. The most common phrase cluster mentions
                delayed confirmation and unclear refund timing.
              </p>
            </div>
            <button className="secondary-action cursor-pointer" type="button">
              <Settings aria-hidden="true" size={17} />
              Tune alert rules
            </button>
          </aside>
        </section>

        <DataTable />
      </main>
    </div>
  );
}

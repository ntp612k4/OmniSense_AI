import { useMemo, useState } from 'react';
import {
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Database,
  FileDown,
  Search,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { ChartPanel } from './chart/ChartPanel.jsx';
import { DataTable } from './data-table/DataTable.jsx';
import { KpiCard } from './kpi/KpiCard.jsx';
import { Sidebar } from './navigation/Sidebar.jsx';
import { TestLab } from './test-lab/TestLab.jsx';
import { ThemeToggle } from './theme/ThemeToggle.jsx';
import { feedbackRows, kpis } from '../data/dashboardData.js';

const viewCopy = {
  overview: {
    kicker: 'Customer Intelligence',
    title: 'OmniSense AI Dashboard',
    subtitle: 'Monitor customer sentiment, channel health, and AI analysis quality in one workspace.',
  },
  'test-lab': {
    kicker: 'Evaluation workspace',
    title: 'Test Lab',
    subtitle: 'Run a demo review classification, inspect the result, and add it to the feedback table.',
  },
  feedback: {
    kicker: 'Customer feedback',
    title: 'Feedback Queue',
    subtitle: 'Review classified feedback, search by channel or sentiment, and prepare reports.',
  },
  analytics: {
    kicker: 'Sentiment analytics',
    title: 'Trend Analytics',
    subtitle: 'Track weekly positive, neutral, and negative movement across connected channels.',
  },
  sources: {
    kicker: 'Data sources',
    title: 'Source Connections',
    subtitle: 'Manage review channels and ingestion readiness for the analytics pipeline.',
  },
  automation: {
    kicker: 'Workflow automation',
    title: 'Automation Rules',
    subtitle: 'Route negative reviews, trigger alerts, and keep follow-up workflows consistent.',
  },
  alerts: {
    kicker: 'Alert policy',
    title: 'Alert Center',
    subtitle: 'Tune escalation thresholds for negative sentiment and low-confidence analysis.',
  },
  settings: {
    kicker: 'Workspace settings',
    title: 'Settings',
    subtitle: 'Configure database mode, model profile, and workspace preferences.',
  },
};

const sourceCards = [
  { name: 'Facebook', status: 'Connected', volume: '9,420 reviews' },
  { name: 'CSV Upload', status: 'Ready', volume: 'Manual batch import' },
  { name: 'Email', status: 'Connected', volume: '2,140 messages' },
  { name: 'App Store', status: 'Queued', volume: 'API sync pending' },
];

function percentNumber(value) {
  return Number(String(value).replace('%', ''));
}

function buildCsv(rows) {
  const headers = ['Source', 'Review', 'Sentiment', 'Domain', 'Language', 'Confidence', 'Status'];
  const lines = rows.map((row) =>
    headers
      .map((key) => {
        const value = row[key.toLowerCase()] ?? row[key] ?? '';
        return `"${String(value).replaceAll('"', '""')}"`;
      })
      .join(','),
  );

  return [headers.join(','), ...lines].join('\n');
}

export function DashboardLayout() {
  const [activeView, setActiveView] = useState('overview');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState(() =>
    [...feedbackRows].sort((a, b) => percentNumber(b.confidence) - percentNumber(a.confidence)),
  );
  const [sortDirection, setSortDirection] = useState('desc');
  const [latestEvaluation, setLatestEvaluation] = useState(null);
  const [alertPanelOpen, setAlertPanelOpen] = useState(false);
  const [toast, setToast] = useState('');

  const copy = viewCopy[activeView] ?? viewCopy.overview;

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return rows;
    }

    return rows.filter((row) =>
      [row.source, row.review, row.sentiment, row.domain, row.language, row.status].some((value) =>
        String(value).toLowerCase().includes(term),
      ),
    );
  }, [query, rows]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  function handleSort() {
    const nextDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    setSortDirection(nextDirection);
    setRows((currentRows) =>
      [...currentRows].sort((a, b) => {
        const diff = percentNumber(a.confidence) - percentNumber(b.confidence);
        return nextDirection === 'desc' ? -diff : diff;
      }),
    );
  }

  function handleExport() {
    const csv = buildCsv(filteredRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'omnisense-feedback-report.csv';
    link.click();
    URL.revokeObjectURL(url);
    showToast('Report exported as CSV.');
  }

  function handleEvaluationComplete(result) {
    setLatestEvaluation(result);
    setRows((currentRows) => [result, ...currentRows]);
    showToast('Evaluation added to feedback table.');
  }

  function renderSimpleView(type) {
    if (type === 'sources') {
      return (
        <section className="workspace-panel glass-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Connected channels</p>
              <h2>Source health</h2>
            </div>
          </div>
          <div className="source-grid">
            {sourceCards.map((source) => (
              <article className="source-card" key={source.name}>
                <span>{source.status}</span>
                <strong>{source.name}</strong>
                <p>{source.volume}</p>
              </article>
            ))}
          </div>
        </section>
      );
    }

    if (type === 'automation' || type === 'alerts' || type === 'settings') {
      return (
        <section className="workspace-panel glass-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">{copy.kicker}</p>
              <h2>{copy.title}</h2>
            </div>
          </div>
          <div className="settings-grid">
            <label className="toggle-row">
              <span>Escalate negative feedback</span>
              <input className="cursor-pointer" type="checkbox" defaultChecked />
            </label>
            <label className="toggle-row">
              <span>Require confidence above 80%</span>
              <input className="cursor-pointer" type="checkbox" defaultChecked />
            </label>
            <label className="toggle-row">
              <span>Sync results to MySQL</span>
              <input className="cursor-pointer" type="checkbox" defaultChecked />
            </label>
          </div>
        </section>
      );
    }

    return null;
  }

  function renderActiveContent() {
    if (activeView === 'test-lab') {
      return (
        <>
          <TestLab onEvaluationComplete={handleEvaluationComplete} latestEvaluation={latestEvaluation} />
          <DataTable rows={filteredRows} onSort={handleSort} sortDirection={sortDirection} />
        </>
      );
    }

    if (activeView === 'feedback') {
      return <DataTable rows={filteredRows} onSort={handleSort} sortDirection={sortDirection} />;
    }

    if (activeView === 'analytics') {
      return (
        <section className="content-grid">
          <ChartPanel />
          <aside className="insight-panel glass-panel">
            <div>
              <p className="section-kicker">AI Insight</p>
              <h2>Neutral feedback needs clearer follow-up ownership.</h2>
              <p>
                The neutral segment is often a pending decision, not a satisfied customer. Route these reviews to a
                follow-up queue before they become negative.
              </p>
            </div>
          </aside>
        </section>
      );
    }

    if (['sources', 'automation', 'alerts', 'settings'].includes(activeView)) {
      return renderSimpleView(activeView);
    }

    return (
      <>
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
            <button
              className="secondary-action cursor-pointer"
              type="button"
              onClick={() => setAlertPanelOpen((value) => !value)}
            >
              <Settings aria-hidden="true" size={17} />
              Tune alert rules
            </button>
          </aside>
        </section>

        {alertPanelOpen && (
          <section className="alert-panel glass-panel" aria-live="polite">
            <CheckCircle2 aria-hidden="true" size={20} />
            <div>
              <strong>Alert rules ready to tune</strong>
              <p>Negative sentiment above 12% or confidence below 80% will create a review task.</p>
            </div>
          </section>
        )}

        <DataTable rows={filteredRows} onSort={handleSort} sortDirection={sortDirection} />
      </>
    );
  }

  return (
    <div className="dashboard-shell">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="main-panel">
        <header className="top-header">
          <div>
            <p className="section-kicker">{copy.kicker}</p>
            <h1>{copy.title}</h1>
            <p className="header-subtitle">{copy.subtitle}</p>
          </div>
          <div className="header-actions">
            <label className="search-box" htmlFor="dashboard-search">
              <Search aria-hidden="true" size={18} />
              <input
                id="dashboard-search"
                type="search"
                placeholder="Search feedback"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <ThemeToggle />
            <button className="export-button cursor-pointer" type="button" onClick={handleExport}>
              <FileDown aria-hidden="true" size={18} />
              Export Report
            </button>
          </div>
        </header>

        {renderActiveContent()}
        {toast && <div className="toast glass-panel">{toast}</div>}
      </main>
    </div>
  );
}

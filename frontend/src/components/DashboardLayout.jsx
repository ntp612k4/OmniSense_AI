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
import { feedbackRows } from '../data/dashboardData.js';

const viewCopy = {
  overview: {
    kicker: 'Customer intelligence',
    title: 'OmniSense AI Dashboard',
    subtitle: 'Monitor customer sentiment, channel health, and AI analysis quality in one workspace.',
  },
  'test-lab': {
    kicker: 'Evaluation workspace',
    title: 'Test Lab',
    subtitle: 'Enter one review or upload a CSV so the real AI engine can analyze it and update the dashboard.',
  },
  feedback: {
    kicker: 'Customer feedback',
    title: 'Feedback Queue',
    subtitle: 'Review classification results and search by channel, sentiment, domain, or status.',
  },
  analytics: {
    kicker: 'Sentiment analytics',
    title: 'Analytics View',
    subtitle: 'Charts update from the real data you enter manually or upload from CSV.',
  },
  sources: {
    kicker: 'Data sources',
    title: 'Source Connections',
    subtitle: 'Monitor review sources and ingestion readiness across the system.',
  },
  automation: {
    kicker: 'Automation',
    title: 'Workflow Rules',
    subtitle: 'Route negative feedback, create alerts, and keep follow-up workflows consistent.',
  },
  alerts: {
    kicker: 'Alert policy',
    title: 'Alert Center',
    subtitle: 'Tune escalation thresholds for negative sentiment and low-confidence analysis.',
  },
  settings: {
    kicker: 'Workspace settings',
    title: 'Settings',
    subtitle: 'Configure database, AI model, and workspace operation preferences.',
  },
};

const sourceCards = [
  { name: 'Facebook', status: 'Connected', volume: '9,420 reviews' },
  { name: 'CSV Upload', status: 'Ready', volume: 'Manual file import' },
  { name: 'Email', status: 'Connected', volume: '2,140 messages' },
  { name: 'App Store', status: 'Queued', volume: 'Waiting for API sync' },
];

function percentNumber(value) {
  return Number(String(value).replace('%', ''));
}

function normalizeRow(row) {
  const confidence =
    row.confidence ??
    (typeof row.sentiment_confidence === 'number' ? `${(row.sentiment_confidence * 100).toFixed(1)}%` : '0.0%');

  return {
    id: row.id ?? `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    source: row.source ?? 'Manual Test',
    review: row.review ?? row.review_text ?? '',
    sentiment: row.sentiment ?? 'Neutral',
    domain: row.domain ?? 'Unsupported',
    language: row.language ?? row.language_code ?? 'Unsupported',
    confidence,
    status: row.status ?? (row.sentiment === 'Negative' ? 'Escalate' : row.sentiment === 'Positive' ? 'Resolved' : 'Review'),
    sentiment_confidence: row.sentiment_confidence ?? percentNumber(confidence) / 100,
  };
}

function buildCsv(rows) {
  const headers = ['source', 'review', 'sentiment', 'domain', 'language', 'confidence', 'status'];
  const labels = ['Source', 'Review', 'Sentiment', 'Domain', 'Language', 'Confidence', 'Status'];
  const lines = rows.map((row) =>
    headers
      .map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`)
      .join(','),
  );

  return [labels.join(','), ...lines].join('\n');
}

function summarizeRows(rows) {
  const total = rows.length;
  const negative = rows.filter((row) => row.sentiment === 'Negative').length;
  const neutral = rows.filter((row) => row.sentiment === 'Neutral').length;
  const positive = rows.filter((row) => row.sentiment === 'Positive').length;
  const confidence = total ? rows.reduce((sum, row) => sum + percentNumber(row.confidence), 0) / total : 0;

  return {
    total,
    negative,
    neutral,
    positive,
    negativeRate: total ? (negative / total) * 100 : 0,
    neutralRate: total ? (neutral / total) * 100 : 0,
    positiveRate: total ? (positive / total) * 100 : 0,
    confidence,
  };
}

function buildKpis(rows) {
  const metrics = summarizeRows(rows);
  return [
    {
      label: 'Total feedback',
      value: metrics.total.toLocaleString('en-US'),
      delta: `${metrics.total} rows`,
      tone: 'blue',
      description: 'Currently shown in this workspace',
    },
    {
      label: 'Negative rate',
      value: `${metrics.negativeRate.toFixed(1)}%`,
      delta: `${metrics.negative} priority`,
      tone: 'red',
      description: 'Needs follow-up',
    },
    {
      label: 'Neutral rate',
      value: `${metrics.neutralRate.toFixed(1)}%`,
      delta: `${metrics.neutral} to monitor`,
      tone: 'slate',
      description: 'May need follow-up',
    },
    {
      label: 'AI confidence',
      value: `${metrics.confidence.toFixed(1)}%`,
      delta: `${metrics.positive} positive`,
      tone: 'amber',
      description: 'Average confidence',
    },
  ];
}

export function DashboardLayout() {
  const [activeView, setActiveView] = useState('overview');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState(() =>
    feedbackRows
      .map(normalizeRow)
      .sort((a, b) => percentNumber(b.confidence) - percentNumber(a.confidence)),
  );
  const [sortDirection, setSortDirection] = useState('desc');
  const [latestEvaluation, setLatestEvaluation] = useState(null);
  const [alertPanelOpen, setAlertPanelOpen] = useState(false);
  const [toast, setToast] = useState('');

  const copy = viewCopy[activeView] ?? viewCopy.overview;
  const kpiCards = useMemo(() => buildKpis(rows), [rows]);

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
    const row = normalizeRow(result);
    setLatestEvaluation(row);
    setRows((currentRows) => [row, ...currentRows]);
  }

  function handleBatchComplete(results) {
    const nextRows = results
      .map(normalizeRow)
      .sort((a, b) => percentNumber(b.confidence) - percentNumber(a.confidence));
    setRows(nextRows);
    setLatestEvaluation(nextRows[0] ?? null);
    setActiveView('overview');
  }

  function renderSimpleView(type) {
    if (type === 'sources') {
      return (
        <section className="workspace-panel glass-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Data channels</p>
              <h2>Connection status</h2>
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
              <span>Automatically route negative feedback to the review queue</span>
              <input className="cursor-pointer" type="checkbox" defaultChecked />
            </label>
            <label className="toggle-row">
              <span>Require confidence above 80%</span>
              <input className="cursor-pointer" type="checkbox" defaultChecked />
            </label>
            <label className="toggle-row">
              <span>Save results to MySQL</span>
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
          <TestLab
            latestEvaluation={latestEvaluation}
            onBatchComplete={handleBatchComplete}
            onEvaluationComplete={handleEvaluationComplete}
            onNotify={showToast}
          />
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
          <ChartPanel rows={rows} />
          <aside className="insight-panel glass-panel">
            <div>
              <p className="section-kicker">AI insight</p>
              <h2>Neutral feedback should be monitored early.</h2>
              <p>
                Neutral feedback often means the customer is waiting for a clear answer. Route these reviews to a
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
            <span>MTL model ready</span>
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
            <span>Charts update from files</span>
          </div>
        </section>

        <section className="kpi-grid" aria-label="Key performance indicators">
          {kpiCards.map((item) => (
            <KpiCard key={item.label} item={item} />
          ))}
        </section>

        <section className="content-grid">
          <ChartPanel rows={rows} />
          <aside className="insight-panel glass-panel">
            <div>
              <p className="section-kicker">AI insight</p>
              <h2>Uploaded data updates charts directly in the dashboard.</h2>
              <p>
                Go to Test Lab and upload a CSV with a review or text column. The system calls the real AI engine,
                saves results to MySQL, and redraws KPIs, charts, and tables from your data.
              </p>
            </div>
            <button
              className="secondary-action cursor-pointer"
              type="button"
              onClick={() => setAlertPanelOpen((value) => !value)}
            >
              <Settings aria-hidden="true" size={17} />
              Tune alerts
            </button>
          </aside>
        </section>

        {alertPanelOpen && (
          <section className="alert-panel glass-panel" aria-live="polite">
            <CheckCircle2 aria-hidden="true" size={20} />
            <div>
              <strong>Alert rules are ready</strong>
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

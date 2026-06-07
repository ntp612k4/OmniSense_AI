import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Database,
  FileDown,
  PlugZap,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  TestTube2,
  Workflow,
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

const AI_API_BASE =
  import.meta.env.VITE_AI_API_URL || `${window.location.protocol}//${window.location.hostname}:8502`;

const sourceDefaults = {
  Facebook: { connected: true, status: 'Connected', lastSync: 'Today 09:12' },
  'CSV Upload': { connected: true, status: 'Ready', lastSync: 'Manual import' },
  Email: { connected: true, status: 'Connected', lastSync: 'Today 08:44' },
  'App Store': { connected: false, status: 'Queued', lastSync: 'Waiting for API key' },
};

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

function formatClock() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getSourceMetrics(rows, sourceName) {
  const sourceRows = rows.filter((row) => row.source === sourceName);
  return {
    total: sourceRows.length,
    negative: sourceRows.filter((row) => row.sentiment === 'Negative').length,
    confidence: sourceRows.length
      ? sourceRows.reduce((sum, row) => sum + percentNumber(row.confidence), 0) / sourceRows.length
      : 0,
  };
}

function buildAlertRows(rows, rules, resolvedAlertIds) {
  const resolvedSet = new Set(resolvedAlertIds);
  const negativeRateActive = summarizeRows(rows).negativeRate >= rules.negativeThreshold;
  return rows
    .flatMap((row) => {
      const alerts = [];
      if (rules.routeNegative && negativeRateActive && row.sentiment === 'Negative') {
        alerts.push({
          id: `${row.id}-negative`,
          type: 'Negative sentiment',
          severity: 'High',
          row,
        });
      }
      if (rules.requireConfidence && percentNumber(row.confidence) < rules.minConfidence) {
        alerts.push({
          id: `${row.id}-confidence`,
          type: 'Low confidence',
          severity: 'Medium',
          row,
        });
      }
      return alerts;
    })
    .map((alert) => ({
      ...alert,
      resolved: resolvedSet.has(alert.id),
    }));
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
  const [sourceState, setSourceState] = useState(sourceDefaults);
  const [automationRules, setAutomationRules] = useState({
    routeNegative: true,
    requireConfidence: true,
    saveMysql: true,
    autoExport: false,
    negativeThreshold: 12,
    minConfidence: 80,
  });
  const [resolvedAlertIds, setResolvedAlertIds] = useState([]);
  const [lastAutomationRun, setLastAutomationRun] = useState('Never');
  const [workspaceSettings, setWorkspaceSettings] = useState({
    workspaceName: 'Demo Retail VN',
    apiUrl: AI_API_BASE,
    databaseHost: '127.0.0.1:3308',
    modelName: 'MTL - Multi-Task Learning',
    retentionDays: 90,
  });
  const [apiHealth, setApiHealth] = useState('Not checked');

  const copy = viewCopy[activeView] ?? viewCopy.overview;
  const kpiCards = useMemo(() => buildKpis(rows), [rows]);
  const alertRows = useMemo(
    () => buildAlertRows(rows, automationRules, resolvedAlertIds),
    [automationRules, resolvedAlertIds, rows],
  );
  const activeAlertRows = alertRows.filter((alert) => !alert.resolved);

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

  function updateRule(key, value) {
    setAutomationRules((currentRules) => ({
      ...currentRules,
      [key]: value,
    }));
  }

  function updateWorkspaceSetting(key, value) {
    setWorkspaceSettings((currentSettings) => ({
      ...currentSettings,
      [key]: value,
    }));
  }

  function handleSourceToggle(sourceName) {
    const nextConnected = !sourceState[sourceName].connected;
    setSourceState((currentSources) => ({
      ...currentSources,
      [sourceName]: {
        ...currentSources[sourceName],
        connected: nextConnected,
        status: nextConnected ? 'Connected' : 'Disconnected',
        lastSync: nextConnected ? formatClock() : currentSources[sourceName].lastSync,
      },
    }));
    showToast(`${sourceName} ${nextConnected ? 'connected' : 'disconnected'}.`);
  }

  function handleSourceSync(sourceName) {
    setSourceState((currentSources) => ({
      ...currentSources,
      [sourceName]: {
        ...currentSources[sourceName],
        connected: true,
        status: 'Connected',
        lastSync: formatClock(),
      },
    }));
    showToast(`${sourceName} sync completed.`);
  }

  function handleRunAutomation() {
    setLastAutomationRun(formatClock());
    showToast(`${activeAlertRows.length} workflow items evaluated.`);
  }

  function toggleAlertResolution(alertId) {
    setResolvedAlertIds((currentIds) =>
      currentIds.includes(alertId) ? currentIds.filter((id) => id !== alertId) : [...currentIds, alertId],
    );
  }

  async function handleCheckApi() {
    setApiHealth('Checking');
    try {
      const response = await fetch(`${workspaceSettings.apiUrl}/health`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setApiHealth('Online');
      showToast('AI API is online.');
    } catch {
      setApiHealth('Offline');
      showToast('AI API health check failed.');
    }
  }

  function handleSaveSettings() {
    showToast('Workspace settings saved.');
  }

  function renderSourcesView() {
    return (
      <section className="workspace-panel glass-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Data channels</p>
            <h2>Connection status</h2>
          </div>
          <button className="secondary-action cursor-pointer" type="button" onClick={() => setActiveView('test-lab')}>
            <TestTube2 aria-hidden="true" size={17} />
            Open Test Lab
          </button>
        </div>

        <div className="source-grid">
          {Object.entries(sourceState).map(([sourceName, source]) => {
            const metrics = getSourceMetrics(rows, sourceName);
            return (
              <article className="source-card management-card" key={sourceName}>
                <div className="source-header">
                  <div>
                    <span>{source.status}</span>
                    <strong>{sourceName}</strong>
                  </div>
                  <span className={source.connected ? 'status-dot online' : 'status-dot offline'} />
                </div>
                <div className="mini-metrics">
                  <div>
                    <small>Rows</small>
                    <b>{metrics.total}</b>
                  </div>
                  <div>
                    <small>Negative</small>
                    <b>{metrics.negative}</b>
                  </div>
                  <div>
                    <small>Avg confidence</small>
                    <b>{metrics.confidence.toFixed(1)}%</b>
                  </div>
                </div>
                <p>
                  <Clock aria-hidden="true" size={15} />
                  Last sync: {source.lastSync}
                </p>
                <div className="card-actions">
                  <button
                    className="secondary-action compact-action cursor-pointer"
                    type="button"
                    onClick={() => handleSourceSync(sourceName)}
                  >
                    <RefreshCw aria-hidden="true" size={15} />
                    Sync
                  </button>
                  <button
                    className="secondary-action compact-action cursor-pointer"
                    type="button"
                    onClick={() => handleSourceToggle(sourceName)}
                  >
                    <PlugZap aria-hidden="true" size={15} />
                    {source.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderAutomationView() {
    const negativeRateActive = summarizeRows(rows).negativeRate >= automationRules.negativeThreshold;
    const affectedRows = rows.filter(
      (row) =>
        (automationRules.routeNegative && negativeRateActive && row.sentiment === 'Negative') ||
        (automationRules.requireConfidence && percentNumber(row.confidence) < automationRules.minConfidence),
    );

    return (
      <section className="workspace-panel glass-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Automation</p>
            <h2>Workflow Rules</h2>
          </div>
          <button className="export-button cursor-pointer" type="button" onClick={handleRunAutomation}>
            <Workflow aria-hidden="true" size={17} />
            Run rules now
          </button>
        </div>

        <div className="management-grid">
          <div className="settings-grid">
            <label className="toggle-row">
              <span>Route negative feedback to the review queue</span>
              <input
                className="cursor-pointer"
                type="checkbox"
                checked={automationRules.routeNegative}
                onChange={(event) => updateRule('routeNegative', event.target.checked)}
              />
            </label>
            <label className="toggle-row">
              <span>Require confidence above {automationRules.minConfidence}%</span>
              <input
                className="cursor-pointer"
                type="checkbox"
                checked={automationRules.requireConfidence}
                onChange={(event) => updateRule('requireConfidence', event.target.checked)}
              />
            </label>
            <label className="toggle-row">
              <span>Save AI results to MySQL</span>
              <input
                className="cursor-pointer"
                type="checkbox"
                checked={automationRules.saveMysql}
                onChange={(event) => updateRule('saveMysql', event.target.checked)}
              />
            </label>
            <label className="toggle-row">
              <span>Auto-export high priority reports</span>
              <input
                className="cursor-pointer"
                type="checkbox"
                checked={automationRules.autoExport}
                onChange={(event) => updateRule('autoExport', event.target.checked)}
              />
            </label>
          </div>

          <aside className="management-card">
            <p className="section-kicker">Rule preview</p>
            <h2>{affectedRows.length} rows affected</h2>
            <div className="range-row">
              <label htmlFor="confidence-threshold">Minimum confidence</label>
              <strong>{automationRules.minConfidence}%</strong>
              <input
                id="confidence-threshold"
                className="cursor-pointer"
                type="range"
                min="50"
                max="99"
                value={automationRules.minConfidence}
                onChange={(event) => updateRule('minConfidence', Number(event.target.value))}
              />
            </div>
            <div className="range-row">
              <label htmlFor="negative-threshold">Negative rate threshold</label>
              <strong>{automationRules.negativeThreshold}%</strong>
              <input
                id="negative-threshold"
                className="cursor-pointer"
                type="range"
                min="1"
                max="50"
                value={automationRules.negativeThreshold}
                onChange={(event) => updateRule('negativeThreshold', Number(event.target.value))}
              />
            </div>
            <p className="management-note">Last run: {lastAutomationRun}</p>
          </aside>
        </div>
      </section>
    );
  }

  function renderAlertsView() {
    const highCount = activeAlertRows.filter((alert) => alert.severity === 'High').length;
    const resolvedCount = alertRows.filter((alert) => alert.resolved).length;

    return (
      <section className="workspace-panel glass-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Alert policy</p>
            <h2>Alert Center</h2>
          </div>
          <button className="secondary-action cursor-pointer" type="button" onClick={() => setActiveView('automation')}>
            <SlidersHorizontal aria-hidden="true" size={17} />
            Tune rules
          </button>
        </div>

        <div className="mini-metrics alert-summary">
          <div>
            <small>Active alerts</small>
            <b>{activeAlertRows.length}</b>
          </div>
          <div>
            <small>High severity</small>
            <b>{highCount}</b>
          </div>
          <div>
            <small>Resolved</small>
            <b>{resolvedCount}</b>
          </div>
        </div>

        <div className="alert-list">
          {alertRows.length ? (
            alertRows.map((alert) => (
              <article className={`alert-item ${alert.resolved ? 'resolved' : ''}`} key={alert.id}>
                <div className={`alert-severity ${alert.severity.toLowerCase()}`}>
                  <AlertTriangle aria-hidden="true" size={17} />
                  {alert.severity}
                </div>
                <div>
                  <strong>{alert.type}</strong>
                  <p>{alert.row.review}</p>
                  <small>
                    {alert.row.source} - {alert.row.confidence} confidence - {alert.row.language}
                  </small>
                </div>
                <button
                  className="secondary-action compact-action cursor-pointer"
                  type="button"
                  onClick={() => toggleAlertResolution(alert.id)}
                >
                  {alert.resolved ? 'Reopen' : 'Resolve'}
                </button>
              </article>
            ))
          ) : (
            <p className="empty-state">No alerts match the current workflow rules.</p>
          )}
        </div>
      </section>
    );
  }

  function renderSettingsView() {
    return (
      <section className="workspace-panel glass-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">Workspace settings</p>
            <h2>Settings</h2>
          </div>
          <button className="export-button cursor-pointer" type="button" onClick={handleSaveSettings}>
            <Save aria-hidden="true" size={17} />
            Save settings
          </button>
        </div>

        <div className="settings-form">
          <label className="field-row">
            <span>Workspace name</span>
            <input
              type="text"
              value={workspaceSettings.workspaceName}
              onChange={(event) => updateWorkspaceSetting('workspaceName', event.target.value)}
            />
          </label>
          <label className="field-row">
            <span>AI API URL</span>
            <input
              type="url"
              value={workspaceSettings.apiUrl}
              onChange={(event) => updateWorkspaceSetting('apiUrl', event.target.value)}
            />
          </label>
          <label className="field-row">
            <span>Database host</span>
            <input
              type="text"
              value={workspaceSettings.databaseHost}
              onChange={(event) => updateWorkspaceSetting('databaseHost', event.target.value)}
            />
          </label>
          <label className="field-row">
            <span>AI model</span>
            <select
              className="cursor-pointer"
              value={workspaceSettings.modelName}
              onChange={(event) => updateWorkspaceSetting('modelName', event.target.value)}
            >
              <option>MTL - Multi-Task Learning</option>
              <option>XLM-R multilingual classifier</option>
              <option>mBERT sentiment classifier</option>
            </select>
          </label>
          <label className="field-row">
            <span>Retention days</span>
            <input
              type="number"
              min="7"
              max="365"
              value={workspaceSettings.retentionDays}
              onChange={(event) => updateWorkspaceSetting('retentionDays', Number(event.target.value))}
            />
          </label>
          <div className="management-card api-health-card">
            <Activity aria-hidden="true" size={20} />
            <div>
              <span>AI API health</span>
              <strong>{apiHealth}</strong>
            </div>
            <button className="secondary-action compact-action cursor-pointer" type="button" onClick={handleCheckApi}>
              Check API
            </button>
          </div>
        </div>
      </section>
    );
  }

  function renderSimpleView(type) {
    if (type === 'sources') {
      return renderSourcesView();
    }

    if (type === 'automation') {
      return renderAutomationView();
    }

    if (type === 'alerts') {
      return renderAlertsView();
    }

    if (type === 'settings') {
      return renderSettingsView();
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

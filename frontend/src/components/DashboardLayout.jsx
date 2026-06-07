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
    kicker: 'Tri tue khach hang',
    title: 'OmniSense AI Dashboard',
    subtitle: 'Theo doi cam xuc khach hang, suc khoe kenh du lieu va chat luong phan tich AI trong mot workspace.',
  },
  'test-lab': {
    kicker: 'Kiem thu danh gia',
    title: 'Test Lab',
    subtitle: 'Nhap mot review hoac upload CSV de AI that phan tich va cap nhat dashboard.',
  },
  feedback: {
    kicker: 'Phan hoi khach hang',
    title: 'Hang doi phan hoi',
    subtitle: 'Xem ket qua phan loai, tim kiem theo kenh, cam xuc, linh vuc hoac trang thai.',
  },
  analytics: {
    kicker: 'Phan tich cam xuc',
    title: 'Bieu do phan tich',
    subtitle: 'Bieu do duoc cap nhat theo du lieu that vua nhap hoac upload tu CSV.',
  },
  sources: {
    kicker: 'Nguon du lieu',
    title: 'Ket noi du lieu',
    subtitle: 'Theo doi cac nguon review va tinh trang nap du lieu vao he thong.',
  },
  automation: {
    kicker: 'Tu dong hoa',
    title: 'Quy tac xu ly',
    subtitle: 'Dinh tuyen phan hoi tieu cuc, tao canh bao va giu quy trinh theo doi nhat quan.',
  },
  alerts: {
    kicker: 'Chinh sach canh bao',
    title: 'Trung tam canh bao',
    subtitle: 'Dieu chinh nguong leo thang cho cam xuc tieu cuc va ket qua co do tin cay thap.',
  },
  settings: {
    kicker: 'Cai dat workspace',
    title: 'Cai dat',
    subtitle: 'Cau hinh database, model AI va tuy chon van hanh workspace.',
  },
};

const sourceCards = [
  { name: 'Facebook', status: 'Da ket noi', volume: '9,420 reviews' },
  { name: 'CSV Upload', status: 'San sang', volume: 'Nhap file thu cong' },
  { name: 'Email', status: 'Da ket noi', volume: '2,140 messages' },
  { name: 'App Store', status: 'Dang cho', volume: 'Cho dong bo API' },
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
  const labels = ['Nguon', 'Noi dung', 'Cam xuc', 'Linh vuc', 'Ngon ngu', 'Do tin cay', 'Trang thai'];
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
      label: 'Tong phan hoi',
      value: metrics.total.toLocaleString('en-US'),
      delta: `${metrics.total} dong`,
      tone: 'blue',
      description: 'Dang hien thi trong workspace',
    },
    {
      label: 'Ty le tieu cuc',
      value: `${metrics.negativeRate.toFixed(1)}%`,
      delta: `${metrics.negative} can xu ly`,
      tone: 'red',
      description: 'Uu tien theo doi',
    },
    {
      label: 'Ty le trung tinh',
      value: `${metrics.neutralRate.toFixed(1)}%`,
      delta: `${metrics.neutral} can quan sat`,
      tone: 'slate',
      description: 'Co the can follow-up',
    },
    {
      label: 'Do tin cay AI',
      value: `${metrics.confidence.toFixed(1)}%`,
      delta: `${metrics.positive} tich cuc`,
      tone: 'amber',
      description: 'Trung binh confidence',
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
    showToast('Da export bao cao CSV.');
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
              <p className="section-kicker">Kenh du lieu</p>
              <h2>Tinh trang ket noi</h2>
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
              <span>Tu dong dua phan hoi tieu cuc vao hang xu ly</span>
              <input className="cursor-pointer" type="checkbox" defaultChecked />
            </label>
            <label className="toggle-row">
              <span>Yeu cau do tin cay tren 80%</span>
              <input className="cursor-pointer" type="checkbox" defaultChecked />
            </label>
            <label className="toggle-row">
              <span>Luu ket qua vao MySQL</span>
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
              <p className="section-kicker">Nhan dinh AI</p>
              <h2>Phan hoi trung tinh can duoc theo doi som.</h2>
              <p>
                Nhom trung tinh thuong la khach hang dang cho cau tra loi. Nen dua vao hang follow-up de tranh chuyen
                thanh trai nghiem tieu cuc.
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
            <span>Model MTL dang san sang</span>
          </div>
          <div className="status-item glass-panel">
            <Database aria-hidden="true" size={20} />
            <span>Dong bo MySQL san sang</span>
          </div>
          <div className="status-item glass-panel">
            <ShieldCheck aria-hidden="true" size={20} />
            <span>Du lieu duoc kiem tra</span>
          </div>
          <div className="status-item glass-panel">
            <BarChart3 aria-hidden="true" size={20} />
            <span>Bieu do cap nhat theo file</span>
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
              <p className="section-kicker">Nhan dinh AI</p>
              <h2>Du lieu upload se cap nhat bieu do ngay trong dashboard.</h2>
              <p>
                Vao Test Lab, upload CSV co cot review hoac text. He thong goi AI engine that, luu MySQL va ve lai KPI,
                bieu do, bang theo du lieu cua ban.
              </p>
            </div>
            <button
              className="secondary-action cursor-pointer"
              type="button"
              onClick={() => setAlertPanelOpen((value) => !value)}
            >
              <Settings aria-hidden="true" size={17} />
              Chinh canh bao
            </button>
          </aside>
        </section>

        {alertPanelOpen && (
          <section className="alert-panel glass-panel" aria-live="polite">
            <CheckCircle2 aria-hidden="true" size={20} />
            <div>
              <strong>Quy tac canh bao da san sang</strong>
              <p>Ty le tieu cuc tren 12% hoac do tin cay duoi 80% se tao tac vu can xu ly.</p>
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
                placeholder="Tim phan hoi"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <ThemeToggle />
            <button className="export-button cursor-pointer" type="button" onClick={handleExport}>
              <FileDown aria-hidden="true" size={18} />
              Export bao cao
            </button>
          </div>
        </header>

        {renderActiveContent()}
        {toast && <div className="toast glass-panel">{toast}</div>}
      </main>
    </div>
  );
}

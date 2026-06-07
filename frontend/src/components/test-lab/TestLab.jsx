import { useState } from 'react';
import { CheckCircle2, Database, FileUp, FlaskConical, Play, RotateCcw } from 'lucide-react';

const AI_API_BASE =
  import.meta.env.VITE_AI_API_URL || `${window.location.protocol}//${window.location.hostname}:8502`;

async function parseApiResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || 'AI engine chua tra ve ket qua hop le.');
  }
  return payload;
}

export function TestLab({ onEvaluationComplete, onBatchComplete, onNotify, latestEvaluation }) {
  const [isSingleRunning, setIsSingleRunning] = useState(false);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const review = String(form.get('review') ?? '').trim();
    const source = String(form.get('source') ?? 'Manual Test');

    if (!review) {
      setError('Nhap noi dung review truoc khi danh gia.');
      return;
    }

    setError('');
    setIsSingleRunning(true);
    try {
      const payload = await parseApiResponse(
        await fetch(`${AI_API_BASE}/api/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: review,
            source,
            workspace: 'Demo Retail VN',
            model_name: 'MTL - Multi-Task Learning',
          }),
        }),
      );
      onEvaluationComplete(payload.row);
      onNotify('Da phan tich bang AI that va them vao bang.');
      event.currentTarget.reset();
    } catch (exc) {
      setError(exc.message);
    } finally {
      setIsSingleRunning(false);
    }
  }

  async function handleCsvSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get('csv');

    if (!(file instanceof File) || file.size === 0) {
      setError('Chon file CSV truoc khi phan tich batch.');
      return;
    }

    setError('');
    setIsBatchRunning(true);
    const body = new FormData();
    body.append('file', file);
    body.append('source', String(form.get('batchSource') ?? 'CSV Upload'));
    body.append('workspace', 'Demo Retail VN');
    body.append('model_name', 'MTL - Multi-Task Learning');
    body.append('max_rows', String(form.get('maxRows') ?? '100'));

    try {
      const payload = await parseApiResponse(
        await fetch(`${AI_API_BASE}/api/analyze-csv`, {
          method: 'POST',
          body,
        }),
      );
      onBatchComplete(payload.rows);
      onNotify(`Da phan tich ${payload.rows.length} dong CSV va cap nhat dashboard.`);
      event.currentTarget.reset();
    } catch (exc) {
      setError(exc.message);
    } finally {
      setIsBatchRunning(false);
    }
  }

  return (
    <section className="workspace-panel glass-panel" aria-labelledby="test-lab-title">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Kiem thu AI that</p>
          <h2 id="test-lab-title">Test Lab</h2>
        </div>
        <div className="api-pill">
          <Database aria-hidden="true" size={16} />
          AI API: {AI_API_BASE.replace(/^https?:\/\//, '')}
        </div>
      </div>

      <div className="test-lab-grid">
        <form className="test-form" onSubmit={handleSubmit}>
          <h3>Danh gia mot phan hoi</h3>
          <label className="field-group">
            <span>Nguon</span>
            <select className="select-control cursor-pointer" name="source" defaultValue="Manual Test">
              <option>Manual Test</option>
              <option>Facebook</option>
              <option>App Store</option>
              <option>Email</option>
              <option>CSV Upload</option>
            </select>
          </label>

          <label className="field-group">
            <span>Noi dung review</span>
            <textarea
              className="test-input"
              name="review"
              rows="8"
              placeholder="Vi du: Khach hang phan nan vi thanh toan loi va cham hoan tien."
            />
          </label>

          <div className="action-row">
            <button className="export-button cursor-pointer" type="submit" disabled={isSingleRunning}>
              <Play aria-hidden="true" size={17} />
              {isSingleRunning ? 'Dang phan tich' : 'Chay danh gia AI'}
            </button>
            <button className="secondary-action cursor-pointer" type="reset">
              <RotateCcw aria-hidden="true" size={17} />
              Xoa
            </button>
          </div>
        </form>

        <form className="test-form" onSubmit={handleCsvSubmit}>
          <h3>Upload CSV de ve bieu do</h3>
          <p className="form-note">
            CSV can co mot cot ten review, text, content, comment, feedback hoac message.
          </p>
          <label className="field-group">
            <span>Tep CSV</span>
            <input className="file-input cursor-pointer" type="file" name="csv" accept=".csv,text/csv" />
          </label>
          <label className="field-group">
            <span>Nguon batch</span>
            <select className="select-control cursor-pointer" name="batchSource" defaultValue="CSV Upload">
              <option>CSV Upload</option>
              <option>Facebook</option>
              <option>App Store</option>
              <option>Email</option>
            </select>
          </label>
          <label className="field-group">
            <span>So dong xu ly toi da</span>
            <input className="select-control" type="number" name="maxRows" min="1" max="500" defaultValue="100" />
          </label>
          <button className="export-button cursor-pointer" type="submit" disabled={isBatchRunning}>
            <FileUp aria-hidden="true" size={17} />
            {isBatchRunning ? 'Dang xu ly CSV' : 'Phan tich file CSV'}
          </button>
        </form>
      </div>

      <div className="result-panel result-panel-wide">
        <div className="result-icon" aria-hidden="true">
          {latestEvaluation ? <CheckCircle2 size={24} /> : <FlaskConical size={24} />}
        </div>
        <div>
          <h3>{latestEvaluation ? 'Ket qua gan nhat' : 'San sang danh gia'}</h3>
          <p>
            {latestEvaluation
              ? 'Ket qua duoc tra ve tu AI engine that, da them vao bang va co the export CSV.'
              : 'Nguoi dung co the test mot review hoac upload CSV de cap nhat KPI, bieu do va bang.'}
          </p>
        </div>

        {latestEvaluation && (
          <div className="result-grid">
            <div>
              <span>Cam xuc</span>
              <strong>{latestEvaluation.sentiment}</strong>
            </div>
            <div>
              <span>Linh vuc</span>
              <strong>{latestEvaluation.domain}</strong>
            </div>
            <div>
              <span>Ngon ngu</span>
              <strong>{latestEvaluation.language}</strong>
            </div>
            <div>
              <span>Do tin cay</span>
              <strong>{latestEvaluation.confidence}</strong>
            </div>
          </div>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}
    </section>
  );
}

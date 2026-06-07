import { CheckCircle2, ExternalLink, FlaskConical, Play, RotateCcw } from 'lucide-react';

const negativeTerms = ['cham', 'loi', 'te', 'khong', 'hoan tien', 'delay', 'refund', 'bad', 'slow', 'error', 'unclear'];
const positiveTerms = ['tot', 'hai long', 'nhanh', 'muot', 'great', 'good', 'smooth', 'fast', 'early', 'excellent'];
const billingTerms = ['bill', 'billing', 'invoice', 'payment', 'refund', 'thanh toan', 'hoa don', 'hoan tien'];
const serviceTerms = ['support', 'service', 'phan hoi', 'customer', 'agent', 'ticket'];

function detectLanguage(text) {
  const normalized = text.toLowerCase();
  if (/[ăâđêôơưáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵ]/i.test(text) || normalized.includes('khach')) {
    return 'Vietnamese';
  }

  return 'English';
}

function scoreTerms(text, terms) {
  return terms.reduce((score, term) => (text.includes(term) ? score + 1 : score), 0);
}

function evaluateReview(review, source) {
  const text = review.toLowerCase();
  const negativeScore = scoreTerms(text, negativeTerms);
  const positiveScore = scoreTerms(text, positiveTerms);
  const sentiment = negativeScore > positiveScore ? 'Negative' : positiveScore > negativeScore ? 'Positive' : 'Neutral';
  const domain = scoreTerms(text, billingTerms) > 0 ? 'Billing' : scoreTerms(text, serviceTerms) > 0 ? 'Service' : 'Product';
  const baseConfidence = sentiment === 'Neutral' ? 78 : 86;
  const confidence = Math.min(98, baseConfidence + Math.abs(negativeScore - positiveScore) * 4 + Math.min(review.length, 120) / 10);

  return {
    id: `test-${Date.now()}`,
    source,
    review,
    sentiment,
    domain,
    language: detectLanguage(review),
    confidence: `${confidence.toFixed(1)}%`,
    status: sentiment === 'Negative' ? 'Escalate' : sentiment === 'Neutral' ? 'Review' : 'Resolved',
  };
}

export function TestLab({ onEvaluationComplete, latestEvaluation }) {
  function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const review = String(form.get('review') ?? '').trim();
    const source = String(form.get('source') ?? 'Manual Test');

    if (!review) {
      return;
    }

    onEvaluationComplete(evaluateReview(review, source));
    event.currentTarget.reset();
  }

  return (
    <section className="workspace-panel glass-panel" aria-labelledby="test-lab-title">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Evaluation workspace</p>
          <h2 id="test-lab-title">Test Lab</h2>
        </div>
        <a className="link-button cursor-pointer" href="http://localhost:8502" target="_blank" rel="noreferrer">
          <ExternalLink aria-hidden="true" size={16} />
          Open AI Engine
        </a>
      </div>

      <div className="test-lab-grid">
        <form className="test-form" onSubmit={handleSubmit}>
          <label className="field-group">
            <span>Source</span>
            <select className="select-control cursor-pointer" name="source" defaultValue="Manual Test">
              <option>Manual Test</option>
              <option>Facebook</option>
              <option>App Store</option>
              <option>Email</option>
              <option>CSV Upload</option>
            </select>
          </label>

          <label className="field-group">
            <span>Review text</span>
            <textarea
              className="test-input"
              name="review"
              rows="8"
              placeholder="Example: Khach hang phan nan vi thanh toan loi va cham hoan tien."
            />
          </label>

          <div className="action-row">
            <button className="export-button cursor-pointer" type="submit">
              <Play aria-hidden="true" size={17} />
              Run evaluation
            </button>
            <button className="secondary-action cursor-pointer" type="reset">
              <RotateCcw aria-hidden="true" size={17} />
              Clear
            </button>
          </div>
        </form>

        <div className="result-panel">
          <div className="result-icon" aria-hidden="true">
            {latestEvaluation ? <CheckCircle2 size={24} /> : <FlaskConical size={24} />}
          </div>
          <h3>{latestEvaluation ? 'Latest result' : 'Ready for evaluation'}</h3>
          <p>
            {latestEvaluation
              ? 'The tested review was added to the feedback table and can be exported.'
              : 'Use this area to test classification UX before connecting the production model API.'}
          </p>

          {latestEvaluation && (
            <div className="result-grid">
              <div>
                <span>Sentiment</span>
                <strong>{latestEvaluation.sentiment}</strong>
              </div>
              <div>
                <span>Domain</span>
                <strong>{latestEvaluation.domain}</strong>
              </div>
              <div>
                <span>Language</span>
                <strong>{latestEvaluation.language}</strong>
              </div>
              <div>
                <span>Confidence</span>
                <strong>{latestEvaluation.confidence}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

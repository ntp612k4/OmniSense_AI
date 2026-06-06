import { ArrowUpDown } from 'lucide-react';
import { feedbackRows } from '../../data/dashboardData.js';

function sentimentClass(sentiment) {
  return `sentiment-badge ${sentiment.toLowerCase()}`;
}

export function DataTable() {
  return (
    <section className="table-panel glass-panel" aria-labelledby="table-title">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Latest analysis</p>
          <h2 id="table-title">Feedback classification</h2>
        </div>
        <button className="table-sort cursor-pointer" type="button">
          <ArrowUpDown aria-hidden="true" size={16} />
          Sort
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Sentiment</th>
              <th>Domain</th>
              <th>Language</th>
              <th>Confidence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {feedbackRows.map((row) => (
              <tr key={`${row.source}-${row.domain}`}>
                <td>{row.source}</td>
                <td><span className={sentimentClass(row.sentiment)}>{row.sentiment}</span></td>
                <td>{row.domain}</td>
                <td>{row.language}</td>
                <td>{row.confidence}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

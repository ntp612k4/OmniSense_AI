import { ArrowUpDown } from 'lucide-react';

function sentimentClass(sentiment) {
  return `sentiment-badge ${sentiment.toLowerCase()}`;
}

export function DataTable({ rows, onSort, sortDirection = 'desc' }) {
  return (
    <section className="table-panel glass-panel" aria-labelledby="table-title">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Latest analysis</p>
          <h2 id="table-title">Feedback classification</h2>
        </div>
        <button className="table-sort cursor-pointer" type="button" onClick={onSort}>
          <ArrowUpDown aria-hidden="true" size={16} />
          Sort {sortDirection === 'desc' ? 'high' : 'low'}
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Review</th>
              <th>Sentiment</th>
              <th>Domain</th>
              <th>Language</th>
              <th>Confidence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id ?? `${row.source}-${row.domain}-${row.confidence}`}>
                <td>{row.source}</td>
                <td className="review-cell">{row.review}</td>
                <td><span className={sentimentClass(row.sentiment)}>{row.sentiment}</span></td>
                <td>{row.domain}</td>
                <td>{row.language}</td>
                <td>{row.confidence}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="empty-state">
            No matching feedback found. Try a different keyword or add a new test in Test Lab.
          </div>
        )}
      </div>
    </section>
  );
}

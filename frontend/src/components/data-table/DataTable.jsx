import { ArrowUpDown } from 'lucide-react';

function sentimentClass(sentiment) {
  return `sentiment-badge ${sentiment.toLowerCase()}`;
}

function sentimentLabel(sentiment) {
  if (sentiment === 'Positive') {
    return 'Tich cuc';
  }
  if (sentiment === 'Negative') {
    return 'Tieu cuc';
  }
  return 'Trung tinh';
}

function statusLabel(status) {
  if (status === 'Escalate') {
    return 'Can xu ly';
  }
  if (status === 'Resolved') {
    return 'On dinh';
  }
  return 'Theo doi';
}

export function DataTable({ rows, onSort, sortDirection = 'desc' }) {
  return (
    <section className="table-panel glass-panel" aria-labelledby="table-title">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Ket qua moi nhat</p>
          <h2 id="table-title">Bang phan loai phan hoi</h2>
        </div>
        <button className="table-sort cursor-pointer" type="button" onClick={onSort}>
          <ArrowUpDown aria-hidden="true" size={16} />
          Sap xep {sortDirection === 'desc' ? 'cao' : 'thap'}
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nguon</th>
              <th>Noi dung</th>
              <th>Cam xuc</th>
              <th>Linh vuc</th>
              <th>Ngon ngu</th>
              <th>Do tin cay</th>
              <th>Trang thai</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id ?? `${row.source}-${row.domain}-${row.confidence}`}>
                <td>{row.source}</td>
                <td className="review-cell">{row.review}</td>
                <td><span className={sentimentClass(row.sentiment)}>{sentimentLabel(row.sentiment)}</span></td>
                <td>{row.domain}</td>
                <td>{row.language}</td>
                <td>{row.confidence}</td>
                <td>{statusLabel(row.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="empty-state">
            Khong tim thay phan hoi phu hop. Hay doi tu khoa hoac them du lieu trong Test Lab.
          </div>
        )}
      </div>
    </section>
  );
}

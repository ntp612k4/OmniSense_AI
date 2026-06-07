const maxValue = 100;

function buildTrend(rows = []) {
  const groups = rows.reduce((acc, row) => {
    const label = row.source || 'Other';
    if (!acc[label]) {
      acc[label] = { label, positive: 0, neutral: 0, negative: 0 };
    }

    if (row.sentiment === 'Positive') {
      acc[label].positive += 1;
    } else if (row.sentiment === 'Negative') {
      acc[label].negative += 1;
    } else {
      acc[label].neutral += 1;
    }

    return acc;
  }, {});

  return Object.values(groups).slice(0, 7).map((item) => {
    const total = item.positive + item.neutral + item.negative || 1;
    return {
      label: item.label,
      positive: (item.positive / total) * 100,
      neutral: (item.neutral / total) * 100,
      negative: (item.negative / total) * 100,
    };
  });
}

export function ChartPanel({ rows = [] }) {
  const trend = buildTrend(rows);

  return (
    <section className="chart-panel glass-panel" aria-labelledby="trend-title">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Sentiment chart</p>
          <h2 id="trend-title">Sentiment mix by source</h2>
        </div>
        <div className="chart-legend" aria-label="Chart legend">
          <span><i className="legend-positive" />Positive</span>
          <span><i className="legend-neutral" />Neutral</span>
          <span><i className="legend-negative" />Negative</span>
        </div>
      </div>
      <div className="bar-chart" role="img" aria-label="Stacked sentiment bar chart for the last seven days">
        {trend.map((day) => (
          <div className="bar-column" key={day.label}>
            <div className="stacked-bar">
              <span className="bar-positive" style={{ height: `${(day.positive / maxValue) * 100}%` }} />
              <span className="bar-neutral" style={{ height: `${(day.neutral / maxValue) * 100}%` }} />
              <span className="bar-negative" style={{ height: `${(day.negative / maxValue) * 100}%` }} />
            </div>
            <small>{day.label}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

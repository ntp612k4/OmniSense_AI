import { sentimentTrend } from '../../data/dashboardData.js';

const maxValue = 100;

export function ChartPanel() {
  return (
    <section className="chart-panel glass-panel" aria-labelledby="trend-title">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Sentiment trend</p>
          <h2 id="trend-title">Weekly feedback mix</h2>
        </div>
        <div className="chart-legend" aria-label="Chart legend">
          <span><i className="legend-positive" />Positive</span>
          <span><i className="legend-neutral" />Neutral</span>
          <span><i className="legend-negative" />Negative</span>
        </div>
      </div>
      <div className="bar-chart" role="img" aria-label="Stacked sentiment bar chart for the last seven days">
        {sentimentTrend.map((day) => (
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

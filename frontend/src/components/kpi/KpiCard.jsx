import { TrendingUp } from 'lucide-react';

export function KpiCard({ item }) {
  return (
    <article className={`kpi-card glass-panel tone-${item.tone}`}>
      <div>
        <p>{item.label}</p>
        <strong>{item.value}</strong>
      </div>
      <div className="kpi-footer">
        <span>
          <TrendingUp aria-hidden="true" size={15} />
          {item.delta}
        </span>
        <small>{item.description}</small>
      </div>
    </article>
  );
}

import { Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useApi } from '../useApi.js';
import { Tag } from '../components/Badges.jsx';

function PlanCard({ plan }) {
  return (
    <Link to={`/plans/${plan.slug}`} className="card plan-card">
      <Tag kind={plan.level}>{plan.level}</Tag>
      <h3>{plan.name}</h3>
      <p className="muted clamp">{plan.description || 'Custom plan.'}</p>
      <p className="small muted">
        {plan.weeks} weeks · {plan.days.length} days/week
        {plan.author && <> · by @{plan.author}</>}
      </p>
    </Link>
  );
}

export default function Plans() {
  const { user } = useAuth();
  const { data, error } = useApi('/plans');
  const official = data?.plans.filter((p) => !p.custom) ?? [];
  const community = data?.plans.filter((p) => p.custom) ?? [];

  return (
    <>
      <div className="page-head row between wrap">
        <div>
          <h1>Training plans</h1>
          <p className="muted">Pick a plan, follow the sessions, and log your workouts as you go.</p>
        </div>
        <Link to={user ? '/plans/new' : '/login'} className="btn">+ Build your own</Link>
      </div>
      {error && <p className="error">{error.message}</p>}
      {!data && !error && <p className="muted">Loading…</p>}

      <div className="grid">
        {official.map((p) => <PlanCard key={p.slug} plan={p} />)}
      </div>

      {community.length > 0 && (
        <>
          <h2 className="section-title">Community plans</h2>
          <div className="grid">
            {community.map((p) => <PlanCard key={p.slug} plan={p} />)}
          </div>
        </>
      )}
    </>
  );
}

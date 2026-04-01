interface RiskBadgeProps {
  tier: 'Critical' | 'At-Risk' | 'Stable' | string;
  pulse?: boolean;
}

export default function RiskBadge({ tier, pulse = false }: RiskBadgeProps) {
  const tierClass = tier === 'Critical'
    ? 'risk-badge--critical'
    : tier === 'At-Risk'
    ? 'risk-badge--at-risk'
    : 'risk-badge--stable';

  return (
    <span className={`risk-badge ${tierClass} ${pulse && tier === 'Critical' ? 'pulse' : ''}`}>
      {tier}
    </span>
  );
}

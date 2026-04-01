import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import './RiskDonut.css';

interface RiskDonutProps {
  critical: number;
  atRisk: number;
  stable: number;
  centerValue: number;
  centerLabel: string;
}

const COLORS = {
  Critical: '#ba1a1a',
  'At-Risk': '#89ceff',
  Stable: '#b9c7e0',
};

export default function RiskDonut({ critical, atRisk, stable, centerValue, centerLabel }: RiskDonutProps) {
  const data = [
    { name: 'Stable', value: stable },
    { name: 'At-Risk', value: atRisk },
    { name: 'Critical', value: critical },
  ];

  return (
    <motion.div
      className="risk-donut"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      id="risk-donut-chart"
    >
      <div className="risk-donut__chart-area">
        <div className="donut-container" style={{ width: 192, height: 192 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                animationBegin={200}
                animationDuration={1200}
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[entry.name as keyof typeof COLORS]}
                    stroke="none"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center-label">
            <span className="value">{centerValue}</span>
            <span className="label">{centerLabel}</span>
          </div>
        </div>

        <div className="risk-donut__legend">
          {[
            { name: 'Critical', value: critical, color: COLORS.Critical },
            { name: 'At-Risk', value: atRisk, color: COLORS['At-Risk'] },
            { name: 'Stable', value: stable, color: COLORS.Stable },
          ].map((item) => (
            <div key={item.name} className="risk-donut__legend-item">
              <div className="risk-donut__legend-header">
                <div
                  className="risk-donut__legend-dot"
                  style={{ background: item.color }}
                />
                <span className="label-xs" style={{ color: 'var(--on-surface)' }}>{item.name}</span>
              </div>
              <p className="risk-donut__legend-value">{item.value.toLocaleString()}</p>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${(item.value / (critical + atRisk + stable)) * 100}%`,
                    background: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './StatCard.css';

interface StatCardProps {
  icon: string;
  label: string;
  value: number;
  subtitle?: string;
  variant?: 'default' | 'critical' | 'at-risk';
  delay?: number;
}

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

export default function StatCard({ icon, label, value, subtitle, variant = 'default', delay = 0 }: StatCardProps) {
  const animatedValue = useCountUp(value);

  return (
    <motion.div
      className={`stat-card card ${variant !== 'default' ? `stat-card--${variant}` : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      id={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="stat-card__header">
        <span className="material-symbols-outlined stat-card__icon" data-icon={icon}>{icon}</span>
        <span className="label-xs">{label}</span>
      </div>
      <h3 className="stat-card__value">
        {animatedValue.toLocaleString()}
      </h3>
      {subtitle && (
        <p className="stat-card__subtitle">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>trending_up</span>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

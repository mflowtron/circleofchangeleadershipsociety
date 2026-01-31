import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface HealthGaugeProps {
  value: number;
  maxValue: number;
  label: string;
  unit?: string;
  thresholds?: {
    good: number;
    warning: number;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function HealthGauge({
  value,
  maxValue,
  label,
  unit = 'ms',
  thresholds = { good: 100, warning: 500 },
  size = 'md'
}: HealthGaugeProps) {
  // Determine color based on value and thresholds
  const getColor = () => {
    if (value <= thresholds.good) return 'hsl(var(--chart-2))'; // Green
    if (value <= thresholds.warning) return 'hsl(var(--chart-4))'; // Yellow/Orange
    return 'hsl(var(--destructive))'; // Red
  };

  const getStatus = () => {
    if (value <= thresholds.good) return 'Excellent';
    if (value <= thresholds.warning) return 'Normal';
    return 'Slow';
  };

  // Calculate percentage for the gauge
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  // Data for the semi-circular gauge
  const data = [
    { value: percentage, color: getColor() },
    { value: 100 - percentage, color: 'hsl(var(--muted))' }
  ];

  const sizeClasses = {
    xs: { container: 'h-16 w-16', text: 'text-sm', label: 'text-[10px]' },
    sm: { container: 'h-20 w-20', text: 'text-base', label: 'text-xs' },
    md: { container: 'h-28 w-28', text: 'text-xl', label: 'text-sm' },
    lg: { container: 'h-36 w-36', text: 'text-2xl', label: 'text-base' }
  };

  return (
    <div className="flex flex-col items-center">
      <div className={cn('relative', sizeClasses[size].container)}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="70%"
              startAngle={180}
              endAngle={0}
              innerRadius="60%"
              outerRadius="100%"
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
          <span className={cn('font-bold', sizeClasses[size].text)} style={{ color: getColor() }}>
            {value}
          </span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>
      
      <div className="text-center mt-1">
        <p className={cn('font-medium', sizeClasses[size].label)}>{label}</p>
        <p className="text-xs text-muted-foreground">{getStatus()}</p>
      </div>
    </div>
  );
}

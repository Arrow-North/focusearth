import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AnalyticsBarChartProps {
  title: string;
  data: { label: string; value: number }[];
  color?: string;
  layout?: 'horizontal' | 'vertical';
  isLoading?: boolean;
  valueFormatter?: (value: number) => string;
}

export function AnalyticsBarChart({
  title,
  data,
  color = '#6366f1',
  layout = 'horizontal',
  isLoading,
  valueFormatter,
}: AnalyticsBarChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isVertical = layout === 'vertical';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data}
            layout={isVertical ? 'vertical' : 'horizontal'}
          >
            <CartesianGrid strokeDasharray="3 3" />
            {isVertical ? (
              <>
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickFormatter={valueFormatter}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
              </>
            ) : (
              <>
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis
                  allowDecimals={false}
                  tickFormatter={valueFormatter}
                />
              </>
            )}
            <Tooltip
              formatter={
                valueFormatter
                  ? (val: number) => valueFormatter(val)
                  : undefined
              }
            />
            <Bar
              dataKey="value"
              fill={color}
              radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

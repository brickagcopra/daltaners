import {
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';

interface RevenueByMonth {
  month: string;
  revenue: number;
}

interface GrowthMetricsChartProps {
  data: RevenueByMonth[];
}

export function GrowthMetricsChart({ data }: GrowthMetricsChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `P${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `P${(value / 1_000).toFixed(0)}K`;
    return `P${value}`;
  };

  // Compute month-over-month growth percentages
  const chartData = data.map((item, idx) => {
    const prev = idx > 0 ? data[idx - 1].revenue : item.revenue;
    const growth = prev > 0 ? ((item.revenue - prev) / prev) * 100 : 0;
    return {
      month: item.month,
      revenue: item.revenue,
      growth: Math.round(growth * 10) / 10,
    };
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-gray-900">Revenue Trend & Growth</h3>

      {chartData.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No data available</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              yAxisId="revenue"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={formatCurrency}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              yAxisId="growth"
              orientation="right"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={(v) => `${v}%`}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
                return [`${value}%`, 'MoM Growth'];
              }}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
              }}
            />
            <Legend />
            <Bar
              yAxisId="revenue"
              dataKey="revenue"
              fill="#004E89"
              radius={[4, 4, 0, 0]}
              name="revenue"
            />
            <Line
              yAxisId="growth"
              type="monotone"
              dataKey="growth"
              stroke="#FF6B35"
              strokeWidth={2}
              dot={{ fill: '#FF6B35', r: 4 }}
              name="growth"
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

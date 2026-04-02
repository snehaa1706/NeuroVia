import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ScoreChartProps {
  data: number[];
}

export default function ScoreChart({ data }: ScoreChartProps) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex justify-center items-center text-gray-400 bg-gray-50 rounded-lg border border-gray-100 italic">No score history available</div>;
  }

  // Format data for Recharts
  const chartData = data.map((score, index) => ({
    name: `Test ${data.length - index}`,
    score: score
  })).reverse(); // Reverse so old -> new

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{fill: '#9CA3AF', fontSize: 12}} axisLine={{stroke: '#E5E7EB'}} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{fill: '#9CA3AF', fontSize: 12}} axisLine={{stroke: '#E5E7EB'}} tickLine={false} />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            itemStyle={{ color: '#1A6FA8', fontWeight: 'bold' }}
          />
          <Line type="monotone" dataKey="score" stroke="#1A6FA8" strokeWidth={3} dot={{ r: 4, fill: '#1A6FA8', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

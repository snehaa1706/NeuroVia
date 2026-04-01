import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { User } from '../types';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Brain,
  Target,
  Activity,
  Clock,
  Award,
  Zap,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface RecentResult {
  score: number;
  test_type: string;
  created_at: string;
}

interface CognitiveSummary {
  avg_score: number | null;
  latest_score: number | null;
  trend: string;
  recent_scores: number[];
  recent_results?: RecentResult[];
}

const TEST_TYPE_LABELS: Record<string, string> = {
  memory_recall: 'Memory Recall',
  verbal_fluency: 'Verbal Fluency',
  reaction_time: 'Reaction Time',
  sequence_memory: 'Sequence Memory',
};

const TEST_TYPE_COLORS: Record<string, string> = {
  memory_recall: '#1A6FA8',
  verbal_fluency: '#0D9488',
  reaction_time: '#D97706',
  sequence_memory: '#7C3AED',
};

const TEST_TYPE_ICONS: Record<string, typeof Brain> = {
  memory_recall: Brain,
  verbal_fluency: Activity,
  reaction_time: Zap,
  sequence_memory: BarChart3,
};

export default function CognitiveSummaryPage({ user: _user }: { user: User }) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<CognitiveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await api.getCognitiveSummary();
        setSummary(data);
      } catch (err: any) {
        const msg = err.message?.toLowerCase() || '';
        if (msg.includes('not authenticated') || msg.includes('token') || msg.includes('401') || msg.includes('network error')) {
          setSummary({
            avg_score: null,
            latest_score: null,
            trend: 'no_data',
            recent_scores: [],
            recent_results: [],
          });
        } else {
          setError(err.message || 'Failed to fetch cognitive summary');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center" style={{ minHeight: 400 }}>
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto mb-4" style={{ color: '#1A6FA8' }} />
          <p style={{ color: '#7AA3BE' }}>Loading summary…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">
            <ArrowLeft size={18} /> Back
          </button>
        </div>
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            maxWidth: 500,
            margin: '0 auto',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 20,
          }}
        >
          <AlertTriangle size={40} style={{ color: '#DC2626', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Error Loading Summary</h2>
          <p style={{ color: '#7AA3BE', marginBottom: 20 }}>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  // Build chart data from recent_results (has dates) or fallback to recent_scores
  const chartData =
    summary.recent_results && summary.recent_results.length > 0
      ? [...summary.recent_results].reverse().map((r) => ({
          date: new Date(r.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          score: Math.round(r.score * 100) / 100,
          test_type: TEST_TYPE_LABELS[r.test_type] || r.test_type,
          fullDate: new Date(r.created_at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }),
        }))
      : summary.recent_scores.length > 0
        ? [...summary.recent_scores].reverse().map((score, i) => ({
            date: `Test ${i + 1}`,
            score: Math.round(score * 100) / 100,
            test_type: '',
            fullDate: '',
          }))
        : [];

  const trendIcon =
    summary.trend === 'improving' ? (
      <TrendingUp size={22} />
    ) : summary.trend === 'declining' ? (
      <TrendingDown size={22} />
    ) : (
      <Minus size={22} />
    );

  const trendColor =
    summary.trend === 'improving' ? '#059669' : summary.trend === 'declining' ? '#DC2626' : '#D97706';

  const trendLabel =
    summary.trend === 'improving' ? 'Improving' : summary.trend === 'declining' ? 'Declining' : 'Stable';

  const latestScoreColor =
    summary.latest_score === null
      ? '#9CA3AF'
      : summary.latest_score >= 80
        ? '#059669'
        : summary.latest_score >= 50
          ? '#D97706'
          : '#DC2626';

  // Compute test type breakdown from recent results
  const testBreakdown: Record<string, { scores: number[]; latest: number }> = {};
  if (summary.recent_results) {
    for (const r of summary.recent_results) {
      if (!testBreakdown[r.test_type]) {
        testBreakdown[r.test_type] = { scores: [], latest: r.score };
      }
      testBreakdown[r.test_type].scores.push(r.score);
    }
  }

  // Score change since previous test
  const scoreChange =
    summary.recent_results && summary.recent_results.length >= 2
      ? summary.recent_results[0].score - summary.recent_results[1].score
      : null;

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: 16,
            padding: '14px 18px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
          }}
        >
          <p style={{ fontWeight: 700, color: '#0D2B45', fontSize: 16, marginBottom: 4 }}>
            {data.score}%
          </p>
          {data.test_type && (
            <p style={{ color: '#7AA3BE', fontSize: 13, marginBottom: 2 }}>{data.test_type}</p>
          )}
          {data.fullDate && (
            <p style={{ color: '#9CA3AF', fontSize: 12 }}>{data.fullDate}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-container animate-fadeIn" style={{ padding: '40px 40px 60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 12,
              border: '1px solid #E5E7EB',
              background: 'white',
              cursor: 'pointer',
              color: '#6B7280',
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#1A6FA8'; e.currentTarget.style.color = '#1A6FA8'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280'; }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #1A6FA8, #0D9488)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(26,111,168,0.3)',
            }}
          >
            <BarChart3 size={26} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0D2B45', letterSpacing: '-0.5px' }}>
              Cognitive Summary
            </h1>
            <p style={{ color: '#7AA3BE', fontSize: 15, marginTop: 2 }}>
              Overview of your cognitive test performance
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/cognitive/test')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #1A6FA8, #0D9488)',
            color: 'white',
            border: 'none',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(26,111,168,0.3)',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(26,111,168,0.4)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,111,168,0.3)'; }}
        >
          <Brain size={18} /> Take a Test
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
        {/* Latest Score */}
        <div
          style={{
            background: 'white',
            borderRadius: 20,
            padding: 24,
            border: '1px solid #F3F4F6',
            boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: latestScoreColor }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: `${latestScoreColor}14`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Target size={22} color={latestScoreColor} />
            </div>
            <span style={{ fontSize: 13, color: '#7AA3BE', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Latest Score
            </span>
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: latestScoreColor, letterSpacing: '-1px' }}>
            {summary.latest_score !== null ? summary.latest_score.toFixed(1) : '—'}
          </div>
          {scoreChange !== null && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 8,
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                background: scoreChange >= 0 ? '#ECFDF5' : '#FEF2F2',
                color: scoreChange >= 0 ? '#059669' : '#DC2626',
              }}
            >
              {scoreChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {scoreChange >= 0 ? '+' : ''}{scoreChange.toFixed(1)} pts
            </div>
          )}
          <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: 3,
                background: latestScoreColor,
                width: `${summary.latest_score || 0}%`,
                transition: 'width 1s ease',
              }}
            />
          </div>
        </div>

        {/* Average Score */}
        <div
          style={{
            background: 'white',
            borderRadius: 20,
            padding: 24,
            border: '1px solid #F3F4F6',
            boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#0D9488' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: '#0D948814',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity size={22} color="#0D9488" />
            </div>
            <span style={{ fontSize: 13, color: '#7AA3BE', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Average Score
            </span>
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#0D9488', letterSpacing: '-1px' }}>
            {summary.avg_score !== null ? summary.avg_score.toFixed(1) : '—'}
          </div>
          <div style={{ marginTop: 20, height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: 3,
                background: '#0D9488',
                width: `${summary.avg_score || 0}%`,
                transition: 'width 1s ease',
              }}
            />
          </div>
        </div>

        {/* Trend */}
        <div
          style={{
            background: 'white',
            borderRadius: 20,
            padding: 24,
            border: '1px solid #F3F4F6',
            boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: trendColor }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: `${trendColor}14`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: trendColor }}>{trendIcon}</span>
            </div>
            <span style={{ fontSize: 13, color: '#7AA3BE', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Trend
            </span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: trendColor }}>{trendLabel}</div>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>
            Based on {summary.recent_scores.length} tests
          </p>
        </div>

        {/* Tests Taken */}
        <div
          style={{
            background: 'white',
            borderRadius: 20,
            padding: 24,
            border: '1px solid #F3F4F6',
            boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#7C3AED' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: '#7C3AED14',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={22} color="#7C3AED" />
            </div>
            <span style={{ fontSize: 13, color: '#7AA3BE', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Tests Taken
            </span>
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#7C3AED', letterSpacing: '-1px' }}>
            {summary.recent_scores.length}
          </div>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>
            Across {Object.keys(testBreakdown).length} test types
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Score Trend Chart */}
        <div
          style={{
            background: 'white',
            borderRadius: 20,
            padding: 28,
            border: '1px solid #F3F4F6',
            boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 18, color: '#0D2B45', marginBottom: 4 }}>
                Performance Trend
              </h3>
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>Score progression over time</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={14} color="#9CA3AF" />
              <span style={{ fontSize: 13, color: '#9CA3AF' }}>Last {chartData.length} sessions</span>
            </div>
          </div>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A6FA8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#1A6FA8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={{ stroke: '#F3F4F6' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: '#9CA3AF', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#1A6FA8"
                  fill="url(#scoreGradient)"
                  strokeWidth={3}
                  dot={{ fill: '#1A6FA8', strokeWidth: 3, r: 5, stroke: 'white' }}
                  activeDot={{ r: 8, strokeWidth: 3, fill: '#1A6FA8', stroke: 'white' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: 300,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9CA3AF',
              }}
            >
              <BarChart3 size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontWeight: 500 }}>Take more tests to see your trend</p>
            </div>
          )}
        </div>

        {/* Test Type Breakdown */}
        <div
          style={{
            background: 'white',
            borderRadius: 20,
            padding: 28,
            border: '1px solid #F3F4F6',
            boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
          }}
        >
          <h3 style={{ fontWeight: 700, fontSize: 18, color: '#0D2B45', marginBottom: 4 }}>
            Performance by Category
          </h3>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 24 }}>Average score per test type</p>

          {Object.keys(testBreakdown).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.entries(testBreakdown).map(([type, data]) => {
                const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
                const color = TEST_TYPE_COLORS[type] || '#6B7280';
                const Icon = TEST_TYPE_ICONS[type] || Brain;
                return (
                  <div key={type} style={{ padding: '16px 18px', borderRadius: 16, background: '#FAFBFC', border: '1px solid #F3F4F6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: `${color}14`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon size={18} color={color} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#0D2B45' }}>
                            {TEST_TYPE_LABELS[type] || type}
                          </div>
                          <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                            {data.scores.length} test{data.scores.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color }}>
                        {avg.toFixed(0)}%
                      </div>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 3,
                          background: `linear-gradient(90deg, ${color}, ${color}CC)`,
                          width: `${avg}%`,
                          transition: 'width 1s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9CA3AF',
              }}
            >
              <p>No test data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
        <button
          onClick={() => navigate('/cognitive/history')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            borderRadius: 14,
            background: 'white',
            color: '#0D2B45',
            border: '1px solid #E5E7EB',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = '#1A6FA8'; e.currentTarget.style.color = '#1A6FA8'; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#0D2B45'; }}
        >
          <Clock size={18} /> View Full History
        </button>
        <button
          onClick={() => navigate('/cognitive/test')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #1A6FA8, #0D9488)',
            color: 'white',
            border: 'none',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(26,111,168,0.3)',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <Brain size={18} /> Start New Test
        </button>
      </div>
    </div>
  );
}

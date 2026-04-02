import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import type { User } from '../types';
import {
  History,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Brain,
  Calendar,
  Award,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CognitiveResult {
  session_id: string;
  test_type: string;
  score: number;
  score_components: Record<string, any>;
  time_taken_seconds: number;
  created_at: string;
}

const TEST_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  memory_recall: { label: 'Memory Recall', color: 'var(--color-primary)' },
  verbal_fluency: { label: 'Verbal Fluency', color: 'var(--color-teal)' },
  reaction_time: { label: 'Reaction Time', color: '#F59E0B' },
  sequence_memory: { label: 'Sequence Memory', color: '#8B5CF6' },
};

export default function CognitiveHistoryPage({ user: _user }: { user: User }) {
  const navigate = useNavigate();
  const [history, setHistory] = useState<CognitiveResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await api.getCognitiveHistory();
        setHistory(data);
      } catch (err: any) {
        const msg = err.message?.toLowerCase() || '';
        if (msg.includes('not authenticated') || msg.includes('token') || msg.includes('401') || msg.includes('network error')) {
            setHistory([]);
        } else {
            setError(err.message || 'Failed to fetch cognitive history');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getScoreColor = (score: number) =>
    score >= 80 ? 'var(--color-success)' : score >= 50 ? 'var(--color-warning)' : 'var(--color-error)';

  const getScoreBadgeClass = (score: number) =>
    score >= 80 ? 'badge-success' : score >= 50 ? 'badge-warning' : 'badge-critical';

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center" style={{ minHeight: 400 }}>
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto mb-4" style={{ color: 'var(--color-primary)' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading history…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm">
            <ArrowLeft size={18} /> Back
          </button>
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{ width: 48, height: 48, background: 'var(--color-primary-50)' }}
          >
            <History size={24} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-navy)' }}>
              Test History
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              {history.length} test{history.length !== 1 ? 's' : ''} completed
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/cognitive/summary')}>
            View Summary
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/cognitive/test')}>
            <Brain size={18} /> Take a Test
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl mb-6" style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error)' }}>
          <AlertTriangle size={20} style={{ color: 'var(--color-error)' }} />
          <span style={{ color: 'var(--color-error)', fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {/* Table */}
      {history.length === 0 ? (
        <div
          className="card"
          style={{ padding: 60, textAlign: 'center', color: 'var(--color-text-muted)' }}
        >
          <History size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <h3 style={{ fontWeight: 600, marginBottom: 8, color: 'var(--color-text-secondary)' }}>No Tests Yet</h3>
          <p style={{ marginBottom: 20 }}>Take your first cognitive test to start tracking your performance</p>
          <button className="btn btn-primary" onClick={() => navigate('/cognitive/test')}>
            <Brain size={18} /> Start First Test
          </button>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 100px 120px 48px',
              padding: '14px 24px',
              background: 'var(--color-bg-page)',
              borderBottom: '2px solid var(--color-border)',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span className="flex items-center gap-2"><Calendar size={14} /> Date</span>
            <span className="flex items-center gap-2"><Brain size={14} /> Test Type</span>
            <span className="flex items-center gap-2"><Award size={14} /> Score</span>
            <span className="flex items-center gap-2"><Clock size={14} /> Duration</span>
            <span></span>
          </div>

          {/* Table Rows */}
          {history.map((item) => {
            const meta = TEST_TYPE_LABELS[item.test_type] || { label: item.test_type, color: 'var(--color-primary)' };
            const scoreColor = getScoreColor(item.score);
            const isExpanded = expandedRow === item.session_id;

            return (
              <div key={item.session_id}>
                <div
                  id={`history-row-${item.session_id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 100px 120px 48px',
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--color-border)',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    background: isExpanded ? 'var(--color-bg-page)' : 'transparent',
                  }}
                  onClick={() => setExpandedRow(isExpanded ? null : item.session_id)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = isExpanded ? 'var(--color-bg-page)' : 'transparent')}
                >
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                    {formatDate(item.created_at)}
                  </span>
                  <span>
                    <span
                      className="badge"
                      style={{
                        background: `${meta.color}15`,
                        color: meta.color,
                        fontSize: 12,
                      }}
                    >
                      {meta.label}
                    </span>
                  </span>
                  <span>
                    <span
                      className={`badge ${getScoreBadgeClass(item.score)}`}
                      style={{ fontWeight: 700, fontSize: 13, minWidth: 52, justifyContent: 'center' }}
                    >
                      {Math.round(item.score)}
                    </span>
                  </span>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    {item.time_taken_seconds}s
                  </span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </div>

                {/* Expanded Detail */}
                {isExpanded && item.score_components && Object.keys(item.score_components).length > 0 && (
                  <div
                    style={{
                      padding: '16px 24px 16px 48px',
                      background: 'var(--color-bg-page)',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                      Score Breakdown
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                      {Object.entries(item.score_components).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-lg"
                          style={{
                            padding: '8px 14px',
                            background: 'var(--color-bg-card)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                            {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {/* Score bar */}
                    <div className="mt-3">
                      <div className="progress-bar" style={{ height: 6 }}>
                        <div className="progress-fill" style={{ width: `${item.score}%`, background: scoreColor }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

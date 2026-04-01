import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDifficultyRecommendation } from '../services/cognitiveAI';
import api from '../api/apiClient';
import type { User } from '../types';
import {
  Brain,
  Play,
  Send,
  ArrowLeft,
  Clock,
  Zap,
  ListOrdered,
  MessageSquare,

  Loader2,
  AlertTriangle,
  Trophy,
  RotateCcw,
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface CognitiveSession {
  id: string;
  test_type: string;
  difficulty: string;
  status: string;
  test_config: Record<string, any>;
}

interface TestResult {
  session_id: string;
  test_type: string;
  score: number;
  score_components: Record<string, any>;
  time_taken_seconds: number;
  created_at: string;
}

type TestTypeOption = 'memory_recall' | 'verbal_fluency' | 'reaction_time' | 'sequence_memory';
type DifficultyOption = 'easy' | 'medium' | 'hard';

type Phase = 'select' | 'running' | 'result';

const TEST_TYPE_META: Record<TestTypeOption, { label: string; description: string; icon: any; color: string }> = {
  memory_recall: {
    label: 'Memory Recall',
    description: 'Remember and recall a list of words',
    icon: Brain,
    color: 'var(--color-primary)',
  },
  verbal_fluency: {
    label: 'Verbal Fluency',
    description: 'Name as many items in a category as you can',
    icon: MessageSquare,
    color: 'var(--color-teal)',
  },
  reaction_time: {
    label: 'Reaction Time',
    description: 'Click as fast as you can when the signal appears',
    icon: Zap,
    color: '#F59E0B',
  },
  sequence_memory: {
    label: 'Sequence Memory',
    description: 'Remember a sequence of numbers in order',
    icon: ListOrdered,
    color: '#8B5CF6',
  },
};

const DIFFICULTY_LABELS: Record<DifficultyOption, { label: string; color: string }> = {
  easy: { label: 'Easy', color: 'var(--color-success)' },
  medium: { label: 'Medium', color: 'var(--color-warning)' },
  hard: { label: 'Hard', color: 'var(--color-error)' },
};

// ============================================
// Component
// ============================================

export default function CognitiveTestPage({ user: _user }: { user: User }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('select');
  const [selectedTest, setSelectedTest] = useState<TestTypeOption>('memory_recall');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyOption>('medium');
  const [session, setSession] = useState<CognitiveSession | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestionLoaded, setSuggestionLoaded] = useState(false);

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  useEffect(() => {
    const loadRecommendation = async () => {
      const recommended = await getDifficultyRecommendation();
      setSelectedDifficulty(recommended as DifficultyOption);
      setSuggestionLoaded(true);
    };
    loadRecommendation();
  }, []);

  // ── Start Session ──
  const handleStartTest = async () => {
    if (!selectedTest) {
      setError("Please select a test type");
      return;
    }
    if (!selectedDifficulty) {
      setError("Please select difficulty");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/cognitive/start", {
        test_type: selectedTest,
        difficulty: selectedDifficulty
      });
      setSession(response.data);
      setPhase('running');
      startTimer();
    } catch (error: any) {
      console.error("Start test failed:", error);
      const message = error.response?.data?.detail || "Failed to start cognitive test";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ── Submit Test ──
  const handleSubmit = async (responses: Record<string, any>) => {
    if (!session) return;
    stopTimer();
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/cognitive/${session.id}/submit`, {
        responses,
        time_taken_seconds: Math.max(elapsedSeconds, 1)
      });
      setResult(response.data);
      setPhase('result');
    } catch (error: any) {
      console.error("Submit test failed:", error);
      const message = error.response?.data?.detail || "Failed to submit test";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ── Reset ──
  const handleReset = () => {
    stopTimer();
    setPhase('select');
    setSession(null);
    setResult(null);
    setError(null);
    setElapsedSeconds(0);
  };

  // ── Error Banner ──
  const ErrorBanner = () =>
    error ? (
      <div className="flex items-start gap-3 p-4 rounded-xl mb-6 relative" style={{ background: '#FEF2F2', border: '1px solid #F87171', color: '#991B1B' }}>
        <AlertTriangle size={20} className="mt-0.5 shrink-0" style={{ color: '#EF4444' }} />
        <div className="flex-1">
          <p style={{ fontWeight: 500 }}>{error}</p>
        </div>
        <button onClick={() => setError(null)} className="shrink-0" style={{ fontWeight: 500, color: '#B91C1C', textDecoration: 'underline', fontSize: '14px' }}>
          Dismiss
        </button>
      </div>
    ) : null;

  // ── PHASE: Select ──
  if (phase === 'select') {
    return (
      <div className="page-container animate-fadeIn">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{ width: 52, height: 52, background: 'var(--color-primary-50)' }}
          >
            <Brain size={28} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-navy)' }}>
              Cognitive Assessment
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
              Select a test type and difficulty to begin
            </p>
          </div>
        </div>

        <ErrorBanner />

        {/* Test Type Selection */}
        <div className="mb-8">
          <label className="label" style={{ fontSize: 'var(--text-lg)', marginBottom: 16 }}>
            Choose Test Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {(Object.entries(TEST_TYPE_META) as [TestTypeOption, typeof TEST_TYPE_META[TestTypeOption]][]).map(
              ([key, meta]) => {
                const Icon = meta.icon;
                const isSelected = selectedTest === key;
                return (
                  <button
                    key={key}
                    id={`test-type-${key}`}
                    onClick={() => setSelectedTest(key)}
                    className="card card-interactive"
                    style={{
                      padding: 24,
                      textAlign: 'left',
                      border: isSelected ? `2px solid ${meta.color}` : '1px solid var(--color-border)',
                      background: isSelected ? `${meta.color}10` : 'var(--color-bg-card)',
                      transform: isSelected ? 'translateY(-2px)' : 'none',
                      boxShadow: isSelected ? `0 8px 24px -6px ${meta.color}40` : 'var(--shadow-sm)',
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-xl mb-3"
                      style={{
                        width: 48,
                        height: 48,
                        background: isSelected ? `${meta.color}20` : 'var(--color-primary-50)',
                      }}
                    >
                      <Icon size={24} style={{ color: meta.color }} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-base)', marginBottom: 4 }}>{meta.label}</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                      {meta.description}
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-8">
          <label className="label" style={{ fontSize: 'var(--text-lg)', marginBottom: 16 }}>
            Difficulty
          </label>
          <div className="flex gap-3">
            {(Object.entries(DIFFICULTY_LABELS) as [DifficultyOption, typeof DIFFICULTY_LABELS[DifficultyOption]][]).map(
              ([key, meta]) => {
                const isSelected = selectedDifficulty === key;
                return (
                  <button
                    key={key}
                    id={`difficulty-${key}`}
                    onClick={() => setSelectedDifficulty(key)}
                    className="btn"
                    style={{
                      background: isSelected ? meta.color : 'var(--color-bg-card)',
                      color: isSelected ? '#fff' : 'var(--color-text-primary)',
                      border: isSelected ? `2px solid ${meta.color}` : '1px solid var(--color-border)',
                      fontWeight: 600,
                      minWidth: 100,
                    }}
                  >
                    {meta.label}
                  </button>
                );
              }
            )}
          </div>
          {suggestionLoaded && (
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: 12 }}>
              ✨ AI recommended difficulty based on recent performance
            </p>
          )}
        </div>

        {/* Start Button */}
        <button
          id="start-cognitive-test"
          className="btn btn-primary btn-lg"
          onClick={handleStartTest}
          disabled={loading || !selectedTest || !selectedDifficulty}
          style={{ gap: 10 }}
        >
          {loading ? <Loader2 size={22} className="animate-spin" /> : <Play size={22} />}
          {loading ? 'Starting Session…' : 'Start Test'}
        </button>
      </div>
    );
  }

  // ── PHASE: Running ──
  if (phase === 'running' && session) {
    return (
      <div className="page-container animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={handleReset} className="btn btn-ghost btn-sm">
              <ArrowLeft size={18} /> Back
            </button>
            <span
              className="badge"
              style={{
                background: `${TEST_TYPE_META[session.test_type as TestTypeOption]?.color || 'var(--color-primary)'}20`,
                color: TEST_TYPE_META[session.test_type as TestTypeOption]?.color || 'var(--color-primary)',
              }}
            >
              {TEST_TYPE_META[session.test_type as TestTypeOption]?.label || session.test_type}
            </span>
            <span className="badge badge-info">
              {DIFFICULTY_LABELS[session.difficulty as DifficultyOption]?.label || session.difficulty}
            </span>
          </div>
          <div className="flex items-center gap-2" style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            <Clock size={18} />
            {Math.floor(elapsedSeconds / 60)
              .toString()
              .padStart(2, '0')}
            :{(elapsedSeconds % 60).toString().padStart(2, '0')}
          </div>
        </div>

        <ErrorBanner />

        {/* Render the correct Test UI */}
        {session.test_type === 'memory_recall' && (
          <MemoryTest config={session.test_config} onSubmit={handleSubmit} loading={loading} />
        )}
        {session.test_type === 'verbal_fluency' && (
          <FluencyTest config={session.test_config} onSubmit={handleSubmit} loading={loading} />
        )}
        {session.test_type === 'reaction_time' && (
          <ReactionTest onSubmit={handleSubmit} loading={loading} />
        )}
        {session.test_type === 'sequence_memory' && (
          <SequenceTest config={session.test_config} onSubmit={handleSubmit} loading={loading} />
        )}
      </div>
    );
  }

  // ── PHASE: Result ──
  if (phase === 'result' && result) {
    const meta = TEST_TYPE_META[result.test_type as TestTypeOption];
    const scoreColor =
      result.score >= 80
        ? 'var(--color-success)'
        : result.score >= 50
          ? 'var(--color-warning)'
          : 'var(--color-error)';

    return (
      <div className="page-container animate-fadeIn">
        <div className="card" style={{ maxWidth: 560, margin: '0 auto', padding: 40, textAlign: 'center' }}>
          <div
            className="flex items-center justify-center rounded-full mx-auto mb-4"
            style={{ width: 72, height: 72, background: `${scoreColor}18` }}
          >
            <Trophy size={36} style={{ color: scoreColor }} />
          </div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 4 }}>Test Complete!</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
            {meta?.label || result.test_type}
          </p>

          {/* Score Circle */}
          <div
            className="flex items-center justify-center rounded-full mx-auto mb-6"
            style={{
              width: 140,
              height: 140,
              border: `6px solid ${scoreColor}`,
              background: `${scoreColor}0A`,
            }}
          >
            <div>
              <div style={{ fontSize: 42, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                {Math.round(result.score)}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                / 100
              </div>
            </div>
          </div>

          {/* Score Components */}
          {result.score_components && Object.keys(result.score_components).length > 0 && (
            <div
              className="text-left rounded-xl mb-6"
              style={{ background: 'var(--color-bg-page)', padding: 20, border: '1px solid var(--color-border)' }}
            >
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                Score Breakdown
              </div>
              {Object.entries(result.score_components).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between" style={{ padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 24 }}>
            Time taken: <strong>{result.time_taken_seconds}s</strong>
          </div>

          <div className="flex gap-3 justify-center">
            <button id="take-another-test" className="btn btn-primary" onClick={handleReset}>
              <RotateCcw size={18} /> Take Another Test
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/cognitive/summary')}>
              View Summary
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/cognitive/history')}>
              View History
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ============================================
// MEMORY RECALL TEST
// ============================================

function MemoryTest({
  config,
  onSubmit,
  loading,
}: {
  config: Record<string, any>;
  onSubmit: (responses: Record<string, any>) => void;
  loading: boolean;
}) {
  const words: string[] = config.words || [];
  const [showingWords, setShowingWords] = useState(true);
  const [countdown, setCountdown] = useState(10);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!showingWords) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setShowingWords(false);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showingWords]);

  const handleSubmit = () => {
    const recalled = input
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);
    onSubmit({ words: recalled });
  };

  if (showingWords) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <div
          className="flex items-center justify-center rounded-full mx-auto mb-4"
          style={{ width: 64, height: 64, background: 'var(--color-primary-50)' }}
        >
          <Brain size={32} style={{ color: 'var(--color-primary)' }} />
        </div>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 8 }}>Memorize These Words</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
          You have {countdown} seconds remaining
        </p>

        {/* Progress */}
        <div className="progress-bar mb-6" style={{ height: 6, maxWidth: 300, margin: '0 auto 24px' }}>
          <div
            className="progress-fill blue"
            style={{
              width: `${(countdown / 10) * 100}%`,
              transition: 'width 1s linear',
            }}
          />
        </div>

        {/* Word grid */}
        <div className="flex flex-wrap gap-3 justify-center">
          {words.map((word, i) => (
            <div
              key={i}
              className="rounded-xl"
              style={{
                padding: '14px 28px',
                background: 'var(--color-primary-50)',
                border: '2px solid var(--color-primary-100)',
                fontSize: 'var(--text-lg)',
                fontWeight: 700,
                color: 'var(--color-primary-dark)',
                animation: `fadeIn 0.3s ease-out ${i * 0.1}s backwards`,
              }}
            >
              {word}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
        Recall the Words
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, textAlign: 'center' }}>
        Type all the words you remember, separated by commas
      </p>
      <textarea
        id="memory-recall-input"
        className="input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="apple, chair, dog..."
        rows={4}
        style={{ resize: 'vertical', marginBottom: 20 }}
        autoFocus
      />
      <button
        id="submit-memory-test"
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={loading || !input.trim()}
        style={{ width: '100%' }}
      >
        {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        {loading ? 'Submitting…' : 'Submit Answers'}
      </button>
    </div>
  );
}

// ============================================
// VERBAL FLUENCY TEST
// ============================================

function FluencyTest({
  config,
  onSubmit,
  loading,
}: {
  config: Record<string, any>;
  onSubmit: (responses: Record<string, any>) => void;
  loading: boolean;
}) {
  const category = config.category || 'animals';
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    const words = input
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);
    onSubmit({ words });
  };

  return (
    <div className="card" style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}>
      <div
        className="flex items-center justify-center rounded-full mx-auto mb-4"
        style={{ width: 64, height: 64, background: 'var(--color-teal-50)' }}
      >
        <MessageSquare size={32} style={{ color: 'var(--color-teal)' }} />
      </div>
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
        Verbal Fluency
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 8, textAlign: 'center' }}>
        Name as many <strong style={{ color: 'var(--color-teal)' }}>{category}</strong> as you can
      </p>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 24, textAlign: 'center' }}>
        Separate each word with a comma
      </p>
      <textarea
        id="fluency-input"
        className="input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={`cat, dog, elephant, lion...`}
        rows={5}
        style={{ resize: 'vertical', marginBottom: 20 }}
        autoFocus
      />
      <button
        id="submit-fluency-test"
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={loading || !input.trim()}
        style={{ width: '100%' }}
      >
        {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        {loading ? 'Submitting…' : 'Submit Answers'}
      </button>
    </div>
  );
}

// ============================================
// REACTION TIME TEST
// ============================================

function ReactionTest({
  onSubmit,
  loading,
}: {
  onSubmit: (responses: Record<string, any>) => void;
  loading: boolean;
}) {
  type RTPhase = 'waiting' | 'ready' | 'go' | 'done' | 'too_early';
  const [rtPhase, setRtPhase] = useState<RTPhase>('waiting');
  const [reactionTime, setReactionTime] = useState<number>(0);
  const goTimestampRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRound = useCallback(() => {
    setRtPhase('ready');
    // Random delay between 2-5 seconds
    const delay = 2000 + Math.random() * 3000;
    timeoutRef.current = setTimeout(() => {
      goTimestampRef.current = performance.now();
      setRtPhase('go');
    }, delay);
  }, []);

  useEffect(() => {
    startRound();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [startRound]);

  const handleClick = () => {
    if (rtPhase === 'ready') {
      // Clicked too early
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setRtPhase('too_early');
    } else if (rtPhase === 'go') {
      const elapsed = Math.round(performance.now() - goTimestampRef.current);
      setReactionTime(elapsed);
      setRtPhase('done');
    }
  };

  const handleRetry = () => {
    setReactionTime(0);
    startRound();
  };

  const bgColor =
    rtPhase === 'ready'
      ? '#DC2626'
      : rtPhase === 'go'
        ? '#16A34A'
        : rtPhase === 'too_early'
          ? '#D97706'
          : 'var(--color-primary)';

  const label =
    rtPhase === 'waiting'
      ? 'Getting ready...'
      : rtPhase === 'ready'
        ? 'Wait for green...'
        : rtPhase === 'go'
          ? 'CLICK NOW!'
          : rtPhase === 'too_early'
            ? 'Too early!'
            : `${reactionTime}ms`;

  return (
    <div className="card" style={{ padding: 40, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
      <div
        className="flex items-center justify-center rounded-full mx-auto mb-4"
        style={{ width: 64, height: 64, background: '#FEF3C7' }}
      >
        <Zap size={32} style={{ color: '#F59E0B' }} />
      </div>
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 24 }}>Reaction Time</h2>

      <button
        id="reaction-target"
        onClick={handleClick}
        disabled={rtPhase === 'done' || rtPhase === 'waiting'}
        style={{
          width: '100%',
          height: 220,
          borderRadius: 'var(--radius-xl)',
          background: bgColor,
          color: '#fff',
          fontSize: 'var(--text-2xl)',
          fontWeight: 800,
          border: 'none',
          cursor: rtPhase === 'done' ? 'default' : 'pointer',
          transition: 'background 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        {label}
      </button>

      {rtPhase === 'too_early' && (
        <button className="btn btn-secondary" onClick={handleRetry}>
          <RotateCcw size={18} /> Try Again
        </button>
      )}

      {rtPhase === 'done' && (
        <div className="flex gap-3 justify-center">
          <button
            id="submit-reaction-test"
            className="btn btn-primary"
            onClick={() => onSubmit({ reaction_time_ms: reactionTime })}
            disabled={loading}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            {loading ? 'Submitting…' : 'Submit Result'}
          </button>
          <button className="btn btn-secondary" onClick={handleRetry}>
            <RotateCcw size={18} /> Retry
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// SEQUENCE MEMORY TEST
// ============================================

function SequenceTest({
  config,
  onSubmit,
  loading,
}: {
  config: Record<string, any>;
  onSubmit: (responses: Record<string, any>) => void;
  loading: boolean;
}) {
  const expectedSequence: number[] = config.sequence || [];
  const [showingSequence, setShowingSequence] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!showingSequence) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setShowingSequence(false);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showingSequence]);

  const handleSubmit = () => {
    const seq = input
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
    onSubmit({ sequence: seq });
  };

  if (showingSequence) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <div
          className="flex items-center justify-center rounded-full mx-auto mb-4"
          style={{ width: 64, height: 64, background: '#EDE9FE' }}
        >
          <ListOrdered size={32} style={{ color: '#8B5CF6' }} />
        </div>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 8 }}>Memorize the Sequence</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
          {countdown} seconds remaining
        </p>

        <div className="progress-bar mb-6" style={{ height: 6, maxWidth: 300, margin: '0 auto 24px' }}>
          <div
            className="progress-fill blue"
            style={{
              width: `${(countdown / 5) * 100}%`,
              transition: 'width 1s linear',
              background: '#8B5CF6',
            }}
          />
        </div>

        <div className="flex gap-3 justify-center flex-wrap">
          {expectedSequence.map((num, i) => (
            <div
              key={i}
              className="flex items-center justify-center rounded-xl"
              style={{
                width: 64,
                height: 64,
                background: '#8B5CF620',
                border: '2px solid #8B5CF6',
                fontSize: 'var(--text-2xl)',
                fontWeight: 800,
                color: '#8B5CF6',
                animation: `fadeIn 0.3s ease-out ${i * 0.12}s backwards`,
              }}
            >
              {num}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
        Enter the Sequence
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24, textAlign: 'center' }}>
        Type the numbers you remember, separated by commas
      </p>
      <input
        id="sequence-input"
        className="input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="3, 7, 1, 9..."
        style={{ marginBottom: 20, textAlign: 'center', fontSize: 'var(--text-lg)', letterSpacing: 4 }}
        autoFocus
      />
      <button
        id="submit-sequence-test"
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={loading || !input.trim()}
        style={{ width: '100%' }}
      >
        {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        {loading ? 'Submitting…' : 'Submit Sequence'}
      </button>
    </div>
  );
}

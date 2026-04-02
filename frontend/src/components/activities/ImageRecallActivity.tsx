import { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Clock, Grid3X3, Loader2, Send } from 'lucide-react';

interface Props {
    content: {
        title: string;
        instructions: string;
        grid: string[][];
        memorize_seconds: number;
        questions: { prompt: string; options: string[]; answer: string }[];
    };
    onSubmit: (responses: Record<string, string>) => void;
    submitting: boolean;
}

export default function ImageRecallActivity({ content, onSubmit, submitting }: Props) {
    const [phase, setPhase] = useState<'memorize' | 'recall'>('memorize');
    const [timer, setTimer] = useState(content.memorize_seconds);
    const [answers, setAnswers] = useState<Record<number, string>>({});

    useEffect(() => {
        if (phase !== 'memorize') return;
        if (timer <= 0) { setPhase('recall'); return; }
        const interval = setInterval(() => setTimer(t => t - 1), 1000);
        return () => clearInterval(interval);
    }, [phase, timer]);

    const allAnswered = Object.keys(answers).length === content.questions.length;

    const handleSubmit = useCallback(() => {
        const responses: Record<string, string> = {};
        Object.entries(answers).forEach(([idx, val]) => { responses[`q${idx}`] = val; });
        onSubmit(responses);
    }, [answers, onSubmit]);

    const progress = ((content.memorize_seconds - timer) / content.memorize_seconds) * 100;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, animation: 'fadeIn 0.5s ease' }}>
            {phase === 'memorize' ? (
                <>
                    {/* Header & Timer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#1A6FA8' }}>
                            <Eye size={24} />
                            <span style={{ fontSize: 20, fontWeight: 800 }}>Memorize this grid!</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Clock size={20} color="#F59E0B" />
                            <span style={{ fontSize: 28, fontWeight: 800, fontFamily: 'monospace', color: '#0D2B45' }}>{timer}s</span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: 8, background: '#DCE5ED', borderRadius: 4, overflow: 'hidden' }}>
                        <div
                            style={{
                                height: '100%',
                                background: 'linear-gradient(90deg, #F59E0B, #F97316)',
                                borderRadius: 4,
                                transition: 'width 1s linear',
                                width: `${progress}%`,
                            }}
                        />
                    </div>

                    {/* Grid */}
                    <div style={{
                        background: 'linear-gradient(135deg, #0D2B45 0%, #1A4A6E 100%)',
                        borderRadius: 24,
                        padding: '48px',
                        boxShadow: '0 12px 40px rgba(13,43,69,0.25)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
                            <Grid3X3 size={18} color="#7AB8D9" />
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#7AB8D9', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Visual Grid</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                            {content.grid.map((row, ri) => (
                                <div key={ri} style={{ display: 'flex', gap: 16 }}>
                                    {row.map((cell, ci) => (
                                        <div
                                            key={ci}
                                            style={{
                                                width: 100,
                                                height: 100,
                                                background: 'rgba(255, 255, 255, 0.1)',
                                                backdropFilter: 'blur(10px)',
                                                borderRadius: 24,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 48,
                                                boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.05), 0 4px 16px rgba(0,0,0,0.2)',
                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                transition: 'transform 0.2s',
                                                cursor: 'default'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                        >
                                            {cell}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                        <button
                            onClick={() => { setTimer(0); setPhase('recall'); }}
                            style={{
                                padding: '14px 28px',
                                borderRadius: 14,
                                background: '#F7FBFF',
                                border: '1px solid #DCE5ED',
                                color: '#7AA3BE',
                                fontSize: 16,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.color = '#1A6FA8'; e.currentTarget.style.borderColor = '#1A6FA8'; }}
                            onMouseOut={(e) => { e.currentTarget.style.color = '#7AA3BE'; e.currentTarget.style.borderColor = '#DCE5ED'; }}
                        >
                            I'm ready — skip ahead
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <EyeOff size={28} color="#1A6FA8" />
                        <span style={{ fontSize: 24, fontWeight: 800, color: '#0D2B45' }}>Answer from memory!</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {content.questions.map((q, i) => (
                            <div key={i} style={{
                                background: '#F7FBFF',
                                borderRadius: 24,
                                padding: 32,
                                border: '1px solid #DCE5ED',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                            }}>
                                <p style={{ color: '#0D2B45', fontWeight: 700, fontSize: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: 32, height: 32, borderRadius: '50%',
                                        background: '#1A6FA8', color: 'white', fontSize: 14, fontWeight: 800
                                    }}>
                                        {i + 1}
                                    </span>
                                    {q.prompt}
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                                    {q.options.map(opt => {
                                        const isSelected = answers[i] === opt;
                                        return (
                                            <button
                                                key={opt}
                                                onClick={() => setAnswers(prev => ({ ...prev, [i]: opt }))}
                                                style={{
                                                    padding: '20px',
                                                    borderRadius: 16,
                                                    fontSize: 18,
                                                    fontWeight: 600,
                                                    border: isSelected ? '2px solid #1A6FA8' : '2px solid #E5E7EB',
                                                    background: isSelected ? '#1A6FA8' : 'white',
                                                    color: isSelected ? 'white' : '#0D2B45',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    boxShadow: isSelected ? '0 6px 20px rgba(26,111,168,0.2)' : '0 2px 4px rgba(0,0,0,0.02)',
                                                    transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                                                }}
                                                onMouseOver={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#1A6FA8'; e.currentTarget.style.background = '#F7FBFF'; } }}
                                                onMouseOut={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = 'white'; } }}
                                            >
                                                {opt}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                        <div style={{ fontSize: 15, color: '#7AA3BE', fontWeight: 600 }}>
                            Answered: <span style={{ color: '#1A6FA8', fontWeight: 800, fontSize: 18 }}>
                                {Object.keys(answers).length}
                            </span> / {content.questions.length}
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !allAnswered}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '16px 40px',
                                borderRadius: 16,
                                background: allAnswered ? 'linear-gradient(135deg, #1A6FA8, #0D9488)' : '#E5E7EB',
                                color: allAnswered ? 'white' : '#9CA3AF',
                                fontSize: 18,
                                fontWeight: 700,
                                border: 'none',
                                cursor: allAnswered ? 'pointer' : 'not-allowed',
                                boxShadow: allAnswered ? '0 8px 24px rgba(26,111,168,0.3)' : 'none',
                                opacity: submitting ? 0.7 : 1,
                                transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => { if (allAnswered && !submitting) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseOut={(e) => { if (allAnswered && !submitting) e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            {submitting ? (<><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Evaluating...</>) : (<><Send size={20} /> Submit Answers</>)}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

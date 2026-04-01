import { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Clock, Brain, Loader2, Send } from 'lucide-react';

interface Props {
    content: {
        title: string;
        instructions: string;
        items: string[];
        memorize_seconds: number;
    };
    onSubmit: (responses: Record<string, string>) => void;
    submitting: boolean;
}

export default function MemoryRecallActivity({ content, onSubmit, submitting }: Props) {
    const [phase, setPhase] = useState<'memorize' | 'recall'>('memorize');
    const [timer, setTimer] = useState(content.memorize_seconds);
    const [recalledItems, setRecalledItems] = useState('');

    useEffect(() => {
        if (phase !== 'memorize') return;
        if (timer <= 0) {
            setPhase('recall');
            return;
        }
        const interval = setInterval(() => setTimer(t => t - 1), 1000);
        return () => clearInterval(interval);
    }, [phase, timer]);

    const handleSubmit = useCallback(() => {
        const words = recalledItems
            .split(/[,\n]+/)
            .map(w => w.trim().toLowerCase())
            .filter(Boolean);
        const responses: Record<string, string> = {};
        words.forEach((w, i) => { responses[`q${i}`] = w; });
        onSubmit(responses);
    }, [recalledItems, onSubmit]);

    const progress = ((content.memorize_seconds - timer) / content.memorize_seconds) * 100;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, animation: 'fadeIn 0.5s ease' }}>
            {phase === 'memorize' ? (
                <>
                    {/* Header & Timer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#1A6FA8' }}>
                            <Eye size={24} />
                            <span style={{ fontSize: 20, fontWeight: 800 }}>Memorize these items!</span>
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
                                background: 'linear-gradient(90deg, #1A6FA8, #28A98C)',
                                borderRadius: 4,
                                transition: 'width 1s linear',
                                width: `${progress}%`,
                            }}
                        />
                    </div>

                    {/* Items Display Card */}
                    <div style={{
                        background: 'linear-gradient(135deg, #0D2B45 0%, #1A4A6E 100%)',
                        borderRadius: 24,
                        padding: '48px',
                        boxShadow: '0 12px 40px rgba(13,43,69,0.25)',
                    }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
                            {content.items.map((item, i) => (
                                <div
                                    key={i}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        padding: '16px 32px',
                                        borderRadius: 20,
                                        color: 'white',
                                        fontSize: 24,
                                        fontWeight: 700,
                                        textTransform: 'capitalize',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    {item}
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
                        <span style={{ fontSize: 24, fontWeight: 800, color: '#0D2B45' }}>Now recall the items!</span>
                    </div>
                    <p style={{ fontSize: 16, color: '#7AA3BE', marginBottom: 24 }}>
                        Type each item you remember, separated by commas or new lines.
                    </p>

                    <div style={{ position: 'relative' }}>
                        <Brain size={24} color="#9BB8CD" style={{ position: 'absolute', top: 24, left: 24 }} />
                        <textarea
                            style={{
                                width: '100%',
                                minHeight: 200,
                                padding: '24px 24px 24px 64px',
                                background: '#F7FBFF',
                                border: '2px solid #DCE5ED',
                                borderRadius: 24,
                                fontSize: 20,
                                color: '#0D2B45',
                                outline: 'none',
                                resize: 'vertical',
                                boxSizing: 'border-box',
                                transition: 'all 0.2s',
                            }}
                            placeholder="apple, chair, blue, ..."
                            value={recalledItems}
                            onChange={(e) => setRecalledItems(e.target.value)}
                            onFocus={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#1A6FA8'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(26,111,168,0.1)'; }}
                            onBlur={(e) => { e.currentTarget.style.background = '#F7FBFF'; e.currentTarget.style.borderColor = '#DCE5ED'; e.currentTarget.style.boxShadow = 'none'; }}
                            autoFocus
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                        <div style={{ fontSize: 15, color: '#7AA3BE', fontWeight: 600 }}>
                            Items entered: <span style={{ color: '#1A6FA8', fontWeight: 800, fontSize: 18 }}>
                                {recalledItems.split(/[,\n]+/).filter(w => w.trim()).length}
                            </span> / {content.items.length}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !recalledItems.trim()}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '16px 40px',
                                borderRadius: 16,
                                background: recalledItems.trim() ? 'linear-gradient(135deg, #1A6FA8, #0D9488)' : '#E5E7EB',
                                color: recalledItems.trim() ? 'white' : '#9CA3AF',
                                fontSize: 18,
                                fontWeight: 700,
                                border: 'none',
                                cursor: recalledItems.trim() ? 'pointer' : 'not-allowed',
                                boxShadow: recalledItems.trim() ? '0 8px 24px rgba(26,111,168,0.3)' : 'none',
                                opacity: submitting ? 0.7 : 1,
                                transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => { if (recalledItems.trim() && !submitting) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseOut={(e) => { if (recalledItems.trim() && !submitting) e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            {submitting ? (<><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Evaluating...</>) : (<><Send size={20} /> Submit Recall</>)}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

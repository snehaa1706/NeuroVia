import { useState, useCallback } from 'react';
import { Shapes, ChevronLeft, ChevronRight, Loader2, Send } from 'lucide-react';

interface SequenceItem {
    display: string;
    options: string[];
    answer: string;
}

interface Props {
    content: {
        title: string;
        instructions: string;
        sequences: SequenceItem[];
    };
    onSubmit: (responses: Record<string, string>) => void;
    submitting: boolean;
}

export default function PatternRecognitionActivity({ content, onSubmit, submitting }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const total = content.sequences.length;
    const current = content.sequences[currentIndex];
    const allAnswered = Object.keys(answers).length === total;

    const selectAnswer = useCallback((value: string) => {
        setAnswers(prev => ({ ...prev, [currentIndex]: value }));
    }, [currentIndex]);

    const handleSubmit = useCallback(() => {
        const responses: Record<string, string> = {};
        Object.entries(answers).forEach(([idx, val]) => { responses[`q${idx}`] = val; });
        onSubmit(responses);
    }, [answers, onSubmit]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Progress indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                {content.sequences.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 15,
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            transform: i === currentIndex ? 'scale(1.15)' : 'scale(1)',
                            background: i === currentIndex ? '#1A6FA8' : answers[i] ? '#0D9488' : '#F3F4F6',
                            color: i === currentIndex || answers[i] ? 'white' : '#9CA3AF',
                            boxShadow: i === currentIndex ? '0 4px 16px rgba(26,111,168,0.35)' : 'none',
                        }}
                    >
                        {i + 1}
                    </button>
                ))}
                <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600, marginLeft: 8 }}>
                    {Object.keys(answers).length}/{total} answered
                </span>
            </div>

            {/* Sequence display card */}
            <div style={{
                background: 'linear-gradient(135deg, #0D2B45 0%, #1A4A6E 100%)',
                borderRadius: 24,
                padding: '40px 48px',
                textAlign: 'center',
                boxShadow: '0 12px 40px rgba(13,43,69,0.25)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
                    <Shapes size={18} color="#7AB8D9" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#7AB8D9', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Find the Pattern</span>
                </div>
                <div style={{
                    fontSize: 40,
                    fontWeight: 800,
                    color: 'white',
                    fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
                    letterSpacing: '4px',
                    padding: '16px 0',
                    lineHeight: 1.3,
                }}>
                    {current.display}
                </div>
            </div>

            {/* Option buttons - 2x2 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {current.options.map((opt) => {
                    const isSelected = answers[currentIndex] === opt;
                    return (
                        <button
                            key={opt}
                            onClick={() => selectAnswer(opt)}
                            style={{
                                padding: '24px 20px',
                                borderRadius: 18,
                                fontSize: 22,
                                fontWeight: 700,
                                border: isSelected ? '2px solid #1A6FA8' : '2px solid #E5E7EB',
                                background: isSelected ? '#1A6FA8' : 'white',
                                color: isSelected ? 'white' : '#0D2B45',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isSelected ? '0 6px 24px rgba(26,111,168,0.25)' : '0 1px 4px rgba(0,0,0,0.04)',
                                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                            }}
                            onMouseOver={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#1A6FA8'; e.currentTarget.style.background = '#F7FBFF'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; } }}
                            onMouseOut={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = 'white'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; } }}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
                <button
                    onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '12px 20px', borderRadius: 14,
                        border: '1px solid #E5E7EB', background: 'white',
                        color: currentIndex === 0 ? '#D1D5DB' : '#6B7280',
                        fontWeight: 600, fontSize: 14, cursor: currentIndex === 0 ? 'default' : 'pointer',
                        opacity: currentIndex === 0 ? 0.4 : 1,
                        transition: 'all 0.2s',
                    }}
                >
                    <ChevronLeft size={16} /> Previous
                </button>

                {currentIndex < total - 1 ? (
                    <button
                        onClick={() => setCurrentIndex(i => Math.min(total - 1, i + 1))}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '12px 24px', borderRadius: 14,
                            border: 'none', background: '#0D2B45', color: 'white',
                            fontWeight: 600, fontSize: 14, cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(13,43,69,0.3)',
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#1A6FA8'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#0D2B45'; }}
                    >
                        Next <ChevronRight size={16} />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !allAnswered}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '14px 32px', borderRadius: 14,
                            border: 'none',
                            background: allAnswered ? 'linear-gradient(135deg, #1A6FA8, #0D9488)' : '#E5E7EB',
                            color: allAnswered ? 'white' : '#9CA3AF',
                            fontWeight: 700, fontSize: 15, cursor: allAnswered ? 'pointer' : 'not-allowed',
                            boxShadow: allAnswered ? '0 6px 24px rgba(26,111,168,0.3)' : 'none',
                            opacity: submitting ? 0.7 : 1,
                            transition: 'all 0.2s',
                        }}
                    >
                        {submitting ? (<><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Evaluating...</>) : (<><Send size={16} /> Submit Answers</>)}
                    </button>
                )}
            </div>
        </div>
    );
}

import { useState, useCallback } from 'react';
import { Link2, ChevronLeft, ChevronRight, Loader2, Send } from 'lucide-react';

interface WordPair {
    word: string;
    options: string[];
    answer: string;
}

interface Props {
    content: {
        title: string;
        instructions: string;
        pairs: WordPair[];
    };
    onSubmit: (responses: Record<string, string>) => void;
    submitting: boolean;
}

export default function WordAssociationActivity({ content, onSubmit, submitting }: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const total = content.pairs.length;
    const current = content.pairs[currentIndex];
    const allAnswered = Object.keys(answers).length === total;

    const handleSubmit = useCallback(() => {
        const responses: Record<string, string> = {};
        Object.entries(answers).forEach(([idx, val]) => { responses[`q${idx}`] = val; });
        onSubmit(responses);
    }, [answers, onSubmit]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, animation: 'fadeIn 0.5s ease' }}>
            {/* Progress indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                {content.pairs.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            transform: i === currentIndex ? 'scale(1.3)' : 'scale(1)',
                            background: i === currentIndex ? '#1A6FA8' : answers[i] ? '#0D9488' : '#DCE5ED',
                            boxShadow: i === currentIndex ? '0 4px 12px rgba(26,111,168,0.3)' : 'none',
                        }}
                        aria-label={`Question ${i + 1}`}
                    />
                ))}
                <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600, marginLeft: 12 }}>
                    Question {currentIndex + 1} of {total}
                </span>
            </div>

            {/* Target word */}
            <div style={{
                background: 'linear-gradient(135deg, #0D2B45 0%, #1A4A6E 100%)',
                borderRadius: 24,
                padding: '48px',
                textAlign: 'center',
                boxShadow: '0 12px 40px rgba(13,43,69,0.25)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
                    <Link2 size={18} color="#7AB8D9" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#7AB8D9', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Find the best match for</span>
                </div>
                <div style={{
                    fontSize: 56,
                    fontWeight: 800,
                    color: 'white',
                    fontFamily: '"Lora", "Georgia", serif',
                    letterSpacing: '1px',
                    padding: '8px 0',
                }}>
                    {current.word}
                </div>
            </div>

            {/* Option buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {current.options.map((opt) => {
                    const isSelected = answers[currentIndex] === opt;
                    return (
                        <button
                            key={opt}
                            onClick={() => {
                                setAnswers(prev => ({ ...prev, [currentIndex]: opt }));
                                setTimeout(() => {
                                    if (currentIndex < total - 1) setCurrentIndex(i => i + 1);
                                }, 300);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 20,
                                padding: '24px',
                                borderRadius: 20,
                                fontSize: 20,
                                fontWeight: 600,
                                border: isSelected ? '2px solid #1A6FA8' : '2px solid #E5E7EB',
                                background: isSelected ? '#1A6FA8' : 'white',
                                color: isSelected ? 'white' : '#0D2B45',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: isSelected ? '0 8px 24px rgba(26,111,168,0.2)' : '0 2px 8px rgba(0,0,0,0.02)',
                                transform: isSelected ? 'translateX(8px)' : 'translateX(0)',
                            }}
                            onMouseOver={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#1A6FA8'; e.currentTarget.style.background = '#F7FBFF'; e.currentTarget.style.transform = 'translateX(4px)'; } }}
                            onMouseOut={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'translateX(0)'; } }}
                        >
                            <span style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 14,
                                fontWeight: 800,
                                border: '2px solid',
                                borderColor: isSelected ? 'white' : '#DCE5ED',
                                color: isSelected ? '#1A6FA8' : '#7AA3BE',
                                background: isSelected ? 'white' : 'transparent',
                                flexShrink: 0
                            }}>
                                {String.fromCharCode(65 + current.options.indexOf(opt))}
                            </span>
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

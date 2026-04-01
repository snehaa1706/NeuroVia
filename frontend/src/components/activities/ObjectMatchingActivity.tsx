import { useState, useCallback } from 'react';
import { FolderOpen, Check, Loader2, Send } from 'lucide-react';

interface Props {
    content: {
        title: string;
        instructions: string;
        categories: string[];
        items: { name: string; emoji: string; category: string }[];
    };
    onSubmit: (responses: Record<string, string>) => void;
    submitting: boolean;
}

export default function ObjectMatchingActivity({ content, onSubmit, submitting }: Props) {
    const [assignments, setAssignments] = useState<Record<string, string>>({});
    const [activeItem, setActiveItem] = useState<string | null>(null);

    const allAssigned = Object.keys(assignments).length === content.items.length;

    const assignToCategory = useCallback((category: string) => {
        if (!activeItem) return;
        setAssignments(prev => ({ ...prev, [activeItem]: category }));
        setActiveItem(null);
    }, [activeItem]);

    const handleSubmit = useCallback(() => {
        const responses: Record<string, string> = {};
        content.items.forEach((item, i) => {
            responses[`q${i}`] = assignments[item.name] || '';
        });
        onSubmit(responses);
    }, [assignments, content.items, onSubmit]);

    const getItemsInCategory = (cat: string) =>
        content.items.filter(item => assignments[item.name] === cat);

    const unassignedItems = content.items.filter(item => !assignments[item.name]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, animation: 'fadeIn 0.5s ease' }}>
            {/* Context/Instructions */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <FolderOpen size={28} color="#1A6FA8" />
                    <span style={{ fontSize: 24, fontWeight: 800, color: '#0D2B45' }}>Sort the items!</span>
                </div>
                <p style={{ fontSize: 16, color: '#7AA3BE' }}>
                    Tap an item below, then tap the category it belongs to.
                </p>
            </div>

            {/* Unassigned items workspace */}
            <div style={{
                background: 'linear-gradient(135deg, #F7FBFF 0%, #FFFFFF 100%)',
                borderRadius: 24,
                padding: '32px 40px',
                border: '2px dashed #DCE5ED',
                minHeight: 140,
                display: 'flex',
                flexDirection: 'column',
                gap: 16
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#7AA3BE', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Items to sort ({unassignedItems.length} remaining)
                    </span>
                    {unassignedItems.length === 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0D9488', fontWeight: 700, fontSize: 15 }}>
                            <Check size={18} /> All sorted!
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    {unassignedItems.map((item) => {
                        const isActive = activeItem === item.name;
                        return (
                            <button
                                key={item.name}
                                onClick={() => setActiveItem(isActive ? null : item.name)}
                                style={{
                                    padding: '16px 24px',
                                    borderRadius: 16,
                                    fontSize: 18,
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    border: isActive ? '2px solid #1A6FA8' : '2px solid #E5E7EB',
                                    background: isActive ? '#1A6FA8' : 'white',
                                    color: isActive ? 'white' : '#0D2B45',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: isActive ? '0 8px 24px rgba(26,111,168,0.25)' : '0 2px 8px rgba(0,0,0,0.04)',
                                    transform: isActive ? 'translateY(-4px)' : 'translateY(0)',
                                }}
                                onMouseOver={(e) => { if (!isActive) { e.currentTarget.style.borderColor = '#1A6FA8'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; } }}
                                onMouseOut={(e) => { if (!isActive) { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; } }}
                            >
                                <span style={{ fontSize: 24 }}>{item.emoji}</span>
                                {item.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Category target zones */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
                {content.categories.map((cat) => {
                    const itemsHere = getItemsInCategory(cat);
                    const canDrop = activeItem !== null;
                    return (
                        <button
                            key={cat}
                            onClick={() => assignToCategory(cat)}
                            disabled={!canDrop}
                            style={{
                                borderRadius: 24,
                                padding: '32px',
                                textAlign: 'left',
                                border: '2px solid',
                                borderColor: canDrop ? '#1A6FA8' : '#DCE5ED',
                                background: canDrop ? '#F7FBFF' : 'white',
                                minHeight: 180,
                                transition: 'all 0.2s',
                                cursor: canDrop ? 'pointer' : 'default',
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: canDrop ? '0 8px 24px rgba(26,111,168,0.1)' : 'none',
                                transform: canDrop ? 'scale(1.02)' : 'scale(1)',
                            }}
                            onMouseOver={(e) => { if (canDrop) e.currentTarget.style.background = 'rgba(26,111,168,0.1)'; }}
                            onMouseOut={(e) => { if (canDrop) e.currentTarget.style.background = '#F7FBFF'; }}
                        >
                            <div style={{ fontSize: 16, fontWeight: 800, color: '#1A6FA8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 20 }}>
                                {cat}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                {itemsHere.map(item => (
                                    <span
                                        key={item.name}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setAssignments(prev => {
                                                const next = { ...prev };
                                                delete next[item.name];
                                                return next;
                                            });
                                        }}
                                        style={{
                                            padding: '12px 16px',
                                            background: '#EAF7F4',
                                            color: '#0D2B45',
                                            borderRadius: 12,
                                            fontSize: 16,
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            cursor: 'pointer',
                                            border: '1px solid #C6EAE1',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.color = '#DC2626'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.background = '#EAF7F4'; e.currentTarget.style.borderColor = '#C6EAE1'; e.currentTarget.style.color = '#0D2B45'; }}
                                    >
                                        <span style={{ fontSize: 20 }}>{item.emoji}</span>
                                        {item.name}
                                        <span style={{ fontSize: 14, opacity: 0.5, marginLeft: 4 }}>✕</span>
                                    </span>
                                ))}
                                {itemsHere.length === 0 && (
                                    <span style={{ color: '#9BB8CD', fontSize: 15, fontStyle: 'italic', fontWeight: 500 }}>
                                        {canDrop ? 'Tap here to drop item...' : 'Empty category...'}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                    onClick={handleSubmit}
                    disabled={submitting || !allAssigned}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '16px 40px',
                        borderRadius: 16,
                        background: allAssigned ? 'linear-gradient(135deg, #1A6FA8, #0D9488)' : '#E5E7EB',
                        color: allAssigned ? 'white' : '#9CA3AF',
                        fontSize: 18,
                        fontWeight: 700,
                        border: 'none',
                        cursor: allAssigned ? 'pointer' : 'not-allowed',
                        boxShadow: allAssigned ? '0 8px 24px rgba(26,111,168,0.3)' : 'none',
                        opacity: submitting ? 0.7 : 1,
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => { if (allAssigned && !submitting) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseOut={(e) => { if (allAssigned && !submitting) e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    {submitting ? (<><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Evaluating...</>) : (<><Send size={20} /> Submit Sorting</>)}
                </button>
            </div>
        </div>
    );
}

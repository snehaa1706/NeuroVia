

export function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white/90 backdrop-blur-xl border border-white/20 shadow-xl rounded-3xl ${className}`}>
            {children}
        </div>
    );
}

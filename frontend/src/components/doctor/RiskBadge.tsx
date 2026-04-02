interface RiskBadgeProps {
    level?: string;
}

export function RiskBadge({ level }: RiskBadgeProps) {
    if (!level) return null;

    const config: Record<string, { className: string; label: string }> = {
        low: { className: 'badge-low', label: 'Low Risk' },
        moderate: { className: 'badge-moderate', label: 'Moderate Risk' },
        high: { className: 'badge-high', label: 'High Risk' },
    };

    const { className, label } = config[level] || { className: 'badge-info', label: level };

    return (
        <span className={`badge ${className}`}>
            {label}
        </span>
    );
}

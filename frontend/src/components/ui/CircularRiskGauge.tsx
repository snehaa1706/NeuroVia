import React, { useEffect, useState } from 'react';

interface CircularRiskGaugeProps {
    score: number;
    size?: number;
    strokeWidth?: number;
    showLabel?: boolean;
}

export const CircularRiskGauge: React.FC<CircularRiskGaugeProps> = ({
    score,
    size = 120,
    strokeWidth = 12,
    showLabel = true,
}) => {
    const [animatedScore, setAnimatedScore] = useState(0);

    // Trigger animation mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedScore(score);
        }, 100);
        return () => clearTimeout(timer);
    }, [score]);

    // Math for SVG
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    // Calculate offset (0 = full circle, circumference = empty circle)
    // Ensure we clamp between 0 and 100
    const clampedScore = Math.min(Math.max(animatedScore, 0), 100);
    const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

    // Color Mapping Thresholds (Tailwind Classes)
    let colorClass = 'text-teal-500'; // Low Risk
    if (score > 33 && score <= 66) {
        colorClass = 'text-amber-500'; // Moderate
    } else if (score > 66) {
        colorClass = 'text-rose-500'; // High
    }

    return (
        <div className="relative flex flex-col items-center justify-center">
            <div
                className="relative flex items-center justify-center"
                style={{ width: size, height: size }}
            >
                {/* Background Track Circle */}
                <svg
                    width={size}
                    height={size}
                    className="absolute transform -rotate-90"
                >
                    <circle
                        className="text-gray-200 stroke-current"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                    {/* Foreground Animated Circle */}
                    <circle
                        className={`${colorClass} stroke-current transition-all duration-1000 ease-out`}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                        style={{
                            strokeDasharray: circumference,
                            strokeDashoffset: strokeDashoffset,
                        }}
                    />
                </svg>

                {/* Center Text */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className={`font-bold ${colorClass}`} style={{ fontSize: size * 0.25 }}>
                        {score}%
                    </span>
                    {showLabel && size >= 100 && (
                        <span className="text-gray-500 font-medium" style={{ fontSize: size * 0.12 }}>
                            Risk
                        </span>
                    )}
                </div>
            </div>

            {/* Optional Below-Gauge Label mapping */}
            {showLabel && (
                <div className={`mt-3 font-semibold ${colorClass}`}>
                    {score <= 33 && "Low Risk"}
                    {score > 33 && score <= 66 && "Moderate Risk"}
                    {score > 66 && "High Risk"}
                </div>
            )}
        </div>
    );
};

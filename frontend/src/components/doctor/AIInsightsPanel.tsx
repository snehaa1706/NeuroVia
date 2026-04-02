import { BrainCircuit, AlertTriangle, Lightbulb, FileWarning } from 'lucide-react';
import { RiskBadge } from './RiskBadge';

interface AIInsightsPanelProps {
    summary?: string;
    riskLevel?: string;
    keyConcerns?: string[];
    suggestedActions?: string[];
}

export function AIInsightsPanel({ summary, riskLevel, keyConcerns, suggestedActions }: AIInsightsPanelProps) {
    const hasData = summary || riskLevel || (keyConcerns && keyConcerns.length > 0) || (suggestedActions && suggestedActions.length > 0);

    if (!hasData) {
        return (
            <div className="bg-[#F7FBFF] rounded-2xl border border-[#DCE5ED] p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[#E8F1F7] flex items-center justify-center mx-auto mb-4">
                    <FileWarning className="w-8 h-8 text-[#7AA3BE]" />
                </div>
                <h4 className="text-lg font-bold text-[#0D2B45] mb-2">AI Insights Pending</h4>
                <p className="text-sm text-[#7AA3BE]">
                    AI analysis has not yet been generated for this consultation.
                    This may happen if no screening assessment was linked.
                </p>
            </div>
        );
    }

    const riskScore = riskLevel === 'high' ? 85 : riskLevel === 'moderate' ? 55 : 25;
    const riskColor = riskLevel === 'high' ? 'danger' : riskLevel === 'moderate' ? 'warning' : 'success';

    return (
        <div className="bg-white rounded-2xl border border-[#DCE5ED] shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#F7FBFF] to-white border-b border-[#DCE5ED] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A6FA8] to-[#28A98C] flex items-center justify-center text-white shadow-sm">
                    <BrainCircuit className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#0D2B45]">AI Clinical Insights</h3>
                <div className="ml-auto">
                    <RiskBadge level={riskLevel} />
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Summary */}
                {summary && (
                    <div>
                        <h4 className="text-sm font-bold text-[#7AA3BE] uppercase tracking-wider mb-2">Summary</h4>
                        <p className="text-[#0D2B45] leading-relaxed">{summary}</p>
                    </div>
                )}

                {/* Risk Meter */}
                {riskLevel && (
                    <div>
                        <h4 className="text-sm font-bold text-[#7AA3BE] uppercase tracking-wider mb-3">Risk Assessment</h4>
                        <div className="risk-meter">
                            <div className={`risk-meter-fill ${riskColor}`} style={{ width: `${riskScore}%` }} />
                        </div>
                        <div className="flex justify-between text-xs font-bold text-[#9BB8CD] uppercase tracking-wider mt-2">
                            <span>Low</span>
                            <span>Moderate</span>
                            <span>High</span>
                        </div>
                    </div>
                )}

                {/* Key Concerns */}
                {keyConcerns && keyConcerns.length > 0 && (
                    <div>
                        <h4 className="text-sm font-bold text-[#7AA3BE] uppercase tracking-wider mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                            Key Concerns
                        </h4>
                        <ul className="space-y-2">
                            {keyConcerns.map((concern, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-[#0D2B45]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mt-2 shrink-0" />
                                    {concern}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Suggested Actions */}
                {suggestedActions && suggestedActions.length > 0 && (
                    <div>
                        <h4 className="text-sm font-bold text-[#7AA3BE] uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-[#28A98C]" />
                            Suggested Actions
                        </h4>
                        <ul className="space-y-2">
                            {suggestedActions.map((action, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-[#0D2B45]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#28A98C] mt-2 shrink-0" />
                                    {action}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

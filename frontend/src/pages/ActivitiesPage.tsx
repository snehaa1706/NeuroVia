import { useState, useEffect } from 'react';
import { Loader2, Trophy, Sparkles, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import type { User, Activity } from '../types';
import { ActivityCard } from '../components/ui/ActivityCard';

interface Props {
    user: User;
}

const ACTIVITY_TYPES = [
    { key: 'memory_recall', label: 'Memory Recall', emoji: '🧠', description: 'Remember and recall information' },
    { key: 'pattern_recognition', label: 'Pattern Recognition', emoji: '🧩', description: 'Identify logical patterns' },
    { key: 'image_recall', label: 'Image Recall', emoji: '📷', description: 'Remember visual details' },
    { key: 'word_association', label: 'Word Association', emoji: '🗣️', description: 'Connect related concepts' },
    { key: 'object_matching', label: 'Object Matching', emoji: '🔍', description: 'Match and categorize objects' }
];

export default function ActivitiesPage({ user }: Props) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [progress, setProgress] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState<string | null>(null);
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    const [activityResponses, setActivityResponses] = useState<Record<string, string>>({});
    const [result, setResult] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [actRes, progRes] = await Promise.all([
                api.getActivities(user.id).catch(() => ({ activities: [] })),
                api.getActivityProgress(user.id).catch(() => ({})),
            ]);
            setActivities(actRes.activities || []);
            setProgress(progRes);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const generateActivity = async (type: string) => {
        setGenerating(type);
        try { await api.generateActivity(user.id, type, 'easy'); loadData(); }
        catch (err: any) { alert(err.message); }
        finally { setGenerating(null); }
    };

    const submitActivity = async () => {
        if (!selectedActivity) return;
        setSubmitting(true);
        try { const res = await api.submitActivityResult(selectedActivity.id, activityResponses); setResult(res); }
        catch (err: any) { alert(err.message); }
        finally { setSubmitting(false); }
    };

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4 text-[#7AA3BE]">
                    <Loader2 className="w-10 h-10 animate-spin text-[#1A6FA8]" />
                    <p className="font-medium animate-pulse">Loading activities...</p>
                </div>
            </div>
        );
    }

    if (selectedActivity) {
        const content = selectedActivity.content;
        return (
            <div className="page-container animate-fadeIn max-w-4xl">
                <div className="mx-auto">
                    {result ? (
                        <div className="text-center animate-fadeIn">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-amber-500/20">
                                <Trophy className="w-12 h-12 text-white" />
                            </div>
                            <h2 className="text-4xl font-bold text-[#0D2B45] mb-4 font-serif">Activity Complete!</h2>
                            <div className="bg-white rounded-3xl p-10 shadow-2xl border border-[#DCE5ED] mt-8 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1A6FA8] to-[#28A98C]" />
                                <div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#1A6FA8] to-[#28A98C] mb-6 font-serif">
                                    {result.score}%
                                </div>
                                <p className="text-[#0D2B45] text-lg leading-relaxed bg-[#F7FBFF] p-6 rounded-2xl border border-[#DCE5ED]/50">
                                    {result.ai_feedback}
                                </p>
                            </div>
                            <button onClick={() => { setSelectedActivity(null); setResult(null); setActivityResponses({}); loadData(); }} className="mt-10 px-8 py-4 rounded-xl bg-[#0D2B45] hover:bg-[#1A6FA8] text-white font-medium shadow-lg hover:shadow-xl transition-all">
                                Return to Dashboard
                            </button>
                        </div>
                    ) : (
                        <div className="animate-fadeIn">
                            <button onClick={() => { setSelectedActivity(null); setActivityResponses({}); }} className="mb-8 flex items-center gap-2 text-[#7AA3BE] hover:text-[#1A6FA8] font-medium transition-colors px-4 py-2 rounded-xl hover:bg-[#F7FBFF] -ml-4">
                                <ArrowLeft className="w-5 h-5" /> Back to exercises
                            </button>
                            <div className="bg-white rounded-3xl p-10 shadow-2xl border border-[#DCE5ED] relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#1A6FA8] to-[#28A98C]" />
                                <div className="flex items-start justify-between mb-2">
                                    <h2 className="text-3xl font-bold text-[#0D2B45] font-serif">{content.title || 'Cognitive Exercise'}</h2>
                                    <span className="px-3 py-1 bg-[#EAF7F4] text-[#28A98C] rounded-full text-xs font-bold uppercase tracking-wider">{selectedActivity.difficulty}</span>
                                </div>
                                <p className="text-[#7AA3BE] text-lg mb-10 pb-8 border-b border-[#DCE5ED]">{content.instructions || 'Follow the instructions and answer the questions below.'}</p>

                                <div className="space-y-8">
                                    {(content.prompts || []).map((prompt: string, i: number) => (
                                        <div key={i} className="group">
                                            <label className="block text-[#0D2B45] font-medium text-lg mb-3 ml-1 group-focus-within:text-[#1A6FA8] transition-colors">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#F7FBFF] text-[#1A6FA8] text-sm font-bold mr-3 border border-[#DCE5ED]/50">{i + 1}</span>
                                                {prompt}
                                            </label>
                                            <input
                                                className="w-full h-14 px-6 bg-[#F7FBFF] border border-[#DCE5ED] rounded-2xl text-[#0D2B45] text-lg focus:bg-white focus:border-[#1A6FA8] focus:ring-4 focus:ring-[#1A6FA8]/10 transition-all outline-none placeholder:text-[#9BB8CD]"
                                                placeholder="Type your response..."
                                                value={activityResponses[`q${i}`] || ''}
                                                onChange={(e) => setActivityResponses({ ...activityResponses, [`q${i}`]: e.target.value })}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-12 pt-8 border-t border-[#DCE5ED]">
                                    <button onClick={submitActivity} disabled={submitting} className="w-full h-16 rounded-2xl bg-gradient-to-r from-[#1A6FA8] to-[#28A98C] text-white text-lg font-bold shadow-lg shadow-[#1A6FA8]/20 hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-70 flex items-center justify-center gap-3">
                                        {submitting ? (
                                            <><Loader2 className="w-6 h-6 animate-spin" /> Evaluating...</>
                                        ) : (
                                            <>Submit Exercise</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const getActivityMeta = (typeKey: string) => {
        return ACTIVITY_TYPES.find(t => t.key === typeKey) || { emoji: '🧠', label: typeKey.replace('_', ' ') };
    }

    return (
        <div className="page-container animate-fadeIn">
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-4xl font-bold text-[#0D2B45] font-serif tracking-tight">Cognitive Library</h2>
                    <p className="text-lg text-[#7AA3BE] mt-2">AI-generated exercises tailored to maintain cognitive health</p>
                </div>
                {progress && (
                    <div className="flex items-center gap-6 bg-white px-6 py-4 rounded-2xl shadow-sm border border-[#DCE5ED]">
                        <div>
                            <p className="text-xs font-bold text-[#7AA3BE] uppercase tracking-wider">Completed</p>
                            <p className="text-2xl font-bold text-[#1A6FA8] font-serif">{progress.completed || 0}</p>
                        </div>
                        <div className="w-px h-10 bg-[#DCE5ED]" />
                        <div>
                            <p className="text-xs font-bold text-[#7AA3BE] uppercase tracking-wider">Avg Score</p>
                            <p className="text-2xl font-bold text-[#28A98C] font-serif">{progress.average_score || 0}%</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Generate Section */}
            <div className="mb-14">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-[#0D2B45] font-serif flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-sm">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        New Exercises
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    {ACTIVITY_TYPES.map((type) => (
                        <div key={type.key} className="bg-white rounded-3xl p-6 shadow-md border border-[#DCE5ED] hover:-translate-y-1 hover:shadow-xl transition-all flex flex-col h-full group">
                            <div className="w-16 h-16 text-4xl bg-[#F7FBFF] rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-5">
                                {type.emoji}
                            </div>
                            <h4 className="text-lg font-bold text-[#0D2B45] mb-2 leading-tight">{type.label}</h4>
                            <p className="text-[#7AA3BE] text-sm flex-grow mb-6 leading-relaxed">{type.description}</p>
                            <button
                                onClick={() => generateActivity(type.key)}
                                disabled={generating !== null}
                                className="w-full py-2.5 rounded-xl bg-[#F7FBFF] text-[#1A6FA8] font-semibold border border-[#DCE5ED] hover:bg-[#1A6FA8] hover:text-white hover:border-[#1A6FA8] transition-all flex items-center justify-center gap-2 group-hover:shadow-md disabled:opacity-50"
                            >
                                {generating === type.key ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> ...</>
                                ) : (
                                    <>Generate</>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Your Activities Library */}
            <div className="mb-10">
                <h3 className="text-2xl font-bold text-[#0D2B45] font-serif mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1A6FA8] flex items-center justify-center shadow-sm text-white">
                        <Trophy className="w-5 h-5" />
                    </div>
                    Your Library
                </h3>

                {activities.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-[#DCE5ED] p-12 text-center shadow-sm hover:border-[#1A6FA8] transition-colors">
                        <div className="w-20 h-20 bg-[#F7FBFF] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-10 h-10 text-[#7AA3BE]" />
                        </div>
                        <h4 className="text-xl font-bold text-[#0D2B45] mb-2 font-serif">No exercises generated yet</h4>
                        <p className="text-[#7AA3BE]">Click on one of the categories above to create an AI-powered activity.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activities.map((act) => {
                            const meta = getActivityMeta(act.activity_type);
                            return (
                                <ActivityCard
                                    key={act.id}
                                    title={act.content?.title || meta.label}
                                    description={act.content?.instructions || `${meta.label} exercise focusing on cognitive stimulation.`}
                                    icon={meta.emoji}
                                    difficulty={act.difficulty}
                                    onStart={() => setSelectedActivity(act)}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

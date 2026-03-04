import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CheckCircle2,
    Loader2,
    Brain,
    ArrowLeft,
    Shield,
    Clock,
    Target,
    ArrowRight,
    Sparkles,
    AlertCircle
} from 'lucide-react';
import { api } from '../lib/api';
import type { User, ScreeningLevel } from '../types';

interface Props {
    user: User;
}

const LEVELS: { key: ScreeningLevel; label: string; description: string; tests: string[]; icon: any; gradient: string; time: string; lightBg: string }[] = [
    { key: 'scd', label: 'Level 1 — SCD', description: 'Subjective Cognitive Decline screening through structured questionnaires and orientation assessment.', tests: ['AD8 Questionnaire', 'Orientation'], icon: Shield, gradient: 'from-violet-600 to-indigo-500', time: '~3 min', lightBg: 'bg-violet-50 hover:border-violet-300' },
    { key: 'mci', label: 'Level 2 — MCI', description: 'Mild Cognitive Impairment evaluation using verbal and executive function tests.', tests: ['Verbal Fluency', 'Trail Making'], icon: Clock, gradient: 'from-amber-500 to-orange-400', time: '~5 min', lightBg: 'bg-amber-50 hover:border-amber-300' },
    { key: 'dementia', label: 'Level 3 — Dementia', description: 'Comprehensive dementia risk assessment with advanced cognitive evaluation tools.', tests: ['Clock Drawing', 'MoCA Tasks'], icon: Target, gradient: 'from-rose-500 to-red-500', time: '~7 min', lightBg: 'bg-rose-50 hover:border-rose-300' },
];

const AD8_QUESTIONS = [
    'Problems with judgment (e.g., poor financial decisions)?',
    'Reduced interest in hobbies/activities?',
    'Repeats questions, stories, or statements?',
    'Trouble learning to use tools/appliances?',
    'Forgets correct month or year?',
    'Difficulty handling financial affairs?',
    'Difficulty remembering appointments?',
    'Consistent problems with thinking and/or memory?',
];

const ORIENTATION_QUESTIONS = [
    { key: 'date', label: "What is today's date?" },
    { key: 'day', label: 'What day of the week is it?' },
    { key: 'month', label: 'What month is it?' },
    { key: 'year', label: 'What year is it?' },
    { key: 'place', label: 'Where are you right now?' },
];

export default function ScreeningPage({ user: _user }: Props) {
    const navigate = useNavigate();
    const [step, setStep] = useState<'select' | 'testing' | 'analyzing' | 'results'>('select');
    const [selectedLevel, setSelectedLevel] = useState<ScreeningLevel | null>(null);
    const [screeningId, setScreeningId] = useState<string | null>(null);
    const [currentTest, setCurrentTest] = useState(0);
    const [ad8Answers, setAd8Answers] = useState<Record<string, boolean>>({});
    const [orientationAnswers, setOrientationAnswers] = useState<Record<string, string>>({});
    const [verbalFluencyWords, setVerbalFluencyWords] = useState('');
    const [trailTime, setTrailTime] = useState(0);
    const [trailErrors, setTrailErrors] = useState(0);
    const [clockScore, setClockScore] = useState(5);
    const [mocaScore, setMocaScore] = useState(15);
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const startScreening = async (level: ScreeningLevel) => {
        setLoading(true);
        try {
            const res = await api.startScreening(level);
            setScreeningId(res.id);
            setSelectedLevel(level);
            setCurrentTest(0);
            setStep('testing');
        } catch (err: any) { alert(err.message); }
        finally { setLoading(false); }
    };

    const submitCurrentTest = async () => {
        if (!screeningId || !selectedLevel) return;
        setLoading(true);
        try {
            let testType = '';
            let responses: Record<string, any> = {};

            if (selectedLevel === 'scd') {
                if (currentTest === 0) { testType = 'ad8'; responses = ad8Answers; }
                else { testType = 'orientation'; responses = orientationAnswers; }
            } else if (selectedLevel === 'mci') {
                if (currentTest === 0) { testType = 'verbal_fluency'; responses = { words: verbalFluencyWords.split(',').map(w => w.trim()).filter(Boolean) }; }
                else { testType = 'trail_making'; responses = { time_seconds: trailTime, errors: trailErrors }; }
            } else {
                if (currentTest === 0) { testType = 'clock_drawing'; responses = { score: clockScore }; }
                else { testType = 'moca'; responses = { total_score: mocaScore }; }
            }

            await api.submitTest(screeningId, testType, responses);

            if (currentTest === 0) {
                setCurrentTest(1);
            } else {
                await api.completeScreening(screeningId);
                setStep('analyzing');
                const analysisRes = await api.analyzeScreening(screeningId);
                setAnalysis(analysisRes);
                setStep('results');
            }
        } catch (err: any) { alert(err.message); }
        finally { setLoading(false); }
    };

    // ─── Level Selection ───
    if (step === 'select') {
        return (
            <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500 min-h-[80vh] flex flex-col justify-center">
                <div className="text-center mb-12 relative animate-in slide-in-from-bottom-5 duration-700">
                    <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 to-teal-400 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-500/30 ring-8 ring-violet-50 relative z-10">
                        <Brain className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4 relative z-10">Cognitive Screening</h2>
                    <p className="text-slate-500 text-lg md:text-xl font-medium max-w-2xl mx-auto relative z-10">
                        Select an assessment level based on the patient's current cognitive symptoms.
                    </p>
                </div>

                <div className="space-y-6">
                    {LEVELS.map((level, i) => {
                        const Icon = level.icon;
                        return (
                            <button
                                key={level.key}
                                onClick={() => startScreening(level.key)}
                                disabled={loading}
                                className={`group w-full p-6 md:p-8 rounded-3xl border-2 border-slate-100 bg-white hover:border-transparent text-left transition-all duration-300 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center gap-6 animate-in slide-in-from-bottom-${4 + i * 2} duration-700`}
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-r ${level.gradient}`} />
                                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity border-2 rounded-3xl border-transparent`} style={{ backgroundImage: `linear-gradient(to right, transparent, transparent), linear-gradient(to right, var(--tw-gradient-from), var(--tw-gradient-to))`, backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }} />

                                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${level.gradient} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                                    <Icon className="w-10 h-10 text-white drop-shadow-md" />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-2xl font-bold text-slate-800">{level.label}</h3>
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full tracking-wide">
                                            <Clock className="w-3.5 h-3.5" /> {level.time}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 text-base md:text-lg mb-4 leading-relaxed font-medium">
                                        {level.description}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {level.tests.map((test) => (
                                            <span key={test} className="bg-slate-50 border border-slate-200 text-slate-600 text-sm font-semibold px-4 py-1.5 rounded-full">
                                                {test}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-slate-900 transition-colors ml-auto md:ml-0 shadow-sm border border-slate-100">
                                    <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ─── Analyzing ───
    if (step === 'analyzing') {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[80vh] animate-in fade-in duration-700">
                <div className="relative">
                    {/* Glowing Orbs */}
                    <div className="absolute inset-0 bg-violet-500/20 blur-[100px] rounded-full animate-pulse" />
                    <div className="absolute inset-0 bg-teal-500/20 blur-[100px] rounded-full animate-pulse delay-75" />

                    <div className="relative w-32 h-32 rounded-[2rem] bg-gradient-to-br from-violet-600 to-teal-500 flex items-center justify-center shadow-2xl shadow-violet-500/40 mb-10 overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        <Brain className="w-16 h-16 text-white relative z-10 animate-bounce" style={{ animationDuration: '2s' }} />
                        <Sparkles className="absolute top-4 right-4 w-6 h-6 text-teal-200 animate-spin" style={{ animationDuration: '4s' }} />
                    </div>
                </div>
                <h3 className="text-3xl font-extrabold text-slate-800 mb-4 tracking-tight">AI Interpreting Results</h3>
                <p className="text-slate-500 text-xl font-medium max-w-sm text-center">
                    Please wait while our algorithms analyze the cognitive markers and patterns...
                </p>
            </div>
        );
    }

    // ─── Results ───
    if (step === 'results' && analysis) {
        const isLow = analysis.risk_level === 'low';
        const isMCI = analysis.risk_level === 'moderate';
        const riskColor = isLow ? 'text-teal-600' : isMCI ? 'text-amber-600' : 'text-rose-600';
        const riskBg = isLow ? 'bg-teal-50' : isMCI ? 'bg-amber-50' : 'bg-rose-50';
        const riskBorder = isLow ? 'border-teal-200' : isMCI ? 'border-amber-200' : 'border-rose-200';
        const progressGradient = isLow ? 'from-teal-400 to-green-500' : isMCI ? 'from-amber-400 to-orange-500' : 'from-rose-500 to-red-600';

        return (
            <div className="p-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-10">
                    <div className="w-24 h-24 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-xl shadow-teal-500/10">
                        <CheckCircle2 className="w-12 h-12 text-teal-500" />
                    </div>
                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Screening Complete</h2>
                    <p className="text-slate-500 mt-3 text-lg font-medium">Here are your personalized results and AI recommendations.</p>
                </div>

                <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-200/60 mb-8 relative overflow-hidden">
                    {/* Decorative Header */}
                    <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${progressGradient}`} />

                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Risk Assessment</h3>
                            <p className="text-sm font-medium text-slate-500">Based on clinical scoring</p>
                        </div>
                        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border ${riskBg} ${riskBorder}`}>
                            <AlertCircle className={`w-5 h-5 ${riskColor}`} />
                            <span className={`font-extrabold tracking-widest uppercase ${riskColor}`}>
                                {analysis.risk_level} Risk
                            </span>
                        </div>
                    </div>

                    <div className="mb-10">
                        <div className="flex justify-between items-end mb-4">
                            <span className="text-slate-500 font-bold tracking-wide uppercase text-sm">Cognitive Risk Score</span>
                            <span className="text-slate-900 font-black text-4xl">{analysis.risk_score}<span className="text-lg text-slate-400 font-medium tracking-normal">/100</span></span>
                        </div>
                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${progressGradient} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${analysis.risk_score}%` }} />
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 mb-8">
                        <h4 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
                            <Brain className="w-5 h-5 text-violet-500" />
                            AI Insight
                        </h4>
                        <p className="text-slate-600 leading-relaxed font-medium text-lg">{analysis.interpretation}</p>
                    </div>

                    {analysis.recommendations?.length > 0 && (
                        <div>
                            <h4 className="text-base font-bold text-slate-800 mb-4 px-2">Next Steps</h4>
                            <ul className="space-y-4">
                                {analysis.recommendations.map((rec: string, i: number) => (
                                    <li key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                                        <div className="mt-0.5 w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="w-4 h-4 text-teal-600" />
                                        </div>
                                        <span className="text-slate-600 font-medium leading-relaxed">{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={() => navigate('/dashboard')} className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all text-lg">
                        Return to Dashboard
                    </button>
                    <button onClick={() => navigate('/consult')} className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all text-lg shadow-lg shadow-slate-900/20">
                        Consult a Specialist
                    </button>
                </div>
            </div>
        );
    }

    // ─── Testing UI ───
    const levelConfig = LEVELS.find(l => l.key === selectedLevel);

    return (
        <div className="p-8 max-w-3xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-6 mb-8">
                <button onClick={() => currentTest > 0 ? setCurrentTest(0) : setStep('select')} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-all shadow-sm" aria-label="Go back">
                    <ArrowLeft className="w-6 h-6 text-slate-600" />
                </button>
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{levelConfig?.label}</h2>
                    <p className="text-slate-500 font-medium mt-1">Test {currentTest + 1} of 2 — <span className="text-violet-600 font-bold">{levelConfig?.tests[currentTest]}</span></p>
                </div>
            </div>

            {/* Pagination / Steps */}
            <div className="flex items-center gap-4 mb-10">
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full bg-violet-600 rounded-full transition-all duration-500" style={{ width: currentTest === 0 ? '50%' : '100%' }} />
                </div>
                <span className="text-sm font-bold text-slate-400">Step {currentTest + 1} / 2</span>
            </div>

            <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-200/60 mb-8">
                {/* SCD */}
                {selectedLevel === 'scd' && currentTest === 0 && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">AD8 Questionnaire</h3>
                        <p className="text-slate-500 font-medium mb-8 text-lg">Select any statements that describe recent changes in the patient.</p>
                        <div className="space-y-4">
                            {AD8_QUESTIONS.map((q, i) => (
                                <label key={i} className={`flex items-start gap-5 p-5 md:p-6 rounded-2xl border-2 cursor-pointer transition-all ${ad8Answers[`q${i}`] ? 'border-violet-500 bg-violet-50/50 shadow-md shadow-violet-500/10' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'}`}>
                                    <input type="checkbox" checked={ad8Answers[`q${i}`] || false} onChange={(e) => setAd8Answers({ ...ad8Answers, [`q${i}`]: e.target.checked })} className="w-6 h-6 mt-0.5 accent-violet-600 rounded bg-white border-2 border-slate-300 transition-all cursor-pointer" />
                                    <span className={`text-lg font-medium leading-snug ${ad8Answers[`q${i}`] ? 'text-violet-900' : 'text-slate-700'}`}>{q}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {selectedLevel === 'scd' && currentTest === 1 && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">Orientation Check</h3>
                        <p className="text-slate-500 font-medium mb-8 text-lg">Record the patient's answers to these simple questions.</p>
                        <div className="space-y-8">
                            {ORIENTATION_QUESTIONS.map((q) => (
                                <div key={q.key}>
                                    <label className="block text-slate-800 font-bold mb-3 text-lg">{q.label}</label>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <input className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-5 py-4 text-lg text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-violet-500 focus:bg-white transition-colors" placeholder="Type exact answer..." value={orientationAnswers[q.key] || ''} onChange={(e) => setOrientationAnswers({ ...orientationAnswers, [q.key]: e.target.value })} />
                                        <button type="button" onClick={() => setOrientationAnswers({ ...orientationAnswers, [q.key]: 'correct' })} className={`px-6 py-4 rounded-xl font-bold text-lg transition-all ${orientationAnswers[q.key] === 'correct' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30' : 'bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                            {orientationAnswers[q.key] === 'correct' ? '✓ Correct' : 'Mark Correct'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* MCI */}
                {selectedLevel === 'mci' && currentTest === 0 && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">Verbal Fluency</h3>
                        <p className="text-slate-500 font-medium mb-8 text-lg">Ask the patient to name as many animals as possible in 60 seconds. Separate words with commas.</p>
                        <textarea className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 min-h-[200px] resize-none text-xl leading-relaxed text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors" placeholder="cat, dog, elephant, tiger..." value={verbalFluencyWords} onChange={(e) => setVerbalFluencyWords(e.target.value)} />
                        <div className="mt-6 flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
                            <span className="text-amber-800 font-bold text-lg">Words Counted</span>
                            <span className="text-3xl font-black text-amber-600">{verbalFluencyWords.split(',').filter(w => w.trim()).length}</span>
                        </div>
                    </div>
                )}

                {selectedLevel === 'mci' && currentTest === 1 && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">Trail Making</h3>
                        <p className="text-slate-500 font-medium mb-8 text-lg">Record the time taken (seconds) and the number of errors made.</p>
                        <div className="grid sm:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-slate-800 font-bold mb-3 text-lg">Time (seconds)</label>
                                <input type="number" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-5 py-4 text-3xl font-black text-center text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors" min="0" value={trailTime} onChange={(e) => setTrailTime(parseInt(e.target.value) || 0)} />
                            </div>
                            <div>
                                <label className="block text-slate-800 font-bold mb-3 text-lg">Errors Mode</label>
                                <input type="number" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-5 py-4 text-3xl font-black text-center text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors" min="0" value={trailErrors} onChange={(e) => setTrailErrors(parseInt(e.target.value) || 0)} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Dementia */}
                {selectedLevel === 'dementia' && currentTest === 0 && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">Clock Drawing</h3>
                        <p className="text-slate-500 font-medium mb-8 text-lg">Rate the patient's clock drawing on a scale of 0 to 10 based on standard clinical metrics.</p>
                        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200">
                            <div className="flex justify-between items-center mb-6">
                                <span className="font-bold text-slate-700 text-lg">Assigned Score</span>
                                <span className="text-5xl font-black text-rose-500">{clockScore}</span>
                            </div>
                            <input type="range" min="0" max="10" className="w-full h-4 rounded-full bg-slate-200 appearance-none accent-rose-500" value={clockScore} onChange={(e) => setClockScore(parseInt(e.target.value))} />
                            <div className="flex justify-between text-base text-slate-500 mt-6 font-bold uppercase tracking-wide">
                                <span>Poor (0)</span>
                                <span>Fair (5)</span>
                                <span>Perfect (10)</span>
                            </div>
                        </div>
                    </div>
                )}

                {selectedLevel === 'dementia' && currentTest === 1 && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <h3 className="text-2xl font-bold text-slate-900 mb-3">MoCA Score Input</h3>
                        <p className="text-slate-500 font-medium mb-8 text-lg">Enter the final computed score from the MoCA-inspired physical tasks.</p>
                        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                            <label className="block text-slate-700 font-bold mb-4 text-xl">Total Score (0–30)</label>
                            <input type="number" className="max-w-[160px] mx-auto bg-white border-2 border-slate-300 rounded-xl py-6 text-6xl font-black text-center text-slate-900 focus:outline-none focus:border-rose-500 transition-colors" min="0" max="30" value={mocaScore} onChange={(e) => setMocaScore(parseInt(e.target.value) || 0)} />

                            <div className="mt-8 grid grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-teal-50 border border-teal-100 text-teal-800">
                                    <div className="font-bold text-xl mb-1">26+</div>
                                    <div className="text-sm font-semibold">Normal</div>
                                </div>
                                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800">
                                    <div className="font-bold text-xl mb-1">18-25</div>
                                    <div className="text-sm font-semibold">Mild Impairment</div>
                                </div>
                                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800">
                                    <div className="font-bold text-xl mb-1">&lt;18</div>
                                    <div className="text-sm font-semibold">Significant</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Foot Navigation */}
                <div className="mt-10 pt-8 border-t border-slate-100 flex justify-end">
                    <button onClick={submitCurrentTest} disabled={loading} className="py-4 px-8 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3">
                        {loading ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" /> Saving...
                            </>
                        ) : currentTest === 0 ? (
                            <>
                                Next Test <ArrowRight className="w-5 h-5" />
                            </>
                        ) : (
                            <>
                                Finalize & Analyze <Sparkles className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

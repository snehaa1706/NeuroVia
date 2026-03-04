import { useState, useEffect } from 'react';
import { Pill, Plus, X, Sun, Sunset, Moon, Sunrise, Loader2, Check } from 'lucide-react';
import { api } from '../lib/api';
import type { User, Medication } from '../types';
import { MedicationItem } from '../components/ui/MedicationItem';
import { StatCard } from '../components/ui/StatCard';

interface Props {
    user: User;
}

export default function MedicationsPage({ user }: Props) {
    const [medications, setMedications] = useState<Medication[]>([]);
    const [adherence, setAdherence] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [logging, setLogging] = useState<string | null>(null);
    const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: '', time_slots: '' });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [medRes, adhRes] = await Promise.all([
                api.getMedications(user.id).catch(() => ({ medications: [] })),
                api.getMedicationAdherence(user.id).catch(() => ({ adherence: [] })),
            ]);
            setMedications(medRes.medications || []);
            setAdherence(adhRes.adherence || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const addMedication = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.addMedication({ patient_id: user.id, name: newMed.name, dosage: newMed.dosage, frequency: newMed.frequency, time_slots: newMed.time_slots.split(',').map(t => t.trim()) });
            setShowAdd(false);
            setNewMed({ name: '', dosage: '', frequency: '', time_slots: '' });
            loadData();
        } catch (err: any) { alert(err.message); }
    };

    const logMedication = async (medId: string, status: string) => {
        setLogging(medId);
        try { await api.logMedication(medId, status); loadData(); }
        catch (err: any) { alert(err.message); }
        finally { setLogging(null); }
    };

    if (loading) {
        return (
            <div className="page-container flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4 text-[#7AA3BE]">
                    <Loader2 className="w-10 h-10 animate-spin text-[#1A6FA8]" />
                    <p className="font-medium animate-pulse">Loading schedule...</p>
                </div>
            </div>
        );
    }

    // Helper to group medications by their first time slot logically
    const groupedMeds: Record<string, Medication[]> = {
        'Morning': [],
        'Afternoon': [],
        'Evening': [],
        'Night': []
    };

    medications.forEach(med => {
        const firstTime = med.time_slots?.[0] || '08:00';
        const hour = parseInt(firstTime.split(':')[0]);
        if (hour >= 6 && hour < 12) groupedMeds['Morning'].push(med);
        else if (hour >= 12 && hour < 17) groupedMeds['Afternoon'].push(med);
        else if (hour >= 17 && hour < 21) groupedMeds['Evening'].push(med);
        else groupedMeds['Night'].push(med);
    });

    const averageAdherence = adherence.length ? Math.round(adherence.reduce((acc, curr) => acc + curr.adherence_rate, 0) / adherence.length) : 0;

    return (
        <div className="page-container animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                <div>
                    <h2 className="text-4xl font-bold text-[#0D2B45] font-serif tracking-tight">Medications</h2>
                    <p className="text-lg text-[#7AA3BE] mt-2">Track and manage your daily medication schedule</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="px-6 py-3 bg-[#1A6FA8] hover:bg-[#124A70] text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 px-x">
                    <Plus className="w-5 h-5" /> Add Medication
                </button>
            </div>

            {/* Adherence Overview */}
            {adherence.length > 0 && (
                <div className="mb-14">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-[#28A98C] flex items-center justify-center shadow-sm">
                            <Pill className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-[#0D2B45] font-serif">Adherence Overview</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            title="Overall Adherence"
                            value={`${averageAdherence}%`}
                            icon={Check}
                            trend={averageAdherence >= 80 ? "On track" : "Needs attention"}
                            trendUp={averageAdherence >= 80}
                            colorClasses={averageAdherence >= 80 ? "bg-[#EAF7F4] border-[#28A98C]" : "bg-[#FEF3C7] border-[#D97706]"}
                            iconClasses={averageAdherence >= 80 ? "bg-[#28A98C] text-white" : "bg-[#D97706] text-white"}
                        />
                        <div className="md:col-span-2 bg-white rounded-3xl p-6 shadow-md border border-[#DCE5ED]">
                            <h4 className="text-sm font-bold text-[#7AA3BE] uppercase tracking-wider mb-4">Medication Breakdown</h4>
                            <div className="space-y-5">
                                {adherence.map((a: any) => (
                                    <div key={a.medication_id}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-semibold text-[#0D2B45]">{a.medication_name}</span>
                                            <span className={`font-bold ${a.adherence_rate >= 80 ? 'text-[#28A98C]' : a.adherence_rate >= 50 ? 'text-[#D97706]' : 'text-[#D32F2F]'}`}>
                                                {a.adherence_rate}%
                                            </span>
                                        </div>
                                        <div className="w-full h-3 bg-[#F7FBFF] rounded-full overflow-hidden border border-[#DCE5ED]">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${a.adherence_rate >= 80 ? 'bg-[#28A98C]' : a.adherence_rate >= 50 ? 'bg-[#D97706]' : 'bg-[#D32F2F]'}`}
                                                style={{ width: `${a.adherence_rate}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Daily Schedule */}
            {medications.length === 0 ? (
                <div className="bg-white rounded-3xl border border-[#DCE5ED] p-16 text-center shadow-lg">
                    <div className="w-24 h-24 bg-[#F7FBFF] rounded-full flex items-center justify-center mx-auto mb-6">
                        <Pill className="w-12 h-12 text-[#9BB8CD]" />
                    </div>
                    <h3 className="text-2xl font-bold text-[#0D2B45] font-serif mb-2">No medications scheduled</h3>
                    <p className="text-[#7AA3BE] text-lg max-w-md mx-auto">Add medications using the button above to start tracking your daily adherence.</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {/* Morning */}
                    {groupedMeds['Morning'].length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-[#0D2B45] flex items-center gap-2 border-b border-[#DCE5ED] pb-3 font-serif">
                                <Sunrise className="w-6 h-6 text-amber-500" /> Morning Schedule
                            </h3>
                            <div className="grid gap-4">
                                {groupedMeds['Morning'].map(med => (
                                    <MedicationItem key={med.id} name={med.name} dosage={med.dosage} frequency={med.frequency} timeSlots={med.time_slots} onLog={(status) => logMedication(med.id, status)} logging={logging === med.id} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Afternoon */}
                    {groupedMeds['Afternoon'].length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-[#0D2B45] flex items-center gap-2 border-b border-[#DCE5ED] pb-3 font-serif">
                                <Sun className="w-6 h-6 text-orange-500" /> Afternoon Schedule
                            </h3>
                            <div className="grid gap-4">
                                {groupedMeds['Afternoon'].map(med => (
                                    <MedicationItem key={med.id} name={med.name} dosage={med.dosage} frequency={med.frequency} timeSlots={med.time_slots} onLog={(status) => logMedication(med.id, status)} logging={logging === med.id} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Evening */}
                    {groupedMeds['Evening'].length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-[#0D2B45] flex items-center gap-2 border-b border-[#DCE5ED] pb-3 font-serif">
                                <Sunset className="w-6 h-6 text-[#1A6FA8]" /> Evening Schedule
                            </h3>
                            <div className="grid gap-4">
                                {groupedMeds['Evening'].map(med => (
                                    <MedicationItem key={med.id} name={med.name} dosage={med.dosage} frequency={med.frequency} timeSlots={med.time_slots} onLog={(status) => logMedication(med.id, status)} logging={logging === med.id} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Night */}
                    {groupedMeds['Night'].length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-[#0D2B45] flex items-center gap-2 border-b border-[#DCE5ED] pb-3 font-serif">
                                <Moon className="w-6 h-6 text-indigo-500" /> Night Schedule
                            </h3>
                            <div className="grid gap-4">
                                {groupedMeds['Night'].map(med => (
                                    <MedicationItem key={med.id} name={med.name} dosage={med.dosage} frequency={med.frequency} timeSlots={med.time_slots} onLog={(status) => logMedication(med.id, status)} logging={logging === med.id} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Add Modal */}
            {showAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#0D2B45]/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn" style={{ animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', animationDuration: '400ms' }}>
                        <div className="px-8 py-6 border-b border-[#DCE5ED] flex items-center justify-between bg-[#F7FBFF]">
                            <h3 className="text-2xl font-bold text-[#0D2B45] font-serif">Add Medication</h3>
                            <button onClick={() => setShowAdd(false)} className="w-10 h-10 rounded-full bg-white border border-[#DCE5ED] flex items-center justify-center text-[#7AA3BE] hover:text-[#0D2B45] hover:border-[#0D2B45] transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={addMedication} className="p-8 space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-[#0D2B45] uppercase tracking-wider mb-2">Medication Name</label>
                                <input className="w-full h-12 px-4 rounded-xl bg-[#F7FBFF] border border-[#DCE5ED] focus:bg-white focus:border-[#1A6FA8] focus:ring-4 focus:ring-[#1A6FA8]/10 transition-all outline-none text-[#0D2B45] placeholder:text-[#9BB8CD]" placeholder="e.g., Donepezil" value={newMed.name} onChange={(e) => setNewMed({ ...newMed, name: e.target.value })} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-[#0D2B45] uppercase tracking-wider mb-2">Dosage</label>
                                    <input className="w-full h-12 px-4 rounded-xl bg-[#F7FBFF] border border-[#DCE5ED] focus:bg-white focus:border-[#1A6FA8] focus:ring-4 focus:ring-[#1A6FA8]/10 transition-all outline-none text-[#0D2B45] placeholder:text-[#9BB8CD]" placeholder="e.g., 5mg" value={newMed.dosage} onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#0D2B45] uppercase tracking-wider mb-2">Frequency</label>
                                    <input className="w-full h-12 px-4 rounded-xl bg-[#F7FBFF] border border-[#DCE5ED] focus:bg-white focus:border-[#1A6FA8] focus:ring-4 focus:ring-[#1A6FA8]/10 transition-all outline-none text-[#0D2B45] placeholder:text-[#9BB8CD]" placeholder="e.g., Twice daily" value={newMed.frequency} onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })} required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#0D2B45] uppercase tracking-wider mb-2">Time Slots <span className="text-[#9BB8CD] font-normal normal-case">(comma separated)</span></label>
                                <input className="w-full h-12 px-4 rounded-xl bg-[#F7FBFF] border border-[#DCE5ED] focus:bg-white focus:border-[#1A6FA8] focus:ring-4 focus:ring-[#1A6FA8]/10 transition-all outline-none text-[#0D2B45] placeholder:text-[#9BB8CD]" placeholder="08:00, 20:00" value={newMed.time_slots} onChange={(e) => setNewMed({ ...newMed, time_slots: e.target.value })} required />
                            </div>
                            <div className="flex gap-4 pt-4 border-t border-[#DCE5ED]">
                                <button type="submit" className="flex-1 py-3.5 bg-[#1A6FA8] hover:bg-[#124A70] text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all text-center">Add Medication</button>
                                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3.5 bg-white border border-[#DCE5ED] text-[#0D2B45] hover:border-[#0D2B45] rounded-xl font-bold transition-all text-center">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

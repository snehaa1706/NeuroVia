import { useState, useEffect } from 'react';
import { Users, Search, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import CaregiverPatientCard from '../components/caregiver/CaregiverPatientCard';
import type { User } from '../types';

interface Props {
    user: User;
}

export default function CaregiverPatientsPage({ user: _user }: Props) {
    const [patients, setPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const res = await api.getAssignedPatients();
                setPatients(res.patients || []);
            } catch (err: any) {
                setError('Failed to load patients list. Please check your connection and try again.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchPatients();
    }, []);

    const filteredPatients = patients.filter(p =>
        p.full_name?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-4 text-[#7AA3BE]">
                    <Loader2 className="w-10 h-10 animate-spin text-[#1A6FA8]" />
                    <p className="font-bold tracking-widest uppercase text-sm animate-pulse">Loading patients...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-[52px] h-[52px] rounded-lg bg-gradient-to-br from-[#1A6FA8] to-[#0D9488] flex items-center justify-center shadow-[0_4px_16px_rgba(26,111,168,0.3)] shrink-0">
                        <Users className="w-[26px] h-[26px] text-white" />
                    </div>
                    <div>
                        <h1 className="text-[28px] font-extrabold text-[#0D2B45] tracking-tight leading-tight">My Patients</h1>
                        <p className="text-[#7AA3BE] text-[15px] mt-0.5">Monitor and manage all your assigned patients</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-5 mb-8 rounded-lg shadow-sm">
                    <p className="font-bold text-red-700">Connection Error</p>
                    <p className="text-red-600 mt-1">{error}</p>
                </div>
            )}

            {/* Search Bar */}
            <div className="relative mb-8 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-[#9BB8CD]" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-12 pr-4 py-3.5 border-2 border-[#DCE5ED] rounded-xl focus:ring-4 focus:ring-[#1A6FA8]/10 focus:border-[#1A6FA8] outline-none transition-all shadow-[0_1px_4px_rgba(0,0,0,0.02)] text-[#0D2B45] font-semibold placeholder:text-[#9BB8CD] bg-white"
                    placeholder="Search patients by name..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Patient Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPatients.map((patient: any) => (
                    <CaregiverPatientCard key={patient.id} patient={patient} />
                ))}
                {filteredPatients.length === 0 && !loading && (
                    <div className="col-span-full py-16 text-center bg-white border border-[#F3F4F6] shadow-[0_1px_8px_rgba(0,0,0,0.04)] rounded-xl">
                        <div className="w-16 h-16 rounded-2xl bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] mx-auto mb-4">
                            <Users className="w-7 h-7" />
                        </div>
                        <p className="text-[17px] font-bold text-[#0D2B45] mb-1">No patients found</p>
                        {search ? (
                            <p className="text-[#9CA3AF] font-medium text-[14px]">Try adjusting your search query.</p>
                        ) : (
                            <p className="text-[#9CA3AF] font-medium text-[14px]">You don't have any patients assigned yet.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

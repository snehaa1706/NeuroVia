import { useState, useEffect } from 'react';
import { Users, Search } from 'lucide-react';
import { apiClient } from '../api/apiClient';
import PatientCard from '../components/PatientCard';

export default function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await apiClient.get('/caregiver/patients');
        setPatients(res.data || []);
      } catch (err: any) {
        setError('Failed to load patients list.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(p => 
    p.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3"><Users className="text-[#1A6FA8]" size={36} /> My Patients</h1>
          <p className="mt-2 pl-12 text-gray-500">Monitor and manage all your assigned patients</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 text-red-700">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-8 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1A6FA8] focus:border-[#1A6FA8] outline-none transition-shadow shadow-sm"
          placeholder="Search patients by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Patient Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map((patient: any) => (
          <PatientCard key={patient.id} patient={patient} />
        ))}
        {filteredPatients.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white border border-gray-200 shadow-sm rounded-xl">
            <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-lg font-medium text-gray-800">No patients found</p>
            {search ? <p className="mt-1">Try adjusting your search query.</p> : <p className="mt-1">You don't have any patients assigned yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

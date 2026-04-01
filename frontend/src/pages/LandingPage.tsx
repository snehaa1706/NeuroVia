import { useNavigate } from 'react-router-dom';
import { Brain, Heart, Activity } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl text-center">
        <div className="flex justify-center mb-8">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
            <Brain className="w-16 h-16 text-white" />
          </div>
        </div>
        
        <h1 className="text-5xl font-extrabold text-slate-800 mb-6 tracking-tight">
          Welcome to NeuroVia
        </h1>
        <p className="text-xl text-slate-600 mb-16 max-w-2xl mx-auto">
          Choose your portal below to access the cognitive care platform.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Screening Card */}
          <button 
            onClick={() => navigate('/screening')}
            className="flex flex-col items-center p-8 bg-white rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-left group"
          >
            <div className="bg-purple-100 p-4 rounded-full mb-6 group-hover:bg-purple-600 transition-colors">
              <Activity className="w-10 h-10 text-purple-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Start Screening</h2>
            <p className="text-slate-500 text-center">Take or administer a cognitive assessment without needing an account.</p>
          </button>

          {/* Caregiver Card */}
          <button 
            onClick={() => navigate('/caregiver')}
            className="flex flex-col items-center p-8 bg-white rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-left group"
          >
            <div className="bg-blue-100 p-4 rounded-full mb-6 group-hover:bg-blue-600 transition-colors">
              <Heart className="w-10 h-10 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Caregiver Platform</h2>
            <p className="text-slate-500 text-center">Log in to manage patients, medications, and review critical insights.</p>
          </button>

          {/* Doctor Card */}
          <button 
            onClick={() => navigate('/doctor')}
            className="flex flex-col items-center p-8 bg-white rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-left group"
          >
            <div className="bg-teal-100 p-4 rounded-full mb-6 group-hover:bg-teal-600 transition-colors">
              <Brain className="w-10 h-10 text-teal-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Doctor Consultation</h2>
            <p className="text-slate-500 text-center">Access patient screening results, analytics, and clinical workflows.</p>
          </button>
        </div>
      </div>
    </div>
  );
}

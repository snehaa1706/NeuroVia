import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Bell, Activity } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  const links = [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/patients', label: 'Patients', icon: Users },
    { to: '/alerts', label: 'Alerts', icon: Bell },
  ];

  return (
    <nav className="bg-[#1A6FA8] text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-2">
            <Activity className="h-8 w-8 text-[#5FA5D9]" />
            <span className="font-bold text-xl tracking-tight">NeuroVia <span className="text-sm font-normal text-[#BAD4E8]">Caregiver Testing</span></span>
          </div>
          
          <div className="flex items-center space-x-4">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to));
              
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-medium transition-colors ${
                    isActive 
                      ? 'bg-[#124A70] text-white' 
                      : 'text-[#BAD4E8] hover:bg-[#5FA5D9]/20 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

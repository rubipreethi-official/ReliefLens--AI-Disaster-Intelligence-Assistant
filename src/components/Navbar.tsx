import React from 'react';
import { Shield, Globe, Mic } from 'lucide-react';
import { StatusBadge, type ConnectionStatus } from './StatusBadge';
import { useIncidentStore } from '@/store/incidentStore';
import { t } from '@/utils/i18n';

interface NavbarProps {
  onOpenAria: () => void;
  status?: ConnectionStatus;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAria, status = 'ONLINE' }) => {
  const { currentLanguage, availableLanguages, setLanguage } = useIncidentStore();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-surface border-b border-white/10 px-8 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00D4FF] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.4)]">
              <Shield className="w-6 h-6 text-black" />
            </div>
            <span className="text-xl font-black tracking-[0.2em] text-white font-['Orbitron']">RELIEFLENS</span>
          </div>

          <div className="hidden lg:flex items-center gap-6">
            <button onClick={() => document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' })} className="text-[10px] font-black tracking-[0.3em] text-[#8BA3C7] hover:text-[#00D4FF] transition-colors uppercase">{t('nav.report', currentLanguage)}</button>
            <button onClick={() => document.getElementById('recent-disasters')?.scrollIntoView({ behavior: 'smooth' })} className="text-[10px] font-black tracking-[0.3em] text-[#8BA3C7] hover:text-[#00D4FF] transition-colors uppercase">{t('nav.disasters', currentLanguage)}</button>
            <button onClick={() => document.getElementById('commander')?.scrollIntoView({ behavior: 'smooth' })} className="text-[10px] font-black tracking-[0.3em] text-[#8BA3C7] hover:text-[#00D4FF] transition-colors uppercase">{t('nav.commander', currentLanguage)}</button>
            <button onClick={onOpenAria} className="text-[10px] font-black tracking-[0.3em] text-[#00D4FF] hover:text-white transition-colors uppercase flex items-center gap-1.5">
              <Mic className="w-3 h-3 animate-pulse" />
              {t('nav.aria', currentLanguage)}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Language Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
            <Globe className="w-3.5 h-3.5 text-[#00D4FF]" />
            <select 
              value={currentLanguage}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-[10px] font-black text-white uppercase focus:outline-none cursor-pointer"
            >
              {availableLanguages.map(lang => (
                <option key={lang} value={lang} className="bg-[#0D1117] text-white">{lang}</option>
              ))}
            </select>
          </div>

          <StatusBadge status={status} />
        </div>

      </div>
    </nav>
  );
};

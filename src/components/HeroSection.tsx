import React from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { useIncidentStore } from '@/store/incidentStore';
import { t } from '@/utils/i18n';

interface HeroSectionProps {
  onReportClick: () => void;
  onCommanderClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onReportClick, onCommanderClick }) => {
  const { currentLanguage } = useIncidentStore();

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 pt-16 overflow-hidden bg-dot-grid bg-black" id="hero">
      
      {/* Dynamic Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#00D4FF]/10 rounded-full blur-[160px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#6366F1]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl w-full text-center">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          
          <div className="flex items-center justify-center gap-4 mb-6 opacity-60">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#00D4FF]" />
            <Target className="w-5 h-5 text-[#00D4FF]" />
            <span className="text-[10px] font-black tracking-[0.5em] text-[#00D4FF] uppercase">Operation Relief Unit</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#00D4FF]" />
          </div>

          <h1 
            className="text-[clamp(1.5rem,7vw,4rem)] font-black tracking-normal sm:tracking-[0.18em] md:tracking-[0.22em] mb-6 sm:mb-8 text-white relative inline-block font-['Orbitron'] leading-tight px-2 break-words max-w-full"
            style={{ textShadow: '0 0 50px rgba(0,212,255,0.4), 0 0 100px rgba(0,212,255,0.1)' }}
          >
            {t('hero.title', currentLanguage)}
            <span className="hidden sm:inline absolute -bottom-2 right-0 text-[10px] tracking-normal font-mono opacity-40">V4.3.0</span>
          </h1>

          <p className="text-sm sm:text-lg md:text-xl font-bold tracking-[0.06em] sm:tracking-[0.1em] text-[#8BA3C7] mb-10 sm:mb-12 max-w-2xl mx-auto uppercase px-2">
            {t('hero.subtitle', currentLanguage)}
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center max-w-lg mx-auto">
            <button
              onClick={onReportClick}
              className="flex-1 py-5 px-10 rounded-2xl bg-[#00D4FF] text-black font-black tracking-[0.2em] text-xs hover:bg-[#33DDFF] transition-all shadow-[0_0_40px_rgba(0,212,255,0.3)] hover:scale-105 active:scale-95 uppercase"
            >
              {t('hero.report', currentLanguage)}
            </button>
            <button
              onClick={onCommanderClick}
              className="flex-1 py-5 px-10 rounded-2xl bg-transparent border-2 border-[#00D4FF]/40 text-[#00D4FF] font-black tracking-[0.2em] text-xs hover:border-[#00D4FF] hover:bg-[#00D4FF]/5 transition-all uppercase"
            >
              {t('hero.commander', currentLanguage)}
            </button>
          </div>

        </motion.div>
      </div>
    </section>
  );
};

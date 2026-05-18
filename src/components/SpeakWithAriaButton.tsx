import React from 'react';
import { Radio } from 'lucide-react';

interface SpeakWithAriaButtonProps {
  onClick: () => void;
  label?: string;
}

export const SpeakWithAriaButton: React.FC<SpeakWithAriaButtonProps> = ({ onClick, label }) => {
  return (
    <div className="w-full relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-[#00D4FF]/20 via-[#6366F1]/20 to-[#00D4FF]/20 rounded-2xl blur-lg opacity-40 group-hover:opacity-100 transition-opacity animate-pulse" />
      <button
        onClick={onClick}
        className="relative w-full py-4 px-8 rounded-2xl bg-[#0D1117] border-2 border-[#00D4FF]/30 text-[#00D4FF] font-black tracking-[0.3em] text-xs uppercase flex items-center justify-center gap-4 hover:bg-[#00D4FF]/5 hover:border-[#00D4FF] transition-all"
      >
        <Radio className="w-5 h-5 animate-pulse" />
        <span>{label || 'Establish Aria Link'}</span>
      </button>
    </div>
  );
};

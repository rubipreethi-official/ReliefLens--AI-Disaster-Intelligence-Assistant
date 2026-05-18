import React from 'react';
import { Loader2, Target } from 'lucide-react';

interface AnalyzeButtonProps {
  onClick: () => void;
  disabled: boolean;
  isAnalyzing: boolean;
  label?: string;
}

export const AnalyzeButton: React.FC<AnalyzeButtonProps> = ({ onClick, disabled, isAnalyzing, label }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isAnalyzing}
      className={`w-full relative group overflow-hidden py-5 px-8 rounded-2xl font-black tracking-[0.3em] text-xs transition-all duration-300 uppercase ${disabled ? 'bg-[#161B22] text-[#4A5568] border border-white/5' : isAnalyzing ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 cursor-wait' : 'bg-gradient-to-r from-amber-500 to-orange-600 text-black shadow-[0_0_40px_rgba(245,158,11,0.2)] hover:shadow-[0_0_60px_rgba(245,158,11,0.4)] hover:scale-[1.02] active:scale-95'}`}
    >
      <div className="relative z-10 flex items-center justify-center gap-3">
        {isAnalyzing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Analyzing Tactical Data...</span>
          </>
        ) : (
          <>
            <Target className="w-5 h-5 fill-current" />
            <span>{label || 'Inference Run'}</span>
          </>
        )}
      </div>
      <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
    </button>
  );
};

import React from 'react';

interface TextInputPanelProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const TextInputPanel: React.FC<TextInputPanelProps> = ({
  value,
  onChange,
  placeholder = "Paste WhatsApp message or describe the incident..."
}) => {
  return (
    <div className="w-full flex flex-col gap-2" id="text-input-panel">
      
      {/* Elegant divider */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-xs text-[#8BA3C7]/50 font-medium">or</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-[#8BA3C7] uppercase">
          ✍️ Text Description
        </span>
        
        <span className="text-[11px] text-[#8BA3C7]/50 font-medium">
          {value.length} chars
        </span>
      </div>

      {/* Input Frame */}
      <div className="w-full rounded-xl bg-[#0D1117] border border-white/[0.06] focus-within:border-[#00D4FF]/30 transition-all duration-300 overflow-hidden">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full bg-transparent p-4 text-sm text-[#E8F4FD] placeholder-[#8BA3C7]/30 focus:outline-none resize-none caret-[#00D4FF] leading-relaxed"
          spellCheck="false"
          id="text-input-textarea"
        />
      </div>

    </div>
  );
};

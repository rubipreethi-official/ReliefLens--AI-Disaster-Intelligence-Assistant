import React, { useState } from 'react';
import { MapPin, Navigation, Edit3, Check, X } from 'lucide-react';

interface LocationConfirmModalProps {
  detectedAddress: string;
  detectedLat: number;
  detectedLng: number;
  onConfirm: () => void;
  onUseManual: (locationText: string) => void;
  onDismiss: () => void;
}

/**
 * Modal shown on app load when GPS is detected.
 * Asks the user whether the detected location is the incident location
 * or if they want to enter a different one.
 */
export const LocationConfirmModal: React.FC<LocationConfirmModalProps> = ({
  detectedAddress,
  detectedLat,
  detectedLng,
  onConfirm,
  onUseManual,
  onDismiss,
}) => {
  const [showManual, setShowManual] = useState(false);
  const [manualText, setManualText] = useState('');

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-[#0D1117] border border-[#00D4FF]/20 rounded-[2rem] p-6 shadow-[0_0_80px_rgba(0,212,255,0.12)] flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center shrink-0">
            <Navigation className="w-6 h-6 text-[#00D4FF]" />
          </div>
          <div>
            <h3 className="font-black text-white tracking-widest uppercase text-sm">Location Detected</h3>
            <p className="text-xs text-[#8BA3C7] mt-1 leading-relaxed">
              Is this the location of the emergency you are reporting?
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="ml-auto p-2 rounded-xl bg-white/5 text-[#8BA3C7] hover:text-white hover:bg-white/10 transition-all border border-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Detected Location Display */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#161B22] border border-white/5">
          <MapPin className="w-4 h-4 text-[#00D4FF] shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[10px] font-black text-[#8BA3C7] uppercase tracking-widest">Your Device Location</span>
            <span className="text-sm text-white font-medium leading-relaxed break-words">{detectedAddress}</span>
            <span className="text-[10px] text-[#8BA3C7]/60 font-mono mt-1">
              {detectedLat.toFixed(5)}, {detectedLng.toFixed(5)}
            </span>
          </div>
        </div>

        {/* Manual input (toggled) */}
        {showManual && (
          <div className="flex flex-col gap-2 animate-fade-in">
            <label className="text-[10px] font-black text-[#8BA3C7] uppercase tracking-widest">
              Enter the actual incident location
            </label>
            <input
              autoFocus
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="e.g. Thirumangalam, Madurai District"
              className="w-full bg-[#050810] border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder:text-[#8BA3C7]/40 focus:outline-none focus:border-[#00D4FF]/40 transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualText.trim()) onUseManual(manualText.trim());
              }}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!showManual ? (
            <>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 rounded-2xl bg-[#00D4FF] text-[#050810] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition-all"
                id="location-confirm-yes"
              >
                <Check className="w-4 h-4" />
                Yes, this is correct
              </button>
              <button
                onClick={() => setShowManual(true)}
                className="flex-1 py-3 rounded-2xl bg-white/5 text-[#8BA3C7] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
                id="location-confirm-different"
              >
                <Edit3 className="w-4 h-4" />
                Different location
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => manualText.trim() && onUseManual(manualText.trim())}
                disabled={!manualText.trim()}
                className="flex-1 py-3 rounded-2xl bg-[#00D4FF] text-[#050810] font-black text-xs tracking-widest uppercase flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                id="location-manual-submit"
              >
                <Check className="w-4 h-4" />
                Use this location
              </button>
              <button
                onClick={() => setShowManual(false)}
                className="py-3 px-5 rounded-2xl bg-white/5 text-[#8BA3C7] font-black text-xs tracking-widest uppercase border border-white/10 hover:bg-white/10 hover:text-white transition-all"
              >
                Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

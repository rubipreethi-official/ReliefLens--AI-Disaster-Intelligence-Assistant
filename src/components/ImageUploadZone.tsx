import React, { useState } from 'react';
import { Camera, X, Scan } from 'lucide-react';

interface ImageUploadZoneProps {
  onImageSelected: (base64: string) => void;
  previewUrl: string | null;
  onClearImage: () => void;
  isAnalyzing?: boolean;
}

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({ onImageSelected, previewUrl, onClearImage, isAnalyzing }) => {
  const [isScanning, setIsScanning] = useState(false);

  const handleFile = (file: File) => {
    setIsScanning(true);
    const reader = new FileReader();
    reader.onload = (e) => { onImageSelected(e.target?.result as string); setTimeout(() => setIsScanning(false), 2000); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full group">
      <div className="flex items-center gap-2 mb-3">
        <Scan className="w-4 h-4 text-[#00D4FF]" />
        <span className="text-[10px] font-black tracking-[0.3em] text-[#8BA3C7] uppercase">Visual Intake Sensor</span>
      </div>
      
      <div className={`relative w-full min-h-[350px] rounded-3xl border-2 border-dashed transition-all duration-500 overflow-hidden flex flex-col items-center justify-center ${previewUrl ? 'border-[#00D4FF]/20 bg-[#050810]' : 'border-white/10 bg-[#0D1117] hover:border-[#00D4FF]/40 hover:bg-[#0D1117]'}`}>
        
        {previewUrl ? (
          <>
            <img src={previewUrl} className="absolute inset-0 w-full h-full object-cover opacity-80" alt="Incident" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050810] via-transparent to-transparent" />
            {(isScanning || isAnalyzing) && (
              <div className="absolute inset-0 z-20">
                <div className="w-full h-1 bg-[#00D4FF] shadow-[0_0_20px_#00D4FF] animate-[sweep_2s_ease-in-out_infinite]" />
              </div>
            )}
            <button onClick={onClearImage} className="absolute top-4 right-4 p-2 bg-black/60 rounded-xl border border-white/10 text-white hover:bg-red-500/20 transition-all"><X className="w-5 h-5" /></button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-6 p-8">
            <div className="w-20 h-20 rounded-3xl bg-[#161B22] border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:border-[#00D4FF]/40 transition-all">
              <Camera className="w-10 h-10 text-[#00D4FF]" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold tracking-widest uppercase mb-2">Drop Visual Data</p>
              <p className="text-[10px] text-[#8BA3C7] uppercase tracking-widest">Targeting: Automatic</p>
            </div>
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
        )}
      </div>
    </div>
  );
};

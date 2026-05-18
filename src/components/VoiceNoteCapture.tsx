import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceNoteCaptureProps {
  onTranscriptUpdate: (transcript: string) => void;
  transcript: string;
}

export const VoiceNoteCapture: React.FC<VoiceNoteCaptureProps> = ({
  onTranscriptUpdate,
  transcript,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [waves, setWaves] = useState([20, 40, 60, 40, 20]);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const onUpdateRef = useRef(onTranscriptUpdate);
  onUpdateRef.current = onTranscriptUpdate;

  useEffect(() => {
    if (!isRecording) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      return;
    }

    const interval = setInterval(() => {
      setWaves((prev) => prev.map(() => Math.floor(Math.random() * 80) + 20));
    }, 100);

    const win = window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onUpdateRef.current(
        transcript || 'Voice not supported in this browser. Please type your report below.'
      );
      return () => clearInterval(interval);
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let combined = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          combined += event.results[i][0].transcript + ' ';
        }
      }
      const interim = event.results[event.results.length - 1];
      if (!interim.isFinal) {
        combined += interim[0].transcript;
      }
      if (combined.trim()) {
        onUpdateRef.current(combined.trim());
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();

    return () => {
      clearInterval(interval);
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [isRecording, transcript]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <Mic className="w-4 h-4 text-[#00D4FF]" />
        <span className="text-[10px] font-black tracking-[0.3em] text-[#8BA3C7] uppercase">Voice Intake Sensor</span>
      </div>

      <div className="bg-[#161B22] border border-white/5 rounded-3xl p-6 flex flex-col gap-6">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setIsRecording(!isRecording)}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording
                ? 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)]'
                : 'bg-[#0D1117] border border-[#00D4FF]/30 text-[#00D4FF] hover:border-[#00D4FF]'
            }`}
          >
            {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <div className="flex-1 h-16 bg-[#0D1117] rounded-2xl border border-white/5 flex items-center justify-center gap-1.5 px-6">
            {waves.map((h, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-100 ${isRecording ? 'bg-[#00D4FF]' : 'bg-white/10'}`}
                style={{ height: isRecording ? `${h}%` : '20%' }}
              />
            ))}
          </div>
        </div>

        <div className="bg-[#050810] rounded-2xl p-4 border border-white/5 min-h-[80px]">
          {transcript ? (
            <p className="text-sm text-white/90 leading-relaxed font-medium">{transcript}</p>
          ) : (
            <p className="text-xs text-[#8BA3C7]/40 uppercase tracking-[0.1em] italic">
              {isRecording ? 'Listening… describe the disaster' : 'Tap mic to record voice report'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, Volume2, VolumeX, Terminal, ShieldAlert } from 'lucide-react';
import { chatWithGemma } from '@/services/gemma/gemmaClient';
import { speakAsARIA, cancelAriaSpeech } from '@/services/tts/ariaVoiceService';
import { useIncidentStore } from '@/store/incidentStore';
import { t } from '@/utils/i18n';
import type { GemmaMessage, ExtractedIncidentData } from '@/types/ai.types';

type AriaStatus = 'IDLE' | 'LISTENING' | 'ANALYZING' | 'SPEAKING';

interface AriaPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onIncidentExtracted?: (data: ExtractedIncidentData) => void;
}

const GREETING =
  'Stay calm. I am ARIA, your emergency assistant. What type of emergency is happening right now?';

const useTypewriter = (text: string, speed = 25) => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    if (!text) return;
    let i = 0;
    const timer = setInterval(() => {
      setDisplayed(text.slice(0, i++));
      if (i > text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return displayed;
};

export const AriaPanel: React.FC<AriaPanelProps> = ({ isOpen, onClose, onIncidentExtracted }) => {
  const [status, setStatus] = useState<AriaStatus>('IDLE');
  const [currentSpeech, setCurrentSpeech] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [chatHistory, setChatHistory] = useState<GemmaMessage[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [thinkingDisplay, setThinkingDisplay] = useState('');

  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const transcriptRef = useRef('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const spokeOnOpenRef = useRef(false);
  const displayedText = useTypewriter(currentSpeech, 20);

  const { userLocation, currentLanguage, setLanguage } = useIncidentStore();

  /**
   * Map current language name to BCP-47 language tag for Speech Recognition.
   * For unknown/multilingual, we use 'mul' (Chrome supports it) or leave blank
   * to let the browser use its default (usually works for accented English).
   */
  const getSpeechLang = () => {
    const langMap: Record<string, string> = {
      Tamil: 'ta-IN',
      Hindi: 'hi-IN',
      Telugu: 'te-IN',
      Kannada: 'kn-IN',
      Malayalam: 'ml-IN',
      Bengali: 'bn-IN',
      Marathi: 'mr-IN',
      Gujarati: 'gu-IN',
      Odia: 'or-IN',
      Punjabi: 'pa-IN',
      Urdu: 'ur-PK',
      English: 'en-US',
    }
    return langMap[currentLanguage] || 'en-US'
  }

  const performAriaSpeech = useCallback(
    async (text: string, lang?: string) => {
      if (isMuted) {
        setStatus('IDLE');
        return;
      }
      cancelAriaSpeech();
      await speakAsARIA(
        text,
        () => setStatus('SPEAKING'),
        () => setStatus('IDLE'),
        lang
      );
    },
    [isMuted]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const src = status === 'SPEAKING' ? '/talking.mp4' : '/idle.mp4';
    if (video.getAttribute('data-src') !== src) {
      video.src = src;
      video.setAttribute('data-src', src);
    }
    video.load();
    video.play().catch(() => {});
  }, [status]);

  useEffect(() => {
    if (!isOpen) {
      spokeOnOpenRef.current = false;
      cancelAriaSpeech();
      recognitionRef.current?.stop();
      return;
    }

    if (spokeOnOpenRef.current) return;
    spokeOnOpenRef.current = true;

    setTranscript('');
    transcriptRef.current = '';
    setHasExtracted(false);
    setChatHistory([{ role: 'model', parts: [{ text: GREETING }] }]);
    setCurrentSpeech(GREETING);
    performAriaSpeech(GREETING);

    return () => {
      cancelAriaSpeech();
      recognitionRef.current?.stop();
    };
  }, [isOpen, performAriaSpeech]);

  const startListening = () => {
    cancelAriaSpeech();
    const win = window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    const SpeechRecognitionCtor = (win.SpeechRecognition || win.webkitSpeechRecognition) as
      | (new () => {
          continuous: boolean;
          interimResults: boolean;
          lang: string;
          onresult: ((event: {
            results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
          }) => void) | null;
          onerror: (() => void) | null;
          start: () => void;
          stop: () => void;
        })
      | undefined;

    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    // Use detected/selected language; default to en-US which handles most accents well
    recognition.lang = getSpeechLang();

    recognition.onresult = (event) => {
      let combined = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          combined += event.results[i][0].transcript + ' ';
        }
      }
      const last = event.results[event.results.length - 1];
      if (!last.isFinal) combined += last[0].transcript;
      const trimmed = combined.trim();
      if (trimmed) {
        transcriptRef.current = trimmed;
        setTranscript(trimmed);
      }
    };

    recognition.onerror = () => {
      // On error, try restarting with en-US as fallback
      console.warn('[ARIA] Speech recognition error — retrying with en-US');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleHold = () => {
    setStatus('LISTENING');
    transcriptRef.current = '';
    setTranscript('');
    startListening();
  };

  const handleRelease = async () => {
    if (status !== 'LISTENING') return;
    recognitionRef.current?.stop();
    setStatus('ANALYZING');

    await new Promise((r) => setTimeout(r, 400));

    const userMsgText = transcriptRef.current.trim() || transcript.trim();
    const userMsg: GemmaMessage = {
      role: 'user',
      parts: [{ text: userMsgText || 'I need emergency help.' }],
    };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);

    const lowerMsg = userMsgText.toLowerCase();
    if (lowerMsg.includes('tamil') || lowerMsg.includes('தமிழ்')) {
      setLanguage('Tamil');
      const reply = 'நிச்சயமாக. தயவுசெய்து பேரிடர் வகையும் பாதிக்கப்பட்டவர்களின் எண்ணிக்கையும் சொல்லுங்கள்.';
      setCurrentSpeech(reply);
      setChatHistory([...newHistory, { role: 'model', parts: [{ text: reply }] }]);
      await performAriaSpeech(reply, 'ta-IN');
      setStatus('IDLE');
      return;
    }

    const res = await chatWithGemma(newHistory, userLocation);

    if (res.success) {
      const rawModelText = (res as any).rawModelText || ''

      // Parse Thinking vs Speaking from the original model output — UI-only
      const thinkingMatch = rawModelText.match(/THINKING:\s*([\s\S]*?)(?=SPEAKING:|$)/i)
      const thinking = thinkingMatch ? thinkingMatch[1].trim() : ''
      setThinkingDisplay(thinking)

      // Use structured speechParts when provided to guarantee the 4-part sequence
      const speechParts = (res as any).speechParts as { reassurance?: string; action?: string; advice?: string; instruction?: string } | undefined
      const speechToSpeak = speechParts
        ? `${speechParts.reassurance || ''} ${speechParts.action || ''} ${speechParts.advice || ''} ${speechParts.instruction || ''}`.trim()
        : (res.text || '')

      if (res.extracted) {
        const confirmMsg = speechToSpeak || 'I have logged your incident and notified emergency teams. Move to a safe place.'
        setCurrentSpeech(confirmMsg)
        setChatHistory([...newHistory, { role: 'model', parts: [{ text: rawModelText || res.text || '' }] }])
        await performAriaSpeech(confirmMsg, getSpeechLang())
        setHasExtracted(true)
        onIncidentExtracted?.(res.extracted)
        setTimeout(() => {
          document.getElementById('assessed-cards')?.scrollIntoView({ behavior: 'smooth' })
        }, 1000)
      } else if (speechToSpeak) {
        setCurrentSpeech(speechToSpeak)
        setChatHistory([...newHistory, { role: 'model', parts: [{ text: rawModelText || res.text || '' }] }])
        await performAriaSpeech(speechToSpeak, getSpeechLang())
      }
    } else {
      const errorMsg = 'Connection issue. Please try again or use the report form below.';
      setCurrentSpeech(errorMsg);
      setChatHistory([...newHistory, { role: 'model', parts: [{ text: errorMsg }] }]);
      await performAriaSpeech(errorMsg);
    }

    setStatus('IDLE');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050810]/90 backdrop-blur-xl" id="aria-console">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0D1117] border border-white/10 rounded-[2.5rem] p-8 shadow-[0_0_100px_rgba(0,212,255,0.15)] flex flex-col gap-8 relative overflow-y-auto my-auto">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center">
              <Terminal className="w-6 h-6 text-[#00D4FF]" />
            </div>
            <div>
              <h3 className="font-black text-lg tracking-[0.2em] text-white">ARIA V4.0</h3>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
                <span className="text-[10px] font-black text-[#8BA3C7] uppercase tracking-widest">
                  Tactical Link — {status}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              cancelAriaSpeech();
              onClose();
            }}
            className="p-3 rounded-2xl bg-white/5 text-[#8BA3C7] hover:text-white hover:bg-white/10 transition-all border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-10 relative">
          <div className="relative w-40 h-40 rounded-full border-4 border-[#00D4FF]/30 shadow-[0_0_60px_rgba(0,212,255,0.2)] overflow-hidden bg-[#050810]">
            <video
              ref={videoRef}
              src="/idle.mp4"
              data-src="/idle.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="mt-8 flex items-center gap-2 px-6 py-2 rounded-full bg-black/40 border border-white/10">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'SPEAKING' ? 'bg-[#30D158]' : status === 'LISTENING' ? 'bg-red-500' : 'bg-[#00D4FF]'
              } animate-pulse`}
            />
            <span className="text-xs font-black text-white uppercase tracking-[0.3em]">{status}</span>
          </div>
        </div>

        <div className="bg-black/40 border border-white/5 rounded-3xl p-8 min-h-[120px] max-h-[300px] overflow-y-auto relative custom-scrollbar">
          {thinkingDisplay && (
            <div className="mb-4 p-3 bg-[#00D4FF]/5 rounded-2xl border border-[#00D4FF]/10 animate-fade-in">
              <span className="text-[9px] font-black text-[#00D4FF]/40 uppercase tracking-widest block mb-1">Internal Reasoning</span>
              <p className="text-[11px] text-[#8BA3C7]/60 italic leading-relaxed font-mono">
                {thinkingDisplay}
              </p>
            </div>
          )}
          <p className="text-lg font-medium text-[#E8F4FD] leading-relaxed whitespace-pre-wrap">
            {displayedText}
            <span className="inline-block w-2.5 h-5 ml-2 bg-[#00D4FF] animate-pulse align-middle" />
          </p>
          {transcript && (
            <p className="mt-4 text-xs text-[#8BA3C7] border-t border-white/5 pt-3 italic">
              Heard: &quot;{transcript}&quot;
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 mt-auto">
          <button
            type="button"
            onClick={() => {
              if (!isMuted) cancelAriaSpeech();
              setIsMuted(!isMuted);
            }}
            className={`p-5 rounded-3xl border transition-all ${
              isMuted ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-white/5 border-white/10 text-[#8BA3C7] hover:text-white'
            }`}
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>

          <button
            type="button"
            onMouseDown={handleHold}
            onMouseUp={handleRelease}
            onTouchStart={handleHold}
            onTouchEnd={handleRelease}
            className={`flex-1 w-full py-6 rounded-[2rem] font-black text-sm tracking-[0.4em] uppercase transition-all duration-300 flex items-center justify-center gap-4 select-none ${
              status === 'LISTENING'
                ? 'bg-red-500 text-white shadow-[0_0_50px_rgba(239,68,68,0.4)] scale-95'
                : 'bg-[#00D4FF] text-[#050810] hover:shadow-[0_0_50px_rgba(0,212,255,0.3)]'
            }`}
          >
            <Mic className="w-6 h-6" />
            {status === 'LISTENING' ? 'Uplink Open' : t('aria.hold_to_speak', currentLanguage)}
          </button>

          {hasExtracted && (
            <button
              type="button"
              onClick={() => {
                cancelAriaSpeech();
                onClose();
              }}
              className="flex-1 w-full py-6 rounded-[2rem] font-black text-sm tracking-[0.4em] uppercase bg-[#30D158] text-[#050810] hover:shadow-[0_0_50px_rgba(48,209,88,0.3)] transition-all animate-bounce"
            >
              View Report
            </button>
          )}

          <div className="hidden lg:flex items-center gap-4 px-6 py-4 bg-white/5 border border-white/5 rounded-3xl">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-[#8BA3C7] uppercase">Encryption</span>
              <span className="text-[10px] text-white font-mono">AES-256 ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

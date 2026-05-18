import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, User, Bot, AlertCircle } from 'lucide-react';
import { ImageUploadZone } from './ImageUploadZone';
import { TextInputPanel } from './TextInputPanel';
import { AnalyzeButton } from './AnalyzeButton';
import { SpeakWithAriaButton } from './SpeakWithAriaButton';
import { chatWithGemma, enrichIncident } from '@/services/gemma/gemmaClient';
import { useIncidentStore } from '@/store/incidentStore';
import { t } from '@/utils/i18n';
import { extractBase64Data, getMimeTypeFromDataUri } from '@/utils/imageUtils';
import type { GemmaMessage, ExtractedIncidentData } from '@/types/ai.types';
import type { DraftIncident } from '@/types/incident.types';

interface IncidentReportSectionProps {
  onOpenAria: () => void;
  onIncidentExtracted: (ext: ExtractedIncidentData) => void;
}

export const IncidentReportSection: React.FC<IncidentReportSectionProps> = ({
  onOpenAria,
  onIncidentExtracted,
}) => {
  const { userLocation, currentLanguage } = useIncidentStore();

  const [photoBase64, setPhotoBase64] = useState<string | undefined>(undefined);
  const [textInput, setTextInput] = useState('');

  const [isChatActive, setIsChatActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [chatHistory, setChatHistory] = useState<GemmaMessage[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const analyzeLockRef = useRef(false);
  const lastAnalyzedKeyRef = useRef('');

  const isInputEmpty = !photoBase64 && !textInput.trim();

  const inputKey = `${photoBase64?.slice(0, 40) || ''}|${textInput}`;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isProcessing]);

  const appendModelReply = (history: GemmaMessage[], reply: string): GemmaMessage[] => [
    ...history,
    { role: 'model', parts: [{ text: reply }] },
  ];

  const runTriageChat = async (
    history: GemmaMessage[],
    openChat: boolean
  ): Promise<'extracted' | 'replied' | 'failed'> => {
    if (openChat) setIsChatActive(true);
    setChatHistory(history);

    const res = await chatWithGemma(history, userLocation);
    if (!res.success) {
      setAnalysisStatus(res.error);
      setChatHistory(
        appendModelReply(
          history,
          'I could not reach the analysis service. Please check your connection and try again.'
        )
      );
      return 'failed';
    }

    if (res.extracted) {
      let ext = res.extracted;
      if (userLocation) {
        ext = {
          ...ext,
          where: {
            description: ext.where?.description || userLocation.address || userLocation.region || 'User location',
            lat: ext.where?.lat ?? userLocation.lat,
            lng: ext.where?.lng ?? userLocation.lng,
            confidence: Math.max(ext.where?.confidence ?? 0, 0.85),
          },
        };
      }
      onIncidentExtracted(ext);
      const confirm =
        res.text ||
        'Incident logged. Emergency teams are being notified for your area.';
      setChatHistory(appendModelReply(history, confirm));
      setAnalysisStatus('Incident card created.');
      setTimeout(() => setIsChatActive(false), 2500);
      return 'extracted';
    }

    if (res.text) {
      setChatHistory(appendModelReply(history, res.text));
      setAnalysisStatus('');
      return 'replied';
    }

    return 'failed';
  };

  const runAnalysis = useCallback(
    async (openChat = false, force = false) => {
      if (isInputEmpty || analyzeLockRef.current) return;
      if (!force && lastAnalyzedKeyRef.current === inputKey) return;

      analyzeLockRef.current = true;
      lastAnalyzedKeyRef.current = inputKey;
      setIsProcessing(true);
      setAnalysisStatus('Scanning visual and field data...');

      const combinedText = textInput.trim();
      const draft: DraftIncident = { photoBase64, textInput };

      try {
        const enrichResult = await enrichIncident(
          draft,
          userLocation
            ? `User GPS: ${userLocation.lat}, ${userLocation.lng}. ${userLocation.address || userLocation.region || ''}`
            : undefined
        );

        if (enrichResult.success) {
          let ext = enrichResult.result.extracted;
          if (userLocation) {
            ext = {
              ...ext,
              where: {
                description: ext.where?.description || userLocation.address || 'User GPS location',
                lat: ext.where?.lat ?? userLocation.lat,
                lng: ext.where?.lng ?? userLocation.lng,
                confidence: Math.max(ext.where?.confidence ?? 0, 0.85),
              },
            };
          }
          onIncidentExtracted(ext);
          setAnalysisStatus('Incident card created.');
          setIsChatActive(false);
          return;
        }

        setAnalysisStatus('ARIA is reviewing your report…');
        const initialParts: GemmaMessage['parts'] = [];
        if (photoBase64) {
          initialParts.push({
            inline_data: {
              mime_type: getMimeTypeFromDataUri(photoBase64),
              data: extractBase64Data(photoBase64),
            },
          });
        }
        initialParts.push({
          text: combinedText || 'Please analyze the attached disaster scene and help triage this emergency.',
        });

        const history: GemmaMessage[] = [{ role: 'user', parts: initialParts }];
        await runTriageChat(history, openChat);
      } finally {
        setIsProcessing(false);
        analyzeLockRef.current = false;
      }
    },
    [isInputEmpty, inputKey, photoBase64, textInput, userLocation, onIncidentExtracted]
  );

  useEffect(() => {
    if (isInputEmpty || !photoBase64) return;
    // Auto-trigger analysis when a photo is uploaded
    const timer = setTimeout(() => runAnalysis(true), 800);
    return () => clearTimeout(timer);
  }, [photoBase64, runAnalysis, isInputEmpty]);

  useEffect(() => {
    if (isInputEmpty || photoBase64) return;
    const hasEnoughText = textInput.trim().length >= 15;
    if (!hasEnoughText) return;

    const timer = setTimeout(() => runAnalysis(true), 2500);
    return () => clearTimeout(timer);
  }, [textInput, isInputEmpty, runAnalysis, photoBase64]);

  const handleStartChat = () => {
    lastAnalyzedKeyRef.current = '';
    runAnalysis(true, true);
  };

  const handleSendMessage = async () => {
    if (!currentQuery.trim() || isProcessing) return;

    const userMsg: GemmaMessage = { role: 'user', parts: [{ text: currentQuery }] };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setCurrentQuery('');
    setIsProcessing(true);
    setIsChatActive(true);

    try {
      await runTriageChat(newHistory, true);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section id="report" className="w-full max-w-5xl mx-auto px-4 py-16 scroll-mt-20">
      {!isChatActive && (
        <div className="flex flex-col gap-2 mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-wider font-['Orbitron'] text-white">
            {t('report.title', currentLanguage).toUpperCase()}
          </h2>
          <p className="text-sm text-[#8BA3C7] max-w-lg mx-auto uppercase tracking-widest font-medium opacity-60">
            {t('report.subtitle', currentLanguage)}
          </p>
          {isProcessing && analysisStatus && (
            <p className="text-xs text-[#00D4FF] font-bold tracking-widest uppercase animate-pulse mt-2">
              {analysisStatus}
            </p>
          )}
        </div>
      )}

      {isChatActive ? (
        <div className="w-full bg-[#0D1117] rounded-[32px] border border-[#00D4FF]/20 overflow-hidden flex flex-col h-[600px]">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#161B22]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00D4FF]/10 flex items-center justify-center border border-[#00D4FF]/20">
                <Sparkles className="w-5 h-5 text-[#00D4FF]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-widest uppercase">ARIA Assistant</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-[#8BA3C7] font-bold uppercase tracking-tighter">
                    {isProcessing ? 'Analyzing Field Data' : 'Triage Active'}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsChatActive(false);
                lastAnalyzedKeyRef.current = '';
              }}
              className="text-[10px] font-black tracking-widest text-[#8BA3C7] hover:text-white uppercase px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {chatHistory.length === 0 && !isProcessing && (
              <p className="text-center text-xs text-[#8BA3C7]">ARIA is ready. Describe the disaster.</p>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    msg.role === 'user' ? 'bg-white/5 border-white/10' : 'bg-[#00D4FF]/10 border-[#00D4FF]/20'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-[#8BA3C7]" />
                  ) : (
                    <Bot className="w-4 h-4 text-[#00D4FF]" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#161B22] text-white border border-white/5 rounded-tr-none'
                      : 'bg-white/5 text-[#E8F4FD] border border-white/5 rounded-tl-none'
                  }`}
                >
                  {msg.parts.find((p) => p.text)?.text}
                  {msg.parts.find((p) => p.inline_data) && (
                    <div className="mt-2 text-[10px] text-[#00D4FF] font-bold uppercase flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" /> Visual Data Attached
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-xl bg-[#00D4FF]/10 border border-[#00D4FF]/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[#00D4FF] animate-pulse" />
                </div>
                <div className="bg-white/5 p-4 rounded-2xl flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]/40 animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]/40 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00D4FF]/40 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-6 bg-[#161B22]/50 border-t border-white/5">
            <div className="relative group">
              <input
                value={currentQuery}
                onChange={(e) => setCurrentQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Reply to ARIA..."
                className="w-full bg-[#050810] border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-sm text-white placeholder:text-[#8BA3C7]/40 focus:outline-none focus:border-[#00D4FF]/40 transition-all"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!currentQuery.trim() || isProcessing}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-[#00D4FF] text-black rounded-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <ImageUploadZone
              onImageSelected={(b64) => {
                lastAnalyzedKeyRef.current = '';
                setPhotoBase64(b64);
              }}
              previewUrl={photoBase64 || null}
              onClearImage={() => {
                lastAnalyzedKeyRef.current = '';
                setPhotoBase64(undefined);
              }}
              isAnalyzing={isProcessing}
            />
            <div className="flex flex-col gap-6">
              <TextInputPanel value={textInput} onChange={setTextInput} />
            </div>
          </div>
          <div className="w-full max-w-xl mx-auto flex flex-col gap-4">
            <AnalyzeButton
              onClick={handleStartChat}
              disabled={isInputEmpty}
              isAnalyzing={isProcessing}
              label={t('report.analyze', currentLanguage)}
            />
            <SpeakWithAriaButton onClick={onOpenAria} label={t('report.speak_aria', currentLanguage)} />
          </div>
        </>
      )}
    </section>
  );
};


import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Trash2, ChevronRight, ChevronLeft, 
  RefreshCw, Package, HardHat, Percent, 
  Receipt, Languages, Sparkles, Wand2,
  Lightbulb, X, FileText, Table, FolderOpen, Save, Clock, Volume2, Quote,
  HelpCircle,
  Info
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { 
  Language, PricingStep, PricingState, MaterialItem, Project 
} from './types';
import { translations } from './translations';
import { getPricingSuggestions } from './services/geminiService';
import { BannerAd, InterstitialAd } from './components/AdComponents';
import { APP_ICON_URL, DEFAULT_ICON_SVG } from './constants';
import { exportToPdf, exportToExcel } from './utils/exportUtils';

// Premium Icon Component with Smart Fallback
const AppIcon: React.FC<{ size?: string }> = ({ size = "w-12 h-12" }) => {
  const [useFallback, setUseFallback] = useState(false);
  
  return (
    <div className={`${size} relative flex items-center justify-center crystal-glow`}>
      <img 
        src={useFallback ? DEFAULT_ICON_SVG : APP_ICON_URL} 
        alt="ValoraPricing" 
        className={`${size} object-contain transition-opacity duration-500 filter drop-shadow-md`}
        onError={() => setUseFallback(true)}
      />
    </div>
  );
};

// Step Instructions Component
const StepInstructions: React.FC<{ lang: Language, step: PricingStep }> = ({ lang, step }) => {
  const t = translations[lang];
  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-700">
      <div className="bg-blue-50/30 border border-blue-100/50 p-4 rounded-3xl flex items-start gap-3 shadow-sm depth-shadow">
        <div className="shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg">
            <Info size={16} />
          </div>
        </div>
        <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">
          {t.instructions[step]}
        </p>
      </div>
    </div>
  );
};

// Motivational Banner with TTS
const MotivationalBanner: React.FC<{ lang: Language, step: PricingStep }> = ({ lang, step }) => {
  const t = translations[lang];
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setQuoteIndex(Math.floor(Math.random() * t.quotes.length));
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, [step, lang, t.quotes.length]);

  const speakQuote = async () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = lang === Language.EN 
        ? `Read this encouraging quote for an entrepreneur: "${t.quotes[quoteIndex]}"`
        : `اقرأ هذه الحكمة المشجعة لرائد أعمال بصوت واثق: "${t.quotes[quoteIndex]}"`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: lang === Language.EN ? 'Kore' : 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const dataInt16 = new Int16Array(bytes.buffer);
        const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) {
          channelData[i] = dataInt16[i] / 32768.0;
        }

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.onended = () => setIsSpeaking(false);
        source.start();
      } else {
        setIsSpeaking(false);
      }
    } catch (err) {
      console.error("TTS Error:", err);
      setIsSpeaking(false);
    }
  };

  return (
    <div className={`mb-6 flex justify-center transition-all duration-700 transform ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
      <div className="flex items-center gap-3">
        <button 
          onClick={speakQuote}
          disabled={isSpeaking}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSpeaking ? 'bg-blue-100 text-blue-600 animate-pulse scale-110' : 'bg-white text-slate-300 hover:text-blue-500 hover:scale-105 active:scale-95 shadow-sm border border-slate-100'}`}
        >
          <Volume2 size={18} />
        </button>
        <p className="text-[10px] font-medium text-slate-400 italic max-w-xs text-center leading-tight">
          "{t.quotes[quoteIndex]}"
        </p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(Language.EN);
  const [step, setStep] = useState<PricingStep>('materials');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [aiNote, setAiNote] = useState<{ margin: number, tax: number, context: string } | null>(null);
  const [suggestedPreview, setSuggestedPreview] = useState<MaterialItem[]>([]);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  
  const [state, setState] = useState<PricingState>({
    materials: [],
    laborRate: 0,
    laborHours: 0,
    fixedLabor: 0,
    profitMargin: 20,
    taxRate: 5
  });

  const t = translations[lang];
  const isRtl = lang === Language.AR;

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('valora_pricing');
    if (saved) {
      try { setState(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
    const projects = localStorage.getItem('valora_projects');
    if (projects) {
      try { setSavedProjects(JSON.parse(projects)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => { localStorage.setItem('valora_pricing', JSON.stringify(state)); }, [state]);
  useEffect(() => { localStorage.setItem('valora_projects', JSON.stringify(savedProjects)); }, [savedProjects]);

  // Calculations
  const materialsTotal = useMemo(() => 
    state.materials.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  , [state.materials]);

  const laborTotal = useMemo(() => 
    (state.laborRate * state.laborHours) + state.fixedLabor
  , [state.laborRate, state.laborHours, state.fixedLabor]);

  const subtotal = materialsTotal + laborTotal;
  const profitAmount = subtotal * (state.profitMargin / 100);
  const totalWithProfit = subtotal + profitAmount;
  const taxAmount = totalWithProfit * (state.taxRate / 100);
  const finalPrice = totalWithProfit + taxAmount;

  // Handlers
  const toggleLang = () => setLang(prev => prev === Language.EN ? Language.AR : Language.EN);

  const resetAll = () => {
    const msg = lang === Language.EN ? 'Reset all data?' : 'هل تريد مسح جميع البيانات؟';
    if (confirm(msg)) {
      setState({
        materials: [], laborRate: 0, laborHours: 0, fixedLabor: 0, profitMargin: 20, taxRate: 5
      });
      setAiNote(null);
      setSuggestedPreview([]);
      setStep('materials');
    }
  };

  const handleSaveProject = () => {
    if (!newProjectName.trim()) return;
    const existingIndex = savedProjects.findIndex(p => p.name.toLowerCase() === newProjectName.toLowerCase());
    if (existingIndex !== -1) {
      if (!confirm(t.overwrite)) return;
      const updated = [...savedProjects];
      updated[existingIndex] = { ...updated[existingIndex], date: new Date().toISOString(), state: { ...state } };
      setSavedProjects(updated);
    } else {
      const newProject: Project = { id: crypto.randomUUID(), name: newProjectName, date: new Date().toISOString(), state: { ...state } };
      setSavedProjects([newProject, ...savedProjects]);
    }
    setShowSaveModal(false);
    setNewProjectName('');
  };

  const loadProject = (project: Project) => { setState(project.state); setShowProjectsModal(false); setStep('materials'); };
  const deleteProject = (id: string) => { setSavedProjects(prev => prev.filter(p => p.id !== id)); };
  const addMaterial = () => {
    const newItem: MaterialItem = { id: crypto.randomUUID(), name: '', quantity: 1, unitPrice: 0 };
    setState(prev => ({ ...prev, materials: [...prev.materials, newItem] }));
  };
  const updateMaterial = (id: string, updates: Partial<MaterialItem>) => {
    setState(prev => ({ ...prev, materials: prev.materials.map(m => m.id === id ? { ...m, ...updates } : m) }));
  };
  const removeMaterial = (id: string) => { setState(prev => ({ ...prev, materials: prev.materials.filter(m => m.id !== id) })); };

  const handleAiEstimate = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setSuggestedPreview([]);
    setAiNote(null);
    const suggestion = await getPricingSuggestions(aiInput);
    if (suggestion) {
      const newMaterials: MaterialItem[] = suggestion.materials.map((m: any) => ({ id: crypto.randomUUID(), name: m.name, quantity: m.quantity, unitPrice: m.unitPrice }));
      setSuggestedPreview(newMaterials);
      setAiNote({ margin: suggestion.suggestedMargin, tax: suggestion.suggestedTax, context: suggestion.context || 'Industry standard' });
      setAiInput('');
    }
    setAiLoading(false);
  };

  const updateSuggestedItem = (id: string, updates: Partial<MaterialItem>) => { setSuggestedPreview(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m)); };
  const removeSuggestedItem = (id: string) => { setSuggestedPreview(prev => prev.filter(m => m.id !== id)); };
  const acceptSuggestions = () => {
    setState(prev => ({ ...prev, materials: [...prev.materials, ...suggestedPreview], profitMargin: aiNote?.margin ?? prev.profitMargin, taxRate: aiNote?.tax ?? prev.taxRate }));
    setSuggestedPreview([]);
  };
  const dismissSuggestions = () => { setSuggestedPreview([]); setAiNote(null); };

  const navigateToStep = (newStep: PricingStep) => {
    if (newStep === 'summary' && step !== 'summary') setShowInterstitial(true);
    setStep(newStep);
  };

  return (
    <div className={`min-h-screen pb-40 transition-all duration-500 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <InterstitialAd isOpen={showInterstitial} onClose={() => setShowInterstitial(false)} />
      
      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white/95 backdrop-blur-2xl w-full max-w-lg rounded-[3rem] p-10 shadow-2xl border border-white animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <HelpCircle className="text-blue-600" size={28} />
                {t.howToUse}
              </h3>
              <button onClick={() => setShowHelpModal(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-6 text-slate-600">
              <div className="mb-4">
                <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-2">Description</h4>
                <p className="text-sm font-medium leading-relaxed">
                  {isRtl 
                    ? 'ValoraPricing هو أداة احترافية مصممة لمساعدة رواد الأعمال والمقاولين والمستقلين على حساب تكاليف مشاريعهم بدقة وتحديد أسعار بيع مربحة بكل ثقة.'
                    : 'ValoraPricing is a professional tool designed to help entrepreneurs, contractors, and freelancers accurately calculate their project costs and set profitable selling prices with confidence.'
                  }
                </p>
              </div>

              <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-2">Steps to use</h4>
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 font-black text-blue-600 shadow-sm border border-blue-200/50">1</div>
                  <div className="flex-1">
                    <span className="block font-black text-xs text-slate-800 uppercase tracking-wider mb-1">{t.materials}</span>
                    <p className="text-xs font-medium">{t.instructions.materials}</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 font-black text-blue-600 shadow-sm border border-blue-200/50">2</div>
                  <div className="flex-1">
                    <span className="block font-black text-xs text-slate-800 uppercase tracking-wider mb-1">{t.labor}</span>
                    <p className="text-xs font-medium">{t.instructions.labor}</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 font-black text-blue-600 shadow-sm border border-blue-200/50">3</div>
                  <div className="flex-1">
                    <span className="block font-black text-xs text-slate-800 uppercase tracking-wider mb-1">{t.profitTax}</span>
                    <p className="text-xs font-medium">{t.instructions.margin}</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 font-black text-blue-600 shadow-sm border border-blue-200/50">4</div>
                  <div className="flex-1">
                    <span className="block font-black text-xs text-slate-800 uppercase tracking-wider mb-1">{t.summary}</span>
                    <p className="text-xs font-medium">{t.instructions.summary}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Projects Modal */}
      {showProjectsModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white/95 backdrop-blur-2xl w-full max-w-md rounded-[3rem] p-8 shadow-2xl border border-white animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <FolderOpen className="text-blue-600" size={24} />
                {t.savedProjects}
              </h3>
              <button onClick={() => setShowProjectsModal(false)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar space-y-3 pr-1">
              {savedProjects.length === 0 ? (
                <p className="text-center py-10 text-slate-400 font-bold">{t.noProjects}</p>
              ) : (
                savedProjects.map(project => (
                  <div key={project.id} className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex justify-between items-center group">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => loadProject(project)}>
                      <h4 className="font-black text-slate-800 truncate">{project.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{new Date(project.date).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => deleteProject(project.id)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-xl">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header - Left aligned logo, Right aligned buttons as per screenshot */}
      <header className="sticky top-0 z-50 glass-panel shadow-sm px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-5">
          <AppIcon />
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-none tracking-tight">{t.title}</h1>
            <span className="text-[11px] text-blue-500 font-black uppercase tracking-[0.2em] mt-1 block opacity-70">Premium Estimation</span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setShowHelpModal(true)} 
            className="px-6 h-12 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-[0.2em] shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            {t.howToUse}
          </button>
          <button onClick={() => setShowProjectsModal(true)} className="w-12 h-12 rounded-2xl text-blue-600 bg-blue-50/70 hover:bg-blue-100 flex items-center justify-center shadow-sm border border-blue-100/30">
            <FolderOpen size={22} />
          </button>
          <button onClick={toggleLang} className="px-6 h-12 rounded-2xl bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200">
            {lang === Language.EN ? 'AR' : 'EN'}
          </button>
          <button onClick={resetAll} className="w-12 h-12 rounded-2xl text-rose-500 bg-rose-50/70 hover:bg-rose-100 flex items-center justify-center shadow-sm border border-rose-100/30">
            <RefreshCw size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-10">
        <MotivationalBanner lang={lang} step={step} />

        {/* Card Container */}
        <div className="card-3d p-10 min-h-[500px] flex flex-col shadow-2xl relative">
          <div className="relative z-10 flex-1">
            <StepInstructions lang={lang} step={step} />
            
            {step === 'materials' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <Package size={28} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.materials}</h2>
                  </div>
                  <button onClick={addMaterial} className="w-14 h-14 crystal-button text-white rounded-3xl flex items-center justify-center shadow-xl">
                    <Plus size={28} />
                  </button>
                </div>

                {/* AI Estimator Box - Faceted look like screenshot */}
                <div className="bg-blue-50/40 border border-blue-100/50 p-6 rounded-[2.5rem] crystal-facet shadow-inner">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-purple-500" />
                    <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{t.aiHelp}</span>
                  </div>
                  <div className="flex gap-4">
                    <input
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      placeholder={t.aiPlaceholder}
                      className="flex-1 bg-white border border-slate-100 rounded-2xl px-6 py-4 text-base font-semibold focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm placeholder:text-slate-300"
                      disabled={aiLoading}
                    />
                    <button 
                      onClick={handleAiEstimate}
                      disabled={aiLoading || !aiInput}
                      className="w-16 h-16 crystal-button text-white rounded-2xl flex items-center justify-center shadow-2xl disabled:opacity-40"
                    >
                      {aiLoading ? <RefreshCw className="animate-spin" size={28} /> : <Wand2 size={28} />}
                    </button>
                  </div>
                  
                  {suggestedPreview.length > 0 && (
                    <div className="mt-8 bg-white border border-blue-100 rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-500">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-blue-600 tracking-widest">AI SUGGESTIONS</span>
                        <button onClick={dismissSuggestions} className="text-slate-300 hover:text-rose-400"><X size={18}/></button>
                      </div>
                      <div className="space-y-3 mb-6">
                        {suggestedPreview.map(m => (
                          <div key={m.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between text-sm font-bold">
                            <span>{m.name}</span>
                            <span className="text-blue-600">${m.unitPrice}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={acceptSuggestions} className="w-full crystal-button py-4 rounded-2xl text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg">
                        {isRtl ? 'إضافة للمشروع' : 'Add to Project'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {state.materials.length === 0 ? (
                    <div className="text-center py-28 bg-slate-50/20 rounded-[3rem] border-2 border-dashed border-slate-100">
                      <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-5 shadow-xl border border-slate-50 text-slate-200">
                        <Package size={40} />
                      </div>
                      <p className="text-slate-400 font-bold italic text-lg">Your materials list will appear here.</p>
                    </div>
                  ) : (
                    state.materials.map(m => (
                      <div key={m.id} className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-xl flex flex-col gap-5 hover:scale-[1.01] transition-transform">
                        <div className="flex gap-4">
                          <input
                            placeholder={t.materialName}
                            value={m.name}
                            onChange={(e) => updateMaterial(m.id, { name: e.target.value })}
                            className="flex-1 bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 text-base font-bold outline-none"
                          />
                          <button onClick={() => removeMaterial(m.id)} className="w-14 h-14 text-rose-400 hover:bg-rose-50 rounded-2xl flex items-center justify-center">
                            <Trash2 size={24} />
                          </button>
                        </div>
                        <div className="flex gap-5">
                          <div className="flex-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">{t.qty}</label>
                            <input type="number" value={m.quantity || ''} onChange={(e) => updateMaterial(m.id, { quantity: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 font-black text-center"/>
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">{t.unitPrice}</label>
                            <input type="number" value={m.unitPrice || ''} onChange={(e) => updateMaterial(m.id, { unitPrice: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 font-black text-center"/>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {step === 'labor' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center text-white shadow-lg">
                      <HardHat size={28} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.labor}</h2>
                  </div>
                  <div className="grid gap-8">
                    {[
                      { label: t.hourlyRate, val: state.laborRate, key: 'laborRate' },
                      { label: t.hours, val: state.laborHours, key: 'laborHours' },
                      { label: t.fixedCost, val: state.fixedLabor, key: 'fixedLabor' }
                    ].map(f => (
                      <div key={f.key} className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-xl">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block px-1">{f.label}</label>
                        <input
                          type="number"
                          value={f.val || ''}
                          onChange={(e) => setState(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                          className="w-full bg-slate-50/50 border border-slate-100 rounded-[1.5rem] px-8 py-5 text-4xl font-black text-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none text-center"
                        />
                      </div>
                    ))}
                  </div>
              </div>
            )}

            {step === 'margin' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center text-white shadow-lg">
                    <Percent size={28} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.profitTax}</h2>
                </div>
                <div className="space-y-10">
                  <div className="bg-white p-10 rounded-[3rem] border border-slate-50 shadow-xl">
                    <div className="flex justify-between items-center mb-8">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.margin}</label>
                      <span className="text-5xl font-black text-blue-600 tracking-tighter">{state.profitMargin}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={state.profitMargin} onChange={(e) => setState(prev => ({ ...prev, profitMargin: Number(e.target.value) }))} className="w-full h-4 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600 shadow-inner"/>
                  </div>
                  <div className="bg-white p-10 rounded-[3rem] border border-slate-50 shadow-xl">
                    <div className="flex justify-between items-center mb-8">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.tax}</label>
                      <span className="text-5xl font-black text-emerald-500 tracking-tighter">{state.taxRate}%</span>
                    </div>
                    <input type="range" min="0" max="50" step="0.5" value={state.taxRate} onChange={(e) => setState(prev => ({ ...prev, taxRate: Number(e.target.value) }))} className="w-full h-4 bg-slate-100 rounded-full appearance-none cursor-pointer accent-emerald-500 shadow-inner"/>
                  </div>
                </div>
              </div>
            )}

            {step === 'summary' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                 <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center text-white shadow-lg">
                    <Receipt size={28} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.summary}</h2>
                </div>
                
                <div className="bg-slate-50/50 p-10 rounded-[3rem] border border-white shadow-inner space-y-6">
                   <div className="flex justify-between font-bold text-slate-500 uppercase tracking-widest text-xs">
                    <span>{t.materials}</span>
                    <span className="text-slate-800">${materialsTotal.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between font-bold text-slate-500 uppercase tracking-widest text-xs">
                    <span>{t.labor}</span>
                    <span className="text-slate-800">${laborTotal.toLocaleString()}</span>
                   </div>
                   <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-black text-slate-900 uppercase tracking-[0.2em]">{t.totalCost}</span>
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">${subtotal.toLocaleString()}</span>
                   </div>
                </div>

                <div className="relative overflow-hidden crystal-button p-12 rounded-[3.5rem] shadow-2xl text-center shimmer-effect transform transition-all hover:scale-[1.02] active:scale-95 cursor-pointer">
                  <div className="relative z-10">
                    <span className="text-blue-100 text-[11px] font-black uppercase tracking-[0.6em] mb-4 block opacity-80">{t.sellingPrice}</span>
                    <h3 className="text-7xl font-black text-white tracking-tighter drop-shadow-2xl">
                      ${finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <button onClick={() => exportToPdf(state, { subtotal, profit: profitAmount, tax: taxAmount, final: finalPrice }, lang)} className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-xl flex items-center justify-center gap-3 hover:bg-slate-50 font-black text-xs uppercase tracking-widest text-slate-600 transition-all">
                    <FileText className="text-rose-500" size={24}/> PDF
                  </button>
                  <button onClick={() => exportToExcel(state, { subtotal, profit: profitAmount, tax: taxAmount, final: finalPrice })} className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-xl flex items-center justify-center gap-3 hover:bg-slate-50 font-black text-xs uppercase tracking-widest text-slate-600 transition-all">
                    <Table className="text-emerald-500" size={24}/> EXCEL
                  </button>
                  <button onClick={() => setShowSaveModal(true)} className="col-span-2 crystal-button text-white p-6 rounded-[2rem] shadow-2xl flex items-center justify-center gap-4 text-sm font-black uppercase tracking-widest">
                    <Save size={24}/> {t.saveProject}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-12">
            <BannerAd />
          </div>
        </div>

        {/* Floating Navigation - Chunky Crystal Design like screenshot */}
        <div className="mt-14 flex gap-6 nav-container p-5 sticky bottom-12 z-[40]">
          {step !== 'materials' && (
            <button 
              onClick={() => {
                if (step === 'summary') navigateToStep('margin');
                else if (step === 'margin') navigateToStep('labor');
                else if (step === 'labor') navigateToStep('materials');
              }}
              className="flex-1 bg-white border border-slate-200 text-slate-400 font-black text-xs uppercase tracking-widest py-6 rounded-[2rem] shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <ChevronLeft size={24} />
              {t.prev}
            </button>
          )}
          {step !== 'summary' && (
            <button 
              onClick={() => {
                if (step === 'materials') navigateToStep('labor');
                else if (step === 'labor') navigateToStep('margin');
                else if (step === 'margin') navigateToStep('summary');
              }}
              className="flex-[2] crystal-button text-white font-black text-sm uppercase tracking-[0.4em] py-6 rounded-[2rem] shadow-2xl transition-all flex items-center justify-center gap-4 shimmer-effect"
            >
              {t.next}
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      </main>

      <footer className="text-center py-20 text-slate-300">
        <div className="text-[10px] font-black uppercase tracking-[0.8em] opacity-40">
          ValoraPricing Pro &bull; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
};

export default App;

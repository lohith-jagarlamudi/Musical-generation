/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Square, 
  Music, 
  Settings, 
  Info, 
  Cpu, 
  Volume2, 
  Activity,
  ChevronRight,
  RefreshCw,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Layers,
  Trash2,
  Sparkles
} from 'lucide-react';
import Markdown from 'react-markdown';
import { Raga, Tala, Note, Composition, Swara } from './types';
import { RAGAS, TALAS, SWARA_FREQUENCIES } from './constants';

const API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- Audio Engine ---
class CarnaticSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private feedbackGain: GainNode | null = null;
  private baseFreq: number = 261.63; // C4

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window !== 'undefined') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      
      // Enhanced Audio: Add a subtle delay for space
      this.delayNode = this.ctx.createDelay(1.0);
      this.feedbackGain = this.ctx.createGain();
      
      this.delayNode.delayTime.value = 0.3;
      this.feedbackGain.gain.value = 0.2;

      this.masterGain.connect(this.ctx.destination);
      
      // Feedback loop
      this.masterGain.connect(this.delayNode);
      this.delayNode.connect(this.feedbackGain);
      this.feedbackGain.connect(this.delayNode);
      this.delayNode.connect(this.ctx.destination);

      this.masterGain.gain.value = 0.4;
    }
  }

  public async resume() {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public playNote(swara: Swara, duration: number, octave: number = 0) {
    if (!this.ctx || !this.masterGain) return;

    const ratio = SWARA_FREQUENCIES[swara];
    const freq = this.baseFreq * ratio * Math.pow(2, octave);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Richer sound: Triangle + Sine with slight detune
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 1.005, this.ctx.currentTime);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration - 0.05);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + duration);
    osc2.stop(this.ctx.currentTime + duration);
  }

  public setBaseFreq(freq: number) {
    this.baseFreq = freq;
  }
}

const synth = new CarnaticSynth();

// --- Main Component ---
export default function App() {
  const [selectedRaga, setSelectedRaga] = useState<Raga>(RAGAS[0]);
  const [selectedTala, setSelectedTala] = useState<Tala>(TALAS[0]);
  const [tempo, setTempo] = useState(120);
  const [composition, setComposition] = useState<Composition | null>(null);
  const [sequence, setSequence] = useState<Composition[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const generateComposition = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const prompt = `Generate a Carnatic music composition (Alapana/Kriti snippet) for Raga: ${selectedRaga.name} and Tala: ${selectedTala.name}.
      The Raga's Arohana is: ${selectedRaga.arohana.join(', ')} and Avarohana is: ${selectedRaga.avarohana.join(', ')}.
      Adhere strictly to these notes.
      Provide the output as a JSON object with:
      - title: A creative title
      - raga: ${selectedRaga.name}
      - tala: ${selectedTala.name}
      - notes: An array of objects with { swara: string (one of S, R1, R2, G2, G3, M1, M2, P, D1, D2, N2, N3, S'), duration: number (in beats, e.g. 0.5, 1, 2), octave: number (-1, 0, 1) }
      - explanation: A brief description of the musical phrases used.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              raga: { type: Type.STRING },
              tala: { type: Type.STRING },
              notes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    swara: { type: Type.STRING },
                    duration: { type: Type.NUMBER },
                    octave: { type: Type.INTEGER }
                  },
                  required: ["swara", "duration", "octave"]
                }
              },
              explanation: { type: Type.STRING }
            },
            required: ["title", "raga", "tala", "notes", "explanation"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}") as Composition;
      setComposition(data);
    } catch (err) {
      console.error(err);
      setError("Failed to generate composition. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const addToSequence = () => {
    if (composition) {
      setSequence(prev => [...prev, composition]);
    }
  };

  const clearSequence = () => {
    setSequence([]);
  };

  const combineAndPlay = async () => {
    if (sequence.length === 0) return;
    
    const combinedNotes: Note[] = sequence.flatMap(comp => comp.notes);
    const combinedComp: Composition = {
      title: "Combined Masterpiece",
      raga: "Various",
      tala: "Various",
      notes: combinedNotes,
      explanation: "A seamless sequence of multiple Carnatic compositions."
    };
    
    setComposition(combinedComp);
    await synth.resume();
    setIsPlaying(true);
    setCurrentNoteIndex(0);
  };

  const stopPlayback = useCallback(() => {
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
    }
    setIsPlaying(false);
    setCurrentNoteIndex(-1);
  }, []);

  const playComposition = async () => {
    if (!composition) return;
    await synth.resume();
    setIsPlaying(true);
    setCurrentNoteIndex(0);
  };

  useEffect(() => {
    if (isPlaying && composition && currentNoteIndex >= 0 && currentNoteIndex < composition.notes.length) {
      const note = composition.notes[currentNoteIndex];
      const beatDuration = 60 / tempo;
      const actualDuration = note.duration * beatDuration;

      synth.playNote(note.swara as Swara, actualDuration, note.octave);

      playbackTimeoutRef.current = setTimeout(() => {
        if (currentNoteIndex < composition.notes.length - 1) {
          setCurrentNoteIndex(prev => prev + 1);
        } else {
          stopPlayback();
        }
      }, actualDuration * 1000);
    }

    return () => {
      if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
    };
  }, [isPlaying, composition, currentNoteIndex, tempo, stopPlayback]);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E2E2E2] font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Music className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">RagaFlow AI</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-bold">Carnatic Synthesis Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-zinc-400" />
            </button>
            <div className="h-4 w-[1px] bg-white/10" />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-full border border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-zinc-300">Engine Online</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Raga Selection */}
          <section className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-6">
              <Cpu className="w-4 h-4 text-emerald-500" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Parameter Setup</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-bold">Select Raga</label>
                <div className="grid grid-cols-1 gap-2">
                  {RAGAS.map((raga) => (
                    <button
                      key={raga.name}
                      onClick={() => setSelectedRaga(raga)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                        selectedRaga.name === raga.name 
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                        : 'bg-black/20 border-white/5 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <span className="text-sm font-medium">{raga.name}</span>
                      {selectedRaga.name === raga.name && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-bold">Select Tala</label>
                <select 
                  value={selectedTala.name}
                  onChange={(e) => setSelectedTala(TALAS.find(t => t.name === e.target.value) || TALAS[0])}
                  className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                >
                  {TALAS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Tempo (BPM)</label>
                  <span className="text-xs font-mono text-emerald-500">{tempo}</span>
                </div>
                <input 
                  type="range" 
                  min="40" 
                  max="200" 
                  value={tempo}
                  onChange={(e) => setTempo(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 bg-zinc-800 h-1.5 rounded-full appearance-none cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={generateComposition}
              disabled={isGenerating}
              className="w-full mt-8 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-5 h-5" />
                  <span>Generate Composition</span>
                </>
              )}
            </button>
          </section>

          {/* Sequence Management */}
          <section className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Composition Sequence</h2>
              </div>
              <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-500 font-mono">{sequence.length}</span>
            </div>

            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {sequence.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center py-4 italic">No compositions in sequence</p>
              ) : (
                sequence.map((comp, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-black/20 border border-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-zinc-600">{(idx + 1).toString().padStart(2, '0')}</span>
                      <span className="text-sm font-medium text-zinc-300 truncate max-w-[120px]">{comp.title}</span>
                    </div>
                    <span className="text-[10px] text-emerald-500/60 font-mono">{comp.notes.length}n</span>
                  </div>
                ))
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={combineAndPlay}
                disabled={sequence.length === 0 || isPlaying}
                className="flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-xl text-xs font-bold transition-all border border-white/5"
              >
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Combine & Play
              </button>
              <button
                onClick={clearSequence}
                disabled={sequence.length === 0}
                className="flex items-center justify-center gap-2 py-3 bg-zinc-800/50 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 rounded-xl text-xs font-bold transition-all border border-white/5"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </section>

          {/* Raga Info */}
          <section className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-zinc-500" />
              <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Raga Insights</h3>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed italic">
              "{selectedRaga.description}"
            </p>
            <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase text-zinc-600 font-bold">Arohana</span>
                <span className="text-sm font-mono text-emerald-500/80">{selectedRaga.arohana.join(' ')}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase text-zinc-600 font-bold">Avarohana</span>
                <span className="text-sm font-mono text-emerald-500/80">{selectedRaga.avarohana.join(' ')}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Output & Visualization */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Player Card */}
          <section className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md flex flex-col min-h-[600px]">
            {/* Player Header */}
            <div className="p-8 border-b border-white/5 bg-gradient-to-br from-zinc-800/50 to-transparent">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest rounded-md border border-emerald-500/20">
                      Output Stream
                    </span>
                    {composition && (
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {composition.notes.length} Tokens Generated
                      </span>
                    )}
                  </div>
                  <h2 className="text-4xl font-bold tracking-tight mb-2">
                    {composition ? composition.title : "Ready for Synthesis"}
                  </h2>
                  <p className="text-zinc-400 text-sm max-w-md">
                    {composition ? `A custom ${composition.raga} composition in ${composition.tala}.` : "Configure parameters and click generate to create a new Carnatic composition."}
                  </p>
                </div>
                <div className="flex gap-2">
                  {composition && !isPlaying && (
                    <button 
                      onClick={addToSequence}
                      className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-2xl border border-emerald-500/20 transition-all font-bold text-xs"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Sequence
                    </button>
                  )}
                  <button className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl border border-white/5 transition-colors">
                    <Download className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Visualization Area */}
            <div className="flex-1 p-8 flex flex-col">
              <div className="flex-1 relative bg-black/40 rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-10" 
                  style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
                />
                
                <AnimatePresence mode="wait">
                  {!composition ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center space-y-4 z-10"
                    >
                      <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto border border-white/10">
                        <Activity className="w-10 h-10 text-zinc-600" />
                      </div>
                      <p className="text-zinc-500 text-sm font-medium">Waiting for engine input...</p>
                    </motion.div>
                  ) : (
                    <div className="w-full h-full p-8 flex flex-col justify-center items-center gap-12">
                      {/* Active Swara Display */}
                      <div className="relative">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={currentNoteIndex}
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 1.2, opacity: 0, y: -20 }}
                            className="text-9xl font-black text-emerald-500 drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]"
                          >
                            {currentNoteIndex >= 0 ? composition.notes[currentNoteIndex].swara : "—"}
                          </motion.div>
                        </AnimatePresence>
                        {/* Waveform Simulation */}
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-end gap-1 h-8">
                          {[...Array(12)].map((_, i) => (
                            <motion.div
                              key={i}
                              animate={isPlaying ? { height: [8, Math.random() * 32 + 8, 8] } : { height: 8 }}
                              transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                              className="w-1 bg-emerald-500/40 rounded-full"
                            />
                          ))}
                        </div>
                      </div>

                      {/* Swara Sequence Strip */}
                      <div className="w-full max-w-2xl overflow-hidden">
                        <div className="flex gap-3 justify-center">
                          {composition.notes.slice(Math.max(0, currentNoteIndex - 3), currentNoteIndex + 5).map((note, idx) => {
                            const actualIdx = Math.max(0, currentNoteIndex - 3) + idx;
                            return (
                              <motion.div
                                key={actualIdx}
                                animate={{ 
                                  scale: actualIdx === currentNoteIndex ? 1.2 : 1,
                                  opacity: actualIdx === currentNoteIndex ? 1 : 0.4
                                }}
                                className={`w-14 h-14 rounded-xl border flex items-center justify-center text-lg font-bold transition-colors ${
                                  actualIdx === currentNoteIndex 
                                  ? 'bg-emerald-500 border-emerald-400 text-black' 
                                  : 'bg-zinc-800 border-white/5 text-zinc-400'
                                }`}
                              >
                                {note.swara}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Playback Controls */}
              <div className="mt-8 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button
                    onClick={isPlaying ? stopPlayback : playComposition}
                    disabled={!composition}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                      isPlaying 
                      ? 'bg-white text-black hover:bg-zinc-200' 
                      : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                    } disabled:bg-zinc-800 disabled:text-zinc-600`}
                  >
                    {isPlaying ? <Square className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                  </button>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-zinc-500" />
                      <div className="w-32 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="w-2/3 h-full bg-emerald-500" />
                      </div>
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Monitor Level</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Current Position</p>
                    <p className="text-xl font-mono text-zinc-300">
                      {currentNoteIndex >= 0 ? (currentNoteIndex + 1).toString().padStart(2, '0') : "00"}
                      <span className="text-zinc-600 mx-1">/</span>
                      {composition ? composition.notes.length.toString().padStart(2, '0') : "00"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Composition Details & Explanation */}
          {composition && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ChevronRight className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Musical Analysis</h3>
                </div>
                <div className="prose prose-invert prose-sm max-w-none text-zinc-400">
                  <Markdown>{composition.explanation}</Markdown>
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ChevronRight className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Swara Notation</h3>
                </div>
                <div className="bg-black/40 rounded-xl p-4 font-mono text-sm text-emerald-500/80 leading-loose break-all">
                  {composition.notes.map((n, i) => (
                    <span key={i} className={i === currentNoteIndex ? 'text-white bg-emerald-500/20 px-1 rounded' : ''}>
                      {n.swara}{' '}
                    </span>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-400"
            >
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="border-t border-white/5 bg-black/40 backdrop-blur-md mt-12">
        <div className="max-w-7xl mx-auto px-6 h-10 flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              System Ready
            </span>
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
              Buffer: 0ms
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>v1.1.0-stable</span>
            <span className="text-zinc-700">|</span>
            <span>© 2026 RagaFlow AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

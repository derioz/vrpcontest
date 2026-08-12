/**
 * ElevenLabs Voice & Speech Synthesis Service
 * Provides realistic AI voice narration with ElevenLabs API support & fallback to Web Speech API.
 */

import { useState, useEffect } from 'react';

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  accent: string;
  description: string;
}

export const ELEVENLABS_VOICES: VoiceOption[] = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female', accent: 'American', description: 'Calm, clear & professional narrator' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Damon', gender: 'male', accent: 'American', description: 'Energetic contest host voice' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', accent: 'American', description: 'Warm & friendly storytelling voice' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male', accent: 'American', description: 'Deep, crisp & authoritative narrator' },
];

type VoiceStateListener = (state: { activeId: string | null; isPlaying: boolean }) => void;

class ElevenLabsVoiceManager {
  private activeId: string | null = null;
  private isPlaying: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private listeners: Set<VoiceStateListener> = new Set();
  private selectedVoiceId: string = ELEVENLABS_VOICES[0].id;

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener({ activeId: this.activeId, isPlaying: this.isPlaying });
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = { activeId: this.activeId, isPlaying: this.isPlaying };
    this.listeners.forEach(l => l(state));
  }

  public getSelectedVoiceId(): string {
    return this.selectedVoiceId;
  }

  public setSelectedVoiceId(voiceId: string) {
    this.selectedVoiceId = voiceId;
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.activeId = null;
    this.isPlaying = false;
    this.notify();
  }

  public async speakCategory(id: string, name: string, description: string, apiKey?: string) {
    // If clicking the currently playing card, toggle stop
    if (this.activeId === id && this.isPlaying) {
      this.stop();
      return;
    }

    // Stop any existing playback first
    this.stop();

    this.activeId = id;
    this.isPlaying = true;
    this.notify();

    const fullText = `Category: ${name}. ${description || 'No description provided.'}`;

    // If custom ElevenLabs API Key is available in env or passed
    const envApiKey = (import.meta as any).env?.VITE_ELEVENLABS_API_KEY || apiKey;

    if (envApiKey) {
      try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.selectedVoiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': envApiKey,
          },
          body: JSON.stringify({
            text: fullText,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          this.currentAudio = audio;
          
          audio.onended = () => {
            if (this.activeId === id) {
              this.activeId = null;
              this.isPlaying = false;
              this.notify();
            }
          };

          audio.onerror = () => {
            this.fallbackWebSpeech(id, fullText);
          };

          await audio.play();
          return;
        }
      } catch (err) {
        console.warn('ElevenLabs API request failed, falling back to WebSpeech API:', err);
      }
    }

    // High quality Web Speech API Fallback
    this.fallbackWebSpeech(id, fullText);
  }

  private fallbackWebSpeech(id: string, text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.activeId = null;
      this.isPlaying = false;
      this.notify();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    // Pick best natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Karen'))
    ) || voices.find(v => v.lang.startsWith('en'));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onend = () => {
      if (this.activeId === id) {
        this.activeId = null;
        this.isPlaying = false;
        this.notify();
      }
    };

    utterance.onerror = () => {
      if (this.activeId === id) {
        this.activeId = null;
        this.isPlaying = false;
        this.notify();
      }
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }
}

export const elevenLabsVoiceManager = new ElevenLabsVoiceManager();

export function useElevenLabsVoice() {
  const [state, setState] = useState<{ activeId: string | null; isPlaying: boolean }>({
    activeId: null,
    isPlaying: false,
  });

  useEffect(() => {
    return elevenLabsVoiceManager.subscribe(setState);
  }, []);

  return {
    activeId: state.activeId,
    isPlaying: state.isPlaying,
    speakCategory: (id: string, name: string, description: string) =>
      elevenLabsVoiceManager.speakCategory(id, name, description),
    stop: () => elevenLabsVoiceManager.stop(),
    voices: ELEVENLABS_VOICES,
    selectedVoiceId: elevenLabsVoiceManager.getSelectedVoiceId(),
    setSelectedVoiceId: (id: string) => elevenLabsVoiceManager.setSelectedVoiceId(id),
  };
}

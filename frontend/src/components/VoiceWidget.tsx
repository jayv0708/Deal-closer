import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, MicOff, Send } from 'lucide-react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  useVoiceAssistant,
  useLocalParticipant,
  BarVisualizer
} from '@livekit/components-react';
import { Track, MediaDeviceFailure } from 'livekit-client';
import '@livekit/components-styles';
import api from '../services/api';

interface VoiceWidgetProps {
  onClose: () => void;
}

export const VoiceWidget: React.FC<VoiceWidgetProps> = ({ onClose }) => {
  const [token, setToken] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const fetchToken = async () => {
    setError('');
    try {
      const res = await api.get('/voice/token');
      setToken(res.data.token);
      setUrl(res.data.ws_url);
    } catch (err: any) {
      console.error('Voice token request failed:', err);
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to connect to Voice Server.';
      setError(message);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 transform transition-all flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
            <h2 className="text-lg font-semibold tracking-wide">Priya — AI Sales Consultant</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 p-6 flex flex-col items-center justify-center bg-slate-50 min-h-[300px] overflow-y-auto">
          {error ? (
            <div className="flex flex-col items-center text-center gap-4">
              <p className="text-red-500 font-medium">{error}</p>
              <button
                onClick={fetchToken}
                className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Retry connection
              </button>
            </div>
          ) : !token ? (
            <div className="flex flex-col items-center text-indigo-600">
              <Loader2 className="w-10 h-10 animate-spin mb-4" />
              <p className="font-medium animate-pulse">Connecting to LiveKit Room...</p>
            </div>
          ) : (
            <LiveKitRoom
              token={token}
              serverUrl={url}
              connect={true}
              audio={true}
              onMediaDeviceFailure={(failure?: MediaDeviceFailure) => {
                // Surfaced inside the room UI — see MicStatus in VoiceAssistantUI.
                const kind = failure ?? 'unknown';
                console.warn('Media device failure:', kind);
                window.dispatchEvent(
                  new CustomEvent('priya-mic-failure', { detail: String(kind) })
                );
              }}
              className="w-full h-full flex flex-col items-center justify-center"
            >
              <VoiceAssistantUI />
              <RoomAudioRenderer />
            </LiveKitRoom>
          )}
        </div>
      </div>
    </div>
  );
};

const VoiceAssistantUI = () => {
  const { state, audioTrack } = useVoiceAssistant();
  const { localParticipant } = useLocalParticipant();
  // 'none' = no mic track published at all (permission denied / device missing)
  // 'muted' = published but disabled, 'on' = live
  const [micState, setMicState] = useState<'none' | 'muted' | 'on'>('none');
  const [mediaError, setMediaError] = useState<string>('');
  const [textMsg, setTextMsg] = useState('');
  const [sending, setSending] = useState(false);

  // Mic blocked in Chrome is remembered per-site — the ONLY reliable fix is
  // the user re-allowing it via the address-bar icon, so make that loud.
  useEffect(() => {
    const onFail = (e: Event) => {
      const kind = (e as CustomEvent).detail;
      setMediaError(
        kind === 'permission-denied'
          ? 'Microphone permission was DENIED. Click the lock/mic icon in the browser address bar, set Microphone to Allow, then reconnect.'
          : `Microphone problem (${kind}). Pick a working mic in your browser settings, then reconnect.`
      );
    };
    window.addEventListener('priya-mic-failure', onFail);
    return () => window.removeEventListener('priya-mic-failure', onFail);
  }, []);

  // Watch mic track state so the user always knows why it's quiet.
  useEffect(() => {
    if (!localParticipant) return;
    const check = () => {
      const pub = localParticipant.getTrackPublication(Track.Source.Microphone);
      if (!pub) setMicState('none');
      else setMicState(pub.isEnabled ? 'on' : 'muted');
    };
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, [localParticipant]);

  // Actively request the mic once on mount — this triggers the browser
  // permission prompt if it was never decided, and enables a muted mic.
  useEffect(() => {
    if (!localParticipant) return;
    localParticipant.setMicrophoneEnabled(true).catch((e) => {
      console.warn('setMicrophoneEnabled failed:', e);
    });
  }, [localParticipant]);

  const sendText = async () => {
    const msg = textMsg.trim();
    if (!msg || sending || !localParticipant) return;
    setSending(true);
    try {
      // Text streams on the 'lk.chat' topic — the agent's RoomIO registers a
      // handler for exactly this topic and feeds the text to the LLM.
      await localParticipant.sendText(msg, { topic: 'lk.chat' });
      setTextMsg('');
    } catch (e) {
      console.error('Failed to send text message:', e);
    } finally {
      setSending(false);
    }
  };

  const micError =
    mediaError ||
    (micState === 'none'
      ? 'No microphone connected to the room. Allow mic access in the browser prompt (or via the address-bar icon), then click the mic button below.'
      : micState === 'muted'
        ? 'Your mic is muted — click the mic button below to unmute, or type your message.'
        : '');

  return (
    <div className="flex flex-col items-center w-full space-y-4">
      <div className="h-28 w-full max-w-[200px] flex items-center justify-center bg-white rounded-xl shadow-inner border border-gray-100 p-4">
        <BarVisualizer
          state={state}
          barCount={7}
          trackRef={audioTrack}
          className="h-full w-full text-indigo-500"
        />
      </div>

      <div className="text-center">
        <p className="text-lg font-semibold tracking-wide text-indigo-700 capitalize">
          {state === 'connecting' ? 'Connecting...' : state}
        </p>
        <p className="text-xs text-gray-400 mt-1">Hinglish voice agent — Gemini Realtime</p>
      </div>

      {micError && (
        <div className="w-full bg-amber-50 border-l-4 border-amber-400 p-3 rounded">
          <p className="text-xs text-amber-800 flex items-center gap-2">
            <MicOff className="w-4 h-4 shrink-0" /> {micError}
          </p>
        </div>
      )}

      {/* Text fallback — talk with your fingers when the mic is blocked */}
      <div className="w-full flex items-center gap-2">
        <input
          type="text"
          value={textMsg}
          onChange={(e) => setTextMsg(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendText()}
          placeholder="Mic nahi chal raha? Type karo — Priya sunegi..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={sendText}
          disabled={!textMsg.trim() || sending}
          className="p-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          title="Send to Priya"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <VoiceAssistantControlBar />
    </div>
  );
};

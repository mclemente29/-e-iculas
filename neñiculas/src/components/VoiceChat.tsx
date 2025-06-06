import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { getPeer } from '../utils/peer';
import VolumeControl from './VolumeControl';
import type { DataConnection } from 'peerjs';

interface VoiceChatProps {
  isCreator: boolean;
  roomId: string;
}

interface MicStatusMessage {
  type: 'micStatus';
  isMuted: boolean;
  peerId: string;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ isCreator, roomId }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<any>(null);
  const dataConnectionsRef = useRef<DataConnection[]>([]);

  // Asegurarnos de que el audioRef esté inicializado
  useEffect(() => {
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.muted = false;
    audioRef.current = audio;
  }, []);

  useEffect(() => {
    const setupVoiceChat = async () => {
      try {
        const peer = getPeer();
        if (!peer) return;
        peerRef.current = peer;

        if (isCreator) {
          // El creador escucha las conexiones de voz y datos
          peer.on('connection', (conn) => {
            dataConnectionsRef.current.push(conn);
            
            conn.on('open', async () => {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                const call = peer.call(conn.peer, stream);
                call.on('stream', (remoteStream) => {
                  if (audioRef.current) {
                    audioRef.current.srcObject = remoteStream;
                    audioRef.current.play().catch(console.error);
                  }
                });
                setIsConnected(true);
              } catch (error) {
                console.error('Error accessing microphone:', error);
              }
            });

            // Limpiar la conexión cuando se cierre
            conn.on('close', () => {
              dataConnectionsRef.current = dataConnectionsRef.current.filter(c => c !== conn);
            });
          });
        } else {
          // El viewer se conecta al creador
          const conn = peer.connect(roomId);
          dataConnectionsRef.current.push(conn);
          
          conn.on('open', async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              streamRef.current = stream;
              const call = peer.call(roomId, stream);
              call.on('stream', (remoteStream) => {
                if (audioRef.current) {
                  audioRef.current.srcObject = remoteStream;
                  audioRef.current.play().catch(console.error);
                }
              });
              setIsConnected(true);
            } catch (error) {
              console.error('Error accessing microphone:', error);
            }
          });

          // Limpiar la conexión cuando se cierre
          conn.on('close', () => {
            dataConnectionsRef.current = dataConnectionsRef.current.filter(c => c !== conn);
          });
        }
      } catch (error) {
        console.error('Error setting up voice chat:', error);
      }
    };

    setupVoiceChat();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.srcObject = null;
      }
      // Limpiar todas las conexiones de datos
      dataConnectionsRef.current.forEach(conn => {
        if (conn.open) {
          conn.close();
        }
      });
      dataConnectionsRef.current = [];
    };
  }, [isCreator, roomId]);

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!isMuted);
        
        // Notificar a los otros usuarios sobre el cambio de estado del micrófono
        const message: MicStatusMessage = {
          type: 'micStatus',
          isMuted: !audioTrack.enabled,
          peerId: peerRef.current.id
        };

        // Enviar el mensaje a todas las conexiones de datos activas
        dataConnectionsRef.current.forEach(conn => {
          if (conn.open) {
            try {
              conn.send(message);
            } catch (error) {
              console.error('Error sending mic status:', error);
            }
          }
        });
      }
    }
  };

  return (
    <div className="fixed bottom-4 left-4 flex items-center gap-4">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleMute}
        className={`p-3 rounded-full shadow-lg ${
          isConnected
            ? isMuted
              ? 'bg-red-500 text-white'
              : 'bg-green-500 text-white'
            : 'bg-gray-500 text-white'
        }`}
        disabled={!isConnected}
        title={isMuted ? "Desactivar silencio" : "Silenciar micrófono"}
      >
        {isConnected ? (
          isMuted ? (
            <MicOff size={20} />
          ) : (
            <Mic size={20} />
          )
        ) : (
          <MicOff size={20} />
        )}
      </motion.button>
      {isConnected && audioRef.current && (
        <VolumeControl audioElement={audioRef.current} label="Chat de voz" />
      )}
    </div>
  );
};

export default VoiceChat; 
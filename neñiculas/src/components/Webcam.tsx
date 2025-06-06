import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Video, VideoOff } from 'lucide-react';
import { getPeer } from '../utils/peer';
import type { DataConnection } from 'peerjs';

interface WebcamProps {
  isCreator: boolean;
  roomId: string;
}

interface DeviceCheckMessage {
  type: 'checkLocalDevice' | 'isLocalDevice';
}

const isDeviceCheckMessage = (data: unknown): data is DeviceCheckMessage => {
  return typeof data === 'object' && data !== null && 'type' in data && 
    (data.type === 'checkLocalDevice' || data.type === 'isLocalDevice');
};

const Webcam: React.FC<WebcamProps> = ({ isCreator, roomId }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const peerRef = useRef<any>(null);
  const [isLocalDevice, setIsLocalDevice] = useState(false);
  const [isDeviceCheckComplete, setIsDeviceCheckComplete] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Función para limpiar los streams
  const cleanupStreams = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setHasRemoteStream(false);
  };

  // Effect to check if we're on the same device
  useEffect(() => {
    const checkLocalDevice = () => {
      const peer = getPeer();
      if (!peer) return;
      
      // Si somos el viewer, verificamos si el creator está en el mismo dispositivo
      if (!isCreator && roomId) {
        const conn = peer.connect(roomId);
        conn.on('open', () => {
          // Enviamos un mensaje para verificar si estamos en el mismo dispositivo
          conn.send({ type: 'checkLocalDevice' } as DeviceCheckMessage);
        });
      }

      // Si somos el creator, escuchamos el mensaje de verificación
      if (isCreator) {
        peer.on('connection', (conn) => {
          conn.on('data', (data: unknown) => {
            if (isDeviceCheckMessage(data) && data.type === 'checkLocalDevice') {
              // Respondemos que sí, estamos en el mismo dispositivo
              conn.send({ type: 'isLocalDevice' } as DeviceCheckMessage);
            }
          });
        });
      }

      // Escuchamos la respuesta
      peer.on('connection', (conn) => {
        conn.on('data', (data: unknown) => {
          if (isDeviceCheckMessage(data) && data.type === 'isLocalDevice') {
            setIsLocalDevice(true);
          }
          setIsDeviceCheckComplete(true);
        });
      });

      // Si no recibimos respuesta en 2 segundos, asumimos que no estamos en el mismo dispositivo
      setTimeout(() => {
        setIsDeviceCheckComplete(true);
      }, 2000);
    };

    checkLocalDevice();
  }, [isCreator, roomId]);

  // Effect to handle receiving remote streams
  useEffect(() => {
    const peer = getPeer();
    if (!peer) return;
    peerRef.current = peer;

    peer.on('call', (call) => {
      // Siempre respondemos con nuestro stream local si está activo
      if (streamRef.current) {
        call.answer(streamRef.current);
      } else {
        call.answer();
      }

      call.on('stream', (remoteStream) => {
        console.log('Received remote webcam stream');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.onloadedmetadata = () => {
            remoteVideoRef.current?.play().catch(console.error);
          };
          if (remoteVideoRef.current.readyState >= 2) {
            remoteVideoRef.current?.play().catch(console.error);
          }
          setHasRemoteStream(true);
        }
      });
    });

    return () => {
      setHasRemoteStream(false);
    };
  }, []);

  // Effect for the Creator to handle new connections
  useEffect(() => {
    const peer = peerRef.current;
    if (!peer || !isCreator) return;

    const handleNewConnection = (conn: DataConnection) => {
      console.log('New peer connected for webcam:', conn.peer);
      if (isEnabled && streamRef.current) {
        console.log('Calling new peer with webcam stream:', conn.peer);
        const call = peer.call(conn.peer, streamRef.current);
      }
    };

    peer.on('connection', handleNewConnection);

    return () => {
      peer.off('connection', handleNewConnection);
    };
  }, [isCreator, isEnabled]);

  // Effect for the Viewer to initiate a call
  useEffect(() => {
    const peer = peerRef.current;
    if (!peer || isCreator || !isEnabled || !roomId) return;

    const initiateCall = async () => {
      console.log('Viewer initiating webcam call to creator:', roomId);
      if (streamRef.current) {
        const call = peer.call(roomId, streamRef.current);
        console.log('Webcam call initiated to creator');
      } else {
        console.warn('Attempted to call creator without local stream');
      }
    };

    const timer = setTimeout(initiateCall, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [isCreator, isEnabled, roomId]);

  // Effect to get local webcam stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    const getLocalStream = async () => {
      if (isEnabled && !streamRef.current && !isInitializing) {
        setIsInitializing(true);
        try {
          // Primero limpiamos cualquier stream existente
          cleanupStreams();
          
          console.log('Attempting to get local webcam stream');
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: "user",
              frameRate: { ideal: 24 }
            },
            audio: false
          });
          
          streamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.onloadedmetadata = () => {
              localVideoRef.current?.play().catch(console.error);
            };
          }
          console.log('Local webcam stream obtained');

          // Si somos el viewer, intentamos llamar al creator inmediatamente
          if (!isCreator && roomId) {
            const peer = peerRef.current;
            if (peer) {
              const call = peer.call(roomId, stream);
              call.on('stream', (remoteStream: MediaStream) => {
                console.log('Received creator stream');
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.srcObject = remoteStream;
                  remoteVideoRef.current.onloadedmetadata = () => {
                    remoteVideoRef.current?.play().catch(console.error);
                  };
                  setHasRemoteStream(true);
                }
              });
            }
          }
        } catch (error) {
          console.error('Error getting local webcam stream:', error);
          setIsEnabled(false);
          cleanupStreams();
          
          // Esperar un momento antes de intentar con la configuración básica
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
            streamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
              localVideoRef.current.onloadedmetadata = () => {
                localVideoRef.current?.play().catch(console.error);
              };
            }
          } catch (retryError) {
            console.error('Error getting local webcam stream with basic config:', retryError);
            cleanupStreams();
          } finally {
            setIsInitializing(false);
          }
        }
      } else if (!isEnabled && streamRef.current) {
        console.log('Stopping local webcam stream');
        cleanupStreams();
      }
    };

    getLocalStream();

    return () => {
      cleanupStreams();
    };
  }, [isEnabled, isCreator, roomId]);

  const toggleWebcam = () => {
    if (isEnabled) {
      cleanupStreams();
    }
    setIsEnabled(!isEnabled);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleWebcam}
        className={`p-3 rounded-full shadow-lg ${
          isEnabled
            ? 'bg-green-500 text-white'
            : 'bg-gray-500 text-white'
        }`}
      >
        {isEnabled ? <Video size={20} /> : <VideoOff size={20} />}
      </motion.button>
      <div className="flex gap-4">
        {isEnabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-48 aspect-video rounded-lg overflow-hidden bg-black shadow-lg"
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          </motion.div>
        )}
        {hasRemoteStream && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-48 aspect-video rounded-lg overflow-hidden bg-black shadow-lg"
          >
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Webcam; 
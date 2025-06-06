import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { initializePeer, getPeer, shareScreen, callPeer } from '../utils/peer';
import { db } from '../utils/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import type { Peer, DataConnection } from 'peerjs';
import VolumeControl from '../components/VolumeControl';
import Webcam from '../components/Webcam';
import VoiceChat from '../components/VoiceChat';

interface Comment {
  id: string;
  roomId: string;
  text: string;
  timestamp: number;
  author: string;
}

const Room: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role');
  const isCreator = role === 'creator';
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null);

  useEffect(() => {
    const setupRoom = async () => {
      try {
        if (isCreator) {
          // We're the creator
          const peer = await initializePeer();
          setStreamStartTime(Date.now());

          // Listen for incoming connections
          const peerInstance = getPeer();
          if (peerInstance) {
            peerInstance.on('connection', (conn) => {
              console.log('Viewer connected');
              // Cuando un viewer se conecta, si ya estamos compartiendo pantalla, enviarle el stream
              if (isSharing && videoRef.current?.srcObject) {
                const call = peerInstance.call(conn.peer, videoRef.current.srcObject as MediaStream);
                call.on('stream', (stream: MediaStream) => {
                  if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                  }
                });
              }
            });

            // Listen for incoming calls
            peerInstance.on('call', (call) => {
              call.answer();
              call.on('stream', (stream: MediaStream) => {
                console.log('Received stream from host');
                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                  setIsSharing(true);
                  // Asegurarse de que el video se reproduzca una vez que los metadatos estén cargados
                  videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch(console.error);
                  };
                }
              });
            });
          }
        } else {
          // We're joining as a viewer
          const peerId = await initializePeer();
          const peerInstance = getPeer();
          if (peerInstance) {
            // Conectar al host usando el roomId
            const conn = peerInstance.connect(roomId!);
            conn.on('open', () => {
              console.log('Connected to host');
            });

            // Escuchar llamadas del host
            peerInstance.on('call', (call) => {
              call.answer();
              call.on('stream', (stream: MediaStream) => {
                console.log('Received stream from host');
                if (videoRef.current) {
                  videoRef.current.srcObject = stream;
                  setIsSharing(true);
                }
              });
            });
          }
        }

        // Set up comments listener
        const commentsQuery = query(
          collection(db, 'comments'),
          where('roomId', '==', roomId),
          orderBy('timestamp', 'asc')
        );

        const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
          const newComments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Comment[];
          setComments(newComments);
        });

        return () => {
          unsubscribe();
          const peerInstance = getPeer();
          if (peerInstance) {
            peerInstance.destroy();
          }
        };
      } catch (error) {
        console.error('Error setting up room:', error);
        navigate('/');
      }
    };

    setupRoom();
  }, [roomId, navigate, isSharing, isCreator]);

  const handleShareScreen = async () => {
    try {
      const stream = await shareScreen();
      setIsSharing(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Si somos el creador, enviar el stream a todos los conectados
      if (isCreator) {
        const peerInstance = getPeer();
        if (peerInstance) {
          // Obtener todas las conexiones activas
          const connections = Object.values(peerInstance.connections);
          connections.forEach(conns => {
            conns.forEach((conn: DataConnection) => {
              console.log('Sending stream to peer:', conn.peer);
              const call = peerInstance.call(conn.peer, stream);
              call.on('stream', (remoteStream: MediaStream) => {
                console.log('Stream sent successfully to peer:', conn.peer);
                // No necesitamos hacer nada con remoteStream aquí en el creador para mostrarlo en la pantalla del creador
                // La pantalla del creador ya está mostrando el stream local de shareScreen
              });
               call.on('error', (error) => {
                console.error('Error sending stream to peer:', conn.peer, error);
              });
            });
          });
        }
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
      setIsSharing(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !streamStartTime) return;

    try {
      await addDoc(collection(db, 'comments'), {
        roomId,
        text: comment,
        timestamp: Date.now() - streamStartTime,
        author: isCreator ? 'Creador' : 'Espectador'
      });
      setComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const formatTimestamp = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-netflix-black relative">
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
          <div className="w-full max-w-4xl mx-auto relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={false}
              className="w-full aspect-video rounded-xl shadow-2xl bg-black"
            />
            {isSharing && (
              <div className="absolute bottom-4 right-4">
                <VolumeControl audioElement={videoRef.current} label="Contenido" />
              </div>
            )}
          </div>

          <Webcam isCreator={isCreator} roomId={roomId!} />

          {isCreator && (
            <div className="text-center mt-4">
              <p className="text-netflix-light mb-2">Comparte este código con tu pareja:</p>
              <div className="flex items-center justify-center gap-2">
                <code className="bg-netflix-dark text-netflix-red px-4 py-2 rounded-lg font-mono text-xl">
                  {roomId}
                </code>
                <button
                  onClick={() => {
                    if (roomId) {
                      navigator.clipboard.writeText(roomId);
                    }
                  }}
                  className="btn-primary"
                >
                  📋 Copiar
                </button>
              </div>
            </div>
          )}

          {isCreator && !isSharing && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="btn-primary mt-4"
              onClick={handleShareScreen}
            >
              🎥 Compartir pantalla
            </motion.button>
          )}

          {!isCreator && !isSharing && (
            <div className="text-center text-netflix-light mt-4">
              Esperando a que el creador comparta su pantalla...
            </div>
          )}
        </div>
      </div>

      <VoiceChat isCreator={isCreator} roomId={roomId!} />

      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-4 right-4 bg-netflix-red text-white p-4 rounded-full shadow-lg"
        onClick={() => setShowComments(true)}
      >
        <MessageCircle size={24} />
      </motion.button>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-0 bg-netflix-dark bg-opacity-95 p-4"
          >
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-netflix-red">
                  Comentarios secretos
                </h2>
                <button
                  onClick={() => setShowComments(false)}
                  className="text-netflix-light hover:text-netflix-red"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleComment} className="mb-6">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Escribe un comentario secreto..."
                  className="input-field w-full mb-2"
                />
                <button type="submit" className="btn-primary w-full">
                  Enviar comentario
                </button>
              </form>

              <div className="space-y-4">
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-netflix-black p-4 rounded-xl"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-netflix-red font-semibold">
                        {comment.author}
                      </span>
                      <span className="text-netflix-gray text-sm">
                        {formatTimestamp(comment.timestamp)}
                      </span>
                    </div>
                    <p className="text-netflix-light">{comment.text}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Room; 
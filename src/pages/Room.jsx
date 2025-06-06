import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { initializePeer, getPeer, shareScreen, callPeer } from '../utils/peer';
import { db } from '../utils/firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [isHost, setIsHost] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [streamStartTime, setStreamStartTime] = useState(null);

  useEffect(() => {
    const setupRoom = async () => {
      try {
        const peer = getPeer();
        if (!peer) {
          // We're joining as a viewer
          await initializePeer();
          const stream = await shareScreen();
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } else {
          // We're the host
          setIsHost(true);
          setStreamStartTime(Date.now());
        }

        // Listen for incoming calls
        peer.on('call', (call) => {
          call.answer();
          call.on('stream', (stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          });
        });

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
          }));
          setComments(newComments);
        });

        return () => {
          unsubscribe();
          peer.destroy();
        };
      } catch (error) {
        console.error('Error setting up room:', error);
        navigate('/');
      }
    };

    setupRoom();
  }, [roomId, navigate]);

  const handleShareScreen = async () => {
    try {
      const stream = await shareScreen();
      setIsSharing(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    try {
      await addDoc(collection(db, 'comments'), {
        roomId,
        text: comment,
        timestamp: Date.now() - streamStartTime,
        author: isHost ? 'Host' : 'Viewer'
      });
      setComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const formatTimestamp = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-netflix-black relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-screen object-contain"
      />

      {isHost && !isSharing && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 btn-primary"
          onClick={handleShareScreen}
        >
          🎥 Compartir pantalla
        </motion.button>
      )}

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
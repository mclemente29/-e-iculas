import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { initializePeer } from '../utils/peer';

const Home = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const createRoom = async () => {
    try {
      setIsLoading(true);
      const id = await initializePeer();
      navigate(`/room/${id}`);
    } catch (error) {
      console.error('Error creating room:', error);
      setIsLoading(false);
    }
  };

  const joinRoom = () => {
    if (roomId.trim()) {
      navigate(`/room/${roomId}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-6xl font-bold text-netflix-red mb-8">
          Ñeñículas
        </h1>
        
        <div className="space-y-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={createRoom}
            disabled={isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? 'Creando sala...' : '🎥 Crear sala'}
          </motion.button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-netflix-gray"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-netflix-black text-netflix-gray">
                o
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Pega el código de la sala"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="input-field w-full"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={joinRoom}
              disabled={!roomId.trim()}
              className="btn-secondary w-full"
            >
              🍿 Unirse a sala
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Home; 
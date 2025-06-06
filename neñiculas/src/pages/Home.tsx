import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { initializePeer } from '../utils/peer';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      const peerId = await initializePeer();
      navigate(`/room/${peerId}?role=creator`);
    } catch (error) {
      console.error('Error creating room:', error);
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      navigate(`/room/${roomCode.trim()}?role=viewer`);
    }
  };

  return (
    <div className="min-h-screen bg-netflix-black flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-netflix-red mb-2">Ñeñículas</h1>
          <p className="text-netflix-light">Mira películas con tu pareja a distancia</p>
        </motion.div>

        <div className="space-y-4">
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary w-full"
            onClick={handleCreateRoom}
            disabled={isCreating}
          >
            {isCreating ? 'Creando sala...' : '🎬 Crear sala'}
          </motion.button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-netflix-gray"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-netflix-black text-netflix-gray">o</span>
            </div>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-4">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="Código de la sala"
              className="input-field w-full"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="btn-secondary w-full"
              disabled={!roomCode.trim()}
            >
              🎥 Unirse a sala
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Home; 
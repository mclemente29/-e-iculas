import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';

interface VolumeControlProps {
  audioElement: HTMLAudioElement | HTMLVideoElement | null;
  label: string;
}

const VolumeControl: React.FC<VolumeControlProps> = ({ audioElement, label }) => {
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showSlider, setShowSlider] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Inicializar el volumen cuando se monta el componente
  useEffect(() => {
    if (audioElement) {
      // Asegurarse de que el elemento de audio no esté silenciado por defecto
      audioElement.muted = false;
      audioElement.volume = volume;
    }
  }, [audioElement]);

  // Actualizar el volumen cuando cambia el estado
  useEffect(() => {
    if (audioElement) {
      try {
        audioElement.volume = volume;
        audioElement.muted = isMuted;
      } catch (error) {
        console.error('Error al ajustar el volumen:', error);
      }
    }
  }, [volume, isMuted, audioElement]);

  // Manejar clics fuera del slider para cerrarlo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sliderRef.current && !sliderRef.current.contains(event.target as Node)) {
        setShowSlider(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-netflix-light text-sm">{label}</span>
      <div className="relative" ref={sliderRef}>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleMute}
          onMouseEnter={() => setShowSlider(true)}
          className={`p-2 rounded-full ${
            isMuted ? 'bg-red-500' : 'bg-netflix-red'
          } text-white`}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </motion.button>
        
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: showSlider ? 1 : 0, x: showSlider ? 0 : -10 }}
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-netflix-dark p-2 rounded-lg shadow-lg z-50"
          onMouseEnter={() => setShowSlider(true)}
          onMouseLeave={() => setShowSlider(false)}
        >
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 accent-netflix-red"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default VolumeControl; 
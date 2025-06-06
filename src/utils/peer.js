import Peer from 'peerjs';

let peer = null;

export const initializePeer = () => {
  peer = new Peer();
  return new Promise((resolve, reject) => {
    peer.on('open', (id) => {
      resolve(id);
    });
    peer.on('error', (err) => {
      reject(err);
    });
  });
};

export const getPeer = () => peer;

export const shareScreen = async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "browser" },
      audio: true
    });
    return stream;
  } catch (error) {
    console.error('Error sharing screen:', error);
    throw error;
  }
};

export const connectToPeer = (peerId) => {
  return peer.connect(peerId);
};

export const callPeer = (peerId, stream) => {
  return peer.call(peerId, stream);
}; 
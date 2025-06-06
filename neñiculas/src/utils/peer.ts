import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

let peer: Peer | null = null;

export const initializePeer = async (): Promise<string> => {
  if (!peer) {
    peer = new Peer();
    return new Promise((resolve, reject) => {
      peer!.on('open', (id) => {
        resolve(id);
      });
      peer!.on('error', (err) => {
        reject(err);
      });
    });
  }
  return peer.id;
};

export const getPeer = (): Peer | null => {
  return peer;
};

export const shareScreen = async (): Promise<MediaStream> => {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });
  } catch (error) {
    console.error('Error sharing screen:', error);
    throw error;
  }
};

export const connectToPeer = (peerId: string): DataConnection => {
  if (!peer) {
    throw new Error('Peer not initialized');
  }
  return peer.connect(peerId);
};

export const callPeer = (peerId: string, stream: MediaStream) => {
  if (!peer) {
    throw new Error('Peer not initialized');
  }
  return peer.call(peerId, stream);
}; 
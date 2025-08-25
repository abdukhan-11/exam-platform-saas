import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    socketInstance = io(baseUrl, {
      transports: ['websocket'],
      autoConnect: true,
      withCredentials: true,
    });
  }
  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}



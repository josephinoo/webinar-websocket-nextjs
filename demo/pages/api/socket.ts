import { Server as NetServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse & { socket: any }) {
  if (!res.socket.server.io) {
    console.log('Iniciando servidor de WebSockets (Socket.io)...');
    const httpServer: NetServer = res.socket.server as any;
    const io = new ServerIO(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('Usuario conectado:', socket.id);

    
      socket.on('enviar-mensaje', (texto) => {
        // Enviar el mensaje a todos los clientes (incluyendo al que lo envió)
        io.emit('mensaje-nuevo', {
          id: Date.now().toString(),
          texto: texto,
          senderId: socket.id, // Para identificar si el mensaje es mío o de otra persona
        });
      });

      socket.on('escribiendo', (isTyping) => {
        socket.broadcast.emit('usuario-escribiendo', {
          senderId: socket.id,
          isTyping,
        });
      });

      socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
      });
    });
  }
  res.end();
}

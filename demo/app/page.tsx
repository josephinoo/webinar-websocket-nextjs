'use client';

import { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface Mensaje {
  id: string;
  texto: string;
  senderId: string;
}

let socket: Socket;

export default function Home() {
  const [mensaje, setMensaje] = useState('');
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [conectado, setConectado] = useState(false);
  const [escribiendo, setEscribiendo] = useState<boolean>(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Inicializar el servidor de WebSockets primero
    fetch('/api/socket').finally(() => {
      socket = io({
        path: '/api/socket',
      });

      socket.on('connect', () => {
        setConectado(true);
      });

      // Escuchar el evento de nuevo mensaje
      socket.on('mensaje-nuevo', (msg: Mensaje) => {
        setMensajes((prev) => [...prev, msg]);
        setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      });

      // Escuchar evento de alguien escribiendo
      socket.on('usuario-escribiendo', (data: { senderId: string; isTyping: boolean }) => {
        if (data.isTyping) {
          setEscribiendo(true);
        } else {
          setEscribiendo(false);
        }
      });

      socket.on('disconnect', () => {
        setConectado(false);
      });
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const enviarMensaje = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!mensaje.trim()) return;

    // Disparar evento de enviar mensaje 
    socket.emit('enviar-mensaje', mensaje);
    setMensaje('');

    // Detener "escribiendo"
    socket.emit('escribiendo', false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const manejarCambio = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMensaje(e.target.value);
    
    // Al escribir, emitir evento de typing
    socket.emit('escribiendo', true);
    
    // Detener typing event si deja de escribir por 2 segundos
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('escribiendo', false);
    }, 2000);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#0d0d0d] text-white selection:bg-[#25D366] selection:text-white pb-6 pt-6 font-sans">
      <div className="w-full max-w-md h-[90vh] bg-[#1a1a1a] flex flex-col rounded-2xl shadow-[0_0_40px_rgba(37,211,102,0.1)] overflow-hidden border border-[#2a3942]">
        {/* Header */}
        <div className="bg-[#1f2c34] px-4 py-3 flex items-center shadow-md z-10 transition-colors">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#128C7E] to-[#25D366] flex items-center justify-center font-bold text-lg mr-3 shadow-inner">
            W
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-base leading-tight tracking-wide text-[#e9edef]">Webinar Chat</h1>
            <p className="text-[13px] text-[#8696a0] flex items-center">
              {conectado ? (
                <>
                  <span className="text-[#25D366] text-[10px] mr-1 animate-pulse">●</span> En línea
                </>
              ) : (
                <>
                  <span className="text-red-500 text-[10px] mr-1">●</span> Conectando...
                </>
              )}
            </p>
          </div>
        </div>

        {/* Chat Area */}
        <div 
          className="flex-1 overflow-y-auto p-4 flex flex-col space-y-3 relative bg-[url('https://wallpapers.com/images/hd/whatsapp-chat-dark-background-9kuf1752xddo5f4j.jpg')] bg-opacity-20 bg-cover bg-center"
        >
          {/* Overlay for better readability */}
          <div className="absolute inset-0 bg-[#0d1418] opacity-80 z-0 pointer-events-none"></div>

          {mensajes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center z-10">
              <span className="bg-[#1f2c34]/90 text-[#8696a0] px-4 py-2 rounded-xl text-sm shadow-lg backdrop-blur text-center max-w-[80%] border border-[#2a3942]">
                Abre otra pestaña para probar el chat.<br/>¡Envía un mensaje!
              </span>
            </div>
          ) : (
            mensajes.map((msg, index) => {
              const soyYo = msg.senderId === socket?.id;
              
              return (
                <div
                  key={msg.id + index}
                  className={`flex z-10 ${soyYo ? 'justify-end' : 'justify-start'} mb-1`}
                >
                  <div
                    className={`max-w-[80%] px-3.5 py-2 text-[15px] shadow-sm relative ${
                      soyYo
                        ? 'bg-[#005c4b] text-[#e9edef] rounded-xl rounded-tr-[4px]'
                        : 'bg-[#202c33] text-[#e9edef] rounded-xl rounded-tl-[4px]'
                    } transition-all origin-bottom-right hover:shadow-md`}
                  >
                    {!soyYo && (
                      <span className="text-[12px] text-[#25D366] font-semibold mb-0.5 block tracking-wide">
                        Participante
                      </span>
                    )}
                    <span className="leading-snug break-words">{msg.texto}</span>
                    <span className="text-[10px] text-white/50 float-right mt-1.5 ml-3 font-semibold">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Escribiendo Indicador */}
          {escribiendo && (
            <div className="flex justify-start z-10 mt-1 mb-2 animate-pulse">
              <div className="bg-[#202c33] px-3.5 py-2.5 rounded-xl rounded-tl-[4px] shadow-sm flex items-center space-x-1 border border-[#2a3942]/50">
                <span className="text-[#25D366] text-xs font-semibold mr-1">Tipeando</span>
                <div className="flex space-x-1.5">
                  <div className="w-1.5 h-1.5 bg-[#8696a0] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-[#8696a0] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-[#8696a0] rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} className="z-10 bg-transparent h-[1px] w-full" />
        </div>

        {/* Input Area */}
        <div className="bg-[#202c33] px-3 py-3 flex items-center space-x-2 z-10 pb-4 md:pb-3">
          <form 
            className="flex-1 flex bg-[#2a3942] rounded-full overflow-hidden items-center px-1 py-1 pr-2 transition-all border border-transparent focus-within:border-[#25D366]/30 shadow-inner" 
            onSubmit={enviarMensaje}
          >
            <div className="pl-3 pr-2 text-[#8696a0] hover:text-[#e9edef] transition-colors cursor-pointer">
              <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24">
                <path fill="currentColor" d="M9.153,11.603c0.795,0,1.439-0.879,1.439-1.962S9.948,7.679,9.153,7.679 S7.714,8.558,7.714,9.641S8.358,11.603,9.153,11.603z M5.949,12.965c-0.026-0.307-0.131,5.218,6.063,5.551 c6.066-0.25,6.066-5.551,6.066-5.551C12,14.381,5.949,12.965,5.949,12.965z M17.312,11.452c-0.799,0-1.439,0.879-1.439,1.962 s0.64,1.962,1.439,1.962s1.439-0.879,1.439-1.962S18.111,11.452,17.312,11.452z M12,0C5.373,0,0,5.373,0,12s5.373,12,12,12s12-5.373,12-12S18.627,0,12,0z M12,22.467c-5.783,0-10.467-4.684-10.467-10.467S6.217,1.533,12,1.533s10.467,4.684,10.467,10.467S17.783,22.467,12,22.467z"></path>
              </svg>
            </div>
            <input
              type="text"
              className="flex-1 bg-transparent border-none outline-none text-[#e9edef] placeholder-[#8696a0] px-2 py-2 text-[15px]"
              placeholder="Mensaje"
              value={mensaje}
              onChange={manejarCambio}
              autoComplete="off"
            />
          </form>
          <button
            onClick={enviarMensaje}
            disabled={!mensaje.trim()}
            className={`w-[46px] h-[46px] rounded-full flex justify-center items-center transition-all flex-shrink-0 ${
              mensaje.trim() 
                ? 'bg-[#00a884] text-white shadow-lg hover:bg-[#008f6f] scale-100' 
                : 'bg-transparent text-[#8696a0] scale-95 opacity-80'
            }`}
          >
            <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" version="1.1" className={`transform transition-transform ${mensaje.trim() ? 'translate-x-[2px]' : ''}`}>
               <path fill="currentColor" d="M1.101,21.757L23.8,12.028L1.101,2.3l0.011,7.912l13.623,1.816L1.112,13.845 L1.101,21.757z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

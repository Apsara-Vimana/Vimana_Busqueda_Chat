"use client";

import { useState } from "react";
import Image from "next/image";

interface Message {
  id: string;
  sender: "user" | "agente" | "humano";
  text: string;
  image?: string;
  links?: Array<[string, string]>;
}

export default function ApsaraChat() {
  const [showCover, setShowCover] = useState(true);
  const [chatMode, setChatMode] = useState<"agent" | "human">("agent");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "agente",
      text: "Om Sai Ram. Bienvenido a Apsara Vimana. ¿En qué puedo ayudarte hoy?",
      image: "/logo.png",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleStartTyping = () => {
    if (showCover) setShowCover(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    handleStartTyping();

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentQuery = input;
    setInput("");

    if (chatMode === "agent") {
      setLoading(true);
      try {
        const res = await fetch("/api/engine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: currentQuery }),
        });
        const data = await res.json();

        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: "agente",
          text: data.reply || "No pude procesar la consulta en este momento.",
          image: data.image || "/logo.png",
          links: data.links || [],
        };
        setMessages((prev) => [...prev, agentMessage]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "agente",
            text: "Error de conexión con el agente local.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    } else {
      // Modo Persona Física (Operador Humano)
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "humano",
            text: "Tu mensaje ha sido enviado al equipo humano. Te responderemos a la brevedad.",
          },
        ]);
      }, 600);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-900 text-slate-100 font-sans">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-950 px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-yellow-500 shadow-md">
            <Image src="/logo.png" alt="Vimana Logo" fill className="object-cover" />
          </div>
          <span className="font-bold text-lg tracking-wider text-yellow-400">
            APSARA VIMANA
          </span>
        </div>

        {/* Doble Botón: Agente Local vs Persona Física */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setChatMode("agent")}
            className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
              chatMode === "agent"
                ? "bg-yellow-500 text-slate-950 font-bold shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🤖 Agente IA (Local)
          </button>
          <button
            onClick={() => setChatMode("human")}
            className={`px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
              chatMode === "human"
                ? "bg-emerald-600 text-white font-bold shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            👤 Persona Física
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="relative flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {/* Portada Flotante Interactiva */}
        {showCover && (
          <div
            onClick={() => setShowCover(false)}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md transition-all duration-700 cursor-pointer p-4"
          >
            <div className="relative w-72 h-72 md:w-96 md:h-96 rounded-2xl overflow-hidden shadow-2xl border-4 border-yellow-500/80">
              <Image
                src="/avatar.jpg"
                alt="Apsara Portada"
                fill
                className="object-cover"
                priority
              />
            </div>
            <h1 className="mt-6 text-yellow-400 text-2xl md:text-3xl font-extrabold tracking-widest drop-shadow-lg">
              APSARA VIMANA
            </h1>
            <p className="mt-2 text-slate-300 text-sm md:text-base font-medium text-center">
              Haz clic aquí o comienza a escribir para iniciar la conversación
            </p>
          </div>
        )}

        {/* Lista de Mensajes */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.sender !== "user" && (
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-yellow-500 shrink-0">
                <Image
                  src={msg.image || "/logo.png"}
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div
              className={`max-w-[80%] md:max-w-[60%] p-3.5 rounded-2xl text-sm md:text-base leading-relaxed ${
                msg.sender === "user"
                  ? "bg-yellow-500 text-slate-950 font-medium rounded-br-none"
                  : msg.sender === "humano"
                  ? "bg-emerald-900/80 text-emerald-100 border border-emerald-700 rounded-bl-none"
                  : "bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none"
              }`}
            >
              <p>{msg.text}</p>
              {msg.links && msg.links.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex flex-wrap gap-2">
                  {msg.links.map(([title, url], idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-yellow-400 hover:underline bg-slate-900/60 px-2 py-1 rounded border border-yellow-500/30"
                    >
                      🔗 {title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm italic">
            <span className="animate-pulse">Consultando sabiduría de Apsara Vimana...</span>
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      <footer className="p-4 bg-slate-950 border-t border-slate-800">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={input}
            onFocus={handleStartTyping}
            onChange={(e) => {
              setInput(e.target.value);
              handleStartTyping();
            }}
            placeholder={
              chatMode === "agent"
                ? "Escribe tu consulta para Apsara (IA Local)..."
                : "Escribe tu mensaje para el equipo humano..."
            }
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm md:text-base focus:outline-none focus:border-yellow-500 text-slate-100 placeholder-slate-500"
          />
          <button
            type="submit"
            className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-5 py-3 rounded-xl transition-all shadow-md shrink-0"
          >
            Enviar
          </button>
        </form>
      </footer>
    </div>
  );
}
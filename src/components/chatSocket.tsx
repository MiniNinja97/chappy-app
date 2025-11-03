import { io } from "socket.io-client";
import { useEffect, useState } from "react";
import "./chat.css"; // din CSS-fil

// Skapa socket
const socket = io("http://localhost:1337", {
  withCredentials: true,
  transports: ["websocket"],
});

export default function Chat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      console.log("Ansluten till servern:", socket.id);
    });

    socket.on("chat message", (msg: string) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("chat message");
      socket.disconnect();
    };
  }, []);

  // för formuläret
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!input.trim()) return;

    socket.emit("chat message", input);
    setInput("");
  }

  //för input-fältet
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
  }

  return (
    <div className="chat-container">
      <h1>Chat</h1>

      <ul className="chat-messages">
        {messages.map((m, i) => (
          <li key={i} className="chat-message">
            {m}
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="chat-form">
        <input
          value={input}
          onChange={handleChange}
          placeholder="Skriv ett meddelande..."
          className="chat-input"
        />
        <button type="submit" className="chat-button">
          Skicka
        </button>
      </form>
    </div>
  );
}




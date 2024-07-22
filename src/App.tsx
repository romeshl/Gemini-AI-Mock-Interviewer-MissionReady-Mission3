import { useState, useEffect, useRef } from "react";
import { FaPaperPlane } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import "./App.css";

import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: "You are a mock interviewer for the position of web developer.and give feedback.",
 });

const chat = model.startChat({
  history: [], // Start with an empty history
  generationConfig: {
    maxOutputTokens: 500,
  },
});

function App() {

  type Message = {
    text: string;
    user: boolean;
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);



  useEffect(() => {
    const element = containerRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [input]);

  const handleSendMessage = async () => {
    if (input.trim()) {
      const newMessages = [...messages, { text: input, user: true }];
      setMessages(newMessages);
      setInput("");
      try {
        setLoading(true);
        const result = await chat.sendMessage(input);
        const response = await result.response;
        const text = await response.text();
        console.log("AI: ", text);
        setLoading(false);
        setMessages([...newMessages, { text: text, user: false }]);

        console.log(chat.getHistory());
      } catch (error) {
        console.error("Error sending message:", error);
        setLoading(false);
        setMessages([
          ...newMessages,
          { text: "Error: Could not get response from AI", user: false },
        ]);
      }
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-r from-blue-500 to-blue-900">
      <h1 className="mb-8 font-bold text-[2rem] drop-shadow-lg text-blue-50">
        Gemini AI - Mock Interviewer
      </h1>
      <div className="bg-white w-full max-w-lg shadow-lg rounded-lg overflow-hidden">
        <div className="mt-1 p-4 h-96 overflow-y-scroll" ref={containerRef}>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.user ? "justify-end" : "justify-start"
                } mb-2`}
            >
              <div
                className={`rounded-lg p-2 shadow-md overflow-x-hidden flex flex-wrap ${msg.user ? "bg-blue-500 text-white" : "bg-gray-200"
                  }`}
              >
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && <div className={"loader"}></div>}
        </div>
        <div className="p-4 border-t border-gray-200 flex">
          <input
            type="text"
            className="flex-1 p-2 border border-gray-300 rounded-lg outline-none"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <button
            className="ml-2 bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-all"
            onClick={handleSendMessage}
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

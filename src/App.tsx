import { useState, useEffect, useRef } from "react";
import { FaPaperPlane } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import "./App.css";

const NUMBER_OF_QUESTIONS = 2; // Holds the number of questions to be asked from the interviewee

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY); // Initialize Google Generative AI with API key from environment variables

// Configure the generative AI model with specific instructions
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction:
    "You are an interviewer for a job position. " +
    " First input of the user must be the job role. If it's anything else output 'Ending interview. Please try again with a job title.'" +
    "Greet and ask their name and background" +
    "Proceed to ask the candidate " +
    NUMBER_OF_QUESTIONS +
    " questions, one at a time, without labeling them as 'question 1', 'question 2', etc. " +
    "If a question is not answered appropriately, ask it again. " +
    "Provide feedback on the quality of answers and areas for improvement. " +
    "Conclude the interview with 'Best of luck' and the candidate's name.",
});

// Start a chat session with the generative AI model
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

    // State hooks for managing messages, input, loading state, interview start, and job title
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [startInterview, setStartInterview] = useState<boolean>(false);
    const [jobTitle, setJobTitle] = useState<string>("");

    // Refs for container and job title input field
    const containerRef = useRef<HTMLDivElement | null>(null);
    const JobTitleRef = useRef<HTMLInputElement | null>(null);

    // Focus the job title input field when the component mounts
    useEffect(() => {
        JobTitleRef.current?.focus();
    }, []);

    // Scroll to the bottom of the container whenever input changes
    useEffect(() => {
        const element = containerRef.current;
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    }, [input]);

    // Begin the interview process
    async function beginInterview(): Promise<void> {
        if (!jobTitle.trim()) { // Exit if the job title is empty
            JobTitleRef.current?.focus();
            return;
        }
        setMessages([]); // Clear the user and AI response message list
        setStartInterview(true); // starts the interview
        setLoading(true); // Show loading animation
        const AIResponse = await getAIResponse(jobTitle); // Get the AI's response
        setMessages((messages) => [ // Add the AI's response to the messages array
            ...messages,
            { text: AIResponse, user: false },
        ]);
        setLoading(false); // Stop loading animation
        handleAIErrors(AIResponse); // Handle specific AI errors
    }

    // Handle sending user messages and receiving AI responses
    const handleSendMessage = async () => {
        if (input.trim()) {
          // Check if the input is not empty
          setMessages((messages) => [
            // Add the user's message to the state
            ...messages,
            { text: input, user: true },
          ]);
          setInput(""); // Clear the input field and set loading to true
          setLoading(true); // Show loading animation
          const AIResponse = await getAIResponse(input); // Get the AI's response
          setMessages((messages) => [
            // Add the AI's message to the state using the latest state
            ...messages,
            { text: AIResponse, user: false },
          ]);
          setLoading(false); // Stop loading animation
          handleAIErrors(AIResponse); // Handle specific AI errors
        }
    };

    // Handle specific AI error messages
    function handleAIErrors(error: string) {
        if (
            error.includes("Ending interview") ||
            error.includes("Best of luck") ||
            error.includes("Error")
        ) {
            setStartInterview(false); // End the interview
            JobTitleRef.current!.value = ""; // Clear the job title input field
            setJobTitle(""); // Clear the job title state
            JobTitleRef.current?.focus(); // Focus the job title input field
        }
    }

    // Function to get AI response for a given input
    async function getAIResponse(chatInput: string): Promise<string> {
        try {
            const result = await chat.sendMessage(chatInput); // Send the message to the AI model
            const response = result.response; // Get the response from the AI model
            const text = response.text(); // Get the text from the response
            return text; // Return the text
        } catch (error) {
            console.error("Error sending message:", error);
            return "Error: unable to get a response from AI."; // Return an error message
        }
    }

    return (
        <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-r from-blue-500 to-blue-900">
            <h1 className="mb-5 font-bold text-[2rem] text-blue-50 [text-shadow:_3px_3px_0_rgb(0_0_0_/_20%)]">
                Gemini AI - Mock Interviewer
            </h1>
            <div className="flex mb-3 p-4 bg-blue-50 rounded-lg w-[512px] gap-2 shadow-gray-700 shadow-md items-center">
                <h2 className="font-bold text-blue-800">Job Title: </h2>
                <input
                    className="bg-white border border-gray-300 rounded-md w-[400px] p-1
          focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-transparent"
                    type="text"
                    placeholder="Enter job title"
                    onChange={(e) => setJobTitle(e.target.value)}
                    ref={JobTitleRef}
                    onKeyDown={(e) => e.key === "Enter" && beginInterview()}
                />
            </div>

            <div className="bg-white w-full max-w-lg rounded-lg overflow-hidden shadow-gray-700 shadow-lg">
                <div
                    className="mt-1 p-4 h-96 overflow-y-scroll"
                    ref={containerRef}
                >
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${
                                msg.user ? "justify-end" : "justify-start"
                            } mb-2`}
                        >
                            <div
                                className={`rounded-lg p-2 shadow-md overflow-x-hidden flex flex-wrap ${
                                    msg.user
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-200"
                                }`}
                            >
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                            </div>
                        </div>
                    ))}
                    {loading && <div className={"loader"}></div>}
                </div>
                {!startInterview ? (
                    <div className="flex justify-center p-4 border-t border-gray-200 bg-blue-50">
                        <button
                            className="p-2 border border-blue-500 w-[200px] rounded-lg bg-blue-500 text-white font-bold shadow-sm shadow-gray-700
        active:bg-blue-300 active:border-blue-300 active:shadow-gray-100 active:shadow-md active:text-blue-700
        hover:bg-blue-700"
                            onClick={beginInterview}
                        >
                            Start Interview
                        </button>
                    </div>
                ) : (
                    <div className="bg-blue-50 p-4 border-t border-gray-200 flex">
                        <input
                            type="text"
                            className="flex-1 p-2 border border-gray-300 rounded-lg outline-none"
                            placeholder="Type your message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === "Enter" && handleSendMessage()
                            }
                            autoFocus
                            readOnly={loading}
                        />
                        <button
                            className="ml-2 bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-all"
                            onClick={handleSendMessage}
                        >
                            <FaPaperPlane />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;

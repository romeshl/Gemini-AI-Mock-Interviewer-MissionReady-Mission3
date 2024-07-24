import { useState, useEffect, useRef, useReducer } from "react";
import { FaPaperPlane } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import "./App.css";

// Holds the number of questions to be asked from the interviewee
const NUMBER_OF_QUESTIONS = 2;

// Import the Google Generative AI library
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google Generative AI with API key from environment variables
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_API_KEY);

// Configure the generative AI model with specific system instructions
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: {
    role: "Interviewer",
    parts: [
      { text: "Job role will be entered in the first user input" },
      {
        text:
          "ignore the greetings. if the first input is not a valid job role," +
          " send a message to the user and say 'Ending interview. Try again with a valid job title.'.",
      },
      {
        text: "start by welcoming to the interview and asking the user's name and his background.",
      },
      {
        text:
          "ask " + NUMBER_OF_QUESTIONS + " questions. one question at a time.",
      },
      { text: "don't mark the question like 'question 1' etc." },
      {
        text: "if the user doesn't answer the questions accordingly, ask the question again.",
      },
      {
        text: "provide feedback about quality of the answers and where user can improve himself on.",
      },
      { text: "end with 'Best of luck' and the name of the user." },
    ],
  },
});

// Start a chat session with the generative AI model
const chat = model.startChat({
  history: [], // Start with an empty history
  generationConfig: {
    maxOutputTokens: 500,
  },
});


// Main App component
function App() {
  interface Data {
    text: string;
    user: boolean;
  }
  
  const [messages, setMessages] = useState<Data[]>([]);

  // input: The current input message from the user
  const [input, setInput] = useState<string>("");
  // loading: Boolean to indicate if the AI is processing the input
  const [loading, setLoading] = useState<boolean>(false);
  // startInterview: Boolean to indicate if the interview has started
  const [startInterview, setStartInterview] = useState<boolean>(false);
  // jobTitle: The job title entered by the user
  const [jobTitle, setJobTitle] = useState<string>("");
  const [messageQueueLength, setMessageQueueLength] = useState<number>(0);

  // Refs for the container for holding user and AI messages
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Ref for the job title input field
  const JobTitleRef = useRef<HTMLInputElement | null>(null);

  // Focus the job title input field when the component mounts
  useEffect(() => {
    JobTitleRef.current?.focus();
  }, []);

  useEffect(() => {
    console.log(messages.length);
    //   messageQueueLengthRef.current = state.length;
    setMessageQueueLength(messages.length);
  }, [messages]);

  // Scroll to the bottom of the container whenever input changes
  useEffect(() => {
    const element = containerRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [input]);

  // Begin the interview process
  const beginInterview = async () => {
    if (!jobTitle.trim()) {
      JobTitleRef.current?.focus();
      return;
    }
    setMessages([]);
    setStartInterview(true); // Set the interview to started
    setLoading(true);
    setMessageQueueLength(0);

    const AIResponse = await getAIResponse(jobTitle);
    setLoading(false);
    // Handle any errors in the AI response
    handleAIErrors(AIResponse);
  };

  // Handle sending user messages and receiving AI responses
  const handleSendMessage = async () => {
    // Check if the user input is empty
    if (!input.trim()) {
      return;
    }
    // Add the user's message to the messages list
    // const newItem = Map({ input: input, user: true });
    // setMessages((prevItems) => prevItems.push(newItem));

    setMessages((messages) => { return [...messages, { text: input, user: true }]; });

    setInput(""); // Clear the input field
    setLoading(true);
    // Get the AI response for the user input
    const AIResponse = await getAIResponse(input);
    setLoading(false);
    handleAIErrors(AIResponse);
  };

  // Function to get AI response for a given input
  async function getAIResponse(chatInput: string): Promise<string> {
    try {
      // Send the user input to the AI model
      const result = await chat.sendMessageStream(chatInput);
      // placeholder for the AI response
      let text: string = "";
      // this checks to see if it's the first time message list being updated
      let firstTime = true;
      // get the current length of the messages list to determine the index of the new message

      // Iterate over the stream of responses
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        text += chunkText;
        if (firstTime) {
          setMessages((messages) => {
            return [...messages, { text: text, user: false }];
          });
          firstTime = false;
        }
        if (messageQueueLength === 0) {
          console.log("Second time");
          //updateItem(0, { text: text, user: false });
          setMessages((messages) => {
            return messages.map((item, index) =>
              index === 0 ? { text: text, user: false } : item)
          });

        } else setMessages((messages) => {
          return messages.map((item, index) =>
            index === messageQueueLength + 1 ? { text: text, user: false } : item
          )
        });
        
        console.log("message queue length in the for loop", messageQueueLength);
      }
      // return the final response from the AI for further processing
      return text;
      // handle any errors that occur during the AI response
    } catch (error) {
      console.error("Error sending message:", error);
      const text = "Error: unable to get a response from AI.";
      // add the error message to the messages list
      // const newItem = Map({ input: text, user: false });
      // setMessages((prevItems) => prevItems.push(newItem));
      setMessages([...messages, { text: text, user: false }]);
      // return the error message for further processing
      return text;
    }
  }

  // Handle specific AI error messages
  function handleAIErrors(error: string) {
    if (
      error.includes("Ending interview") ||
      error.includes("Best of luck") ||
      error.includes("Error")
    ) {
      setStartInterview(false);
      JobTitleRef.current!.value = "";
      setJobTitle("");
      JobTitleRef.current?.focus();
      setMessageQueueLength(0);
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
        <div className="mt-1 p-4 h-96 overflow-y-scroll" ref={containerRef}>
          {messages?.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg?.user ? "justify-end" : "justify-start"
              } mb-2`}
            >
              <div
                className={`rounded-lg p-2 shadow-md overflow-x-hidden flex flex-wrap ${
                  msg?.user ? "bg-blue-500 text-white" : "bg-gray-200"
                }`}
              >
                <ReactMarkdown>{msg?.text?.toString()}</ReactMarkdown>
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
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              autoFocus
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

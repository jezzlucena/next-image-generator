"use client"
import { GeneratedImage } from "@/types/GeneratedImage";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ChatImage from "./ChatImage";
import axios, { AxiosResponse } from "axios";

export const isBrowser = typeof window !== "undefined";
export const webSocket = isBrowser ? new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8085/ws") : null;

/** String literal representing the types of messages that can be sent */
type SentDataType = 'reset' | 'prompt' | 'typing'
/** String literal representing the types of messages that can be received */
type ReceivedDataType = SentDataType | 'image' | 'color'

export default function ImageGenerator() {
  const [isLocked, setLocked] = useState(true);
  const [userColor, setUserColor] = useState<string>('');
  const [userInput, setUserInput] = useState('');
  const [chatImages, setChatImages] = useState<GeneratedImage[]>([]);
  const [userTypingTimeouts, setUserTypingTimeouts] = useState<{
    [key: string]: NodeJS.Timeout
  }>({});

  const sendData = (type: SentDataType, content?: string) => {
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
      /** If connection is open, send the stringified data. Clean up the input field if needed. */
      webSocket.send(
        JSON.stringify({
          type,
          content,
          color: ['typing', 'prompt'].includes(type) ? userColor : undefined,
        }),
      );
      if (type === 'prompt') setUserInput('');
    } else {
      /** Otherwise, handle error recovery (e.g. display a toast, show message with error flag) */
      switch (type) {
        case 'prompt':
          chatImages.push({
            caption: content,
            color: userColor,
            error: true,
          });
          toast.error("Error sending image request.");
          break;
        case 'reset':
          toast.error("Error resetting images.");
      }
    }
  };
  
  const clearMessages = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    sendData('reset');
  };

  /** Submit prompt message */
  const createPrompt = () => {
    sendData('prompt', userInput);
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if(e.key === 'Enter' && e.shiftKey == false) {
      e.preventDefault();
      createPrompt();
    }
  }
  
  /** Submit signal to add a typing indicator on all clients' screens */
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setUserInput(value);
    sendData('typing');
  };

  /**
   * Fetches the current state of the app, this is used to synchronize
   * the client state with the server state when the app is first opened */
  const getState = () => {
    axios.get<{
      images: GeneratedImage[],
      isLocked: boolean
    }>(`${process.env.NEXT_PUBLIC_BACKEND_URL}/state`)
      .then((res: AxiosResponse) => {
        console.log(res.data)
        setChatImages(res.data['images']);
        setLocked(res.data['isLocked']);
      })
      .catch((error: Error) => {
        toast.error("Error fetching previous images.")
        console.error(error)
      })
  };

  useEffect(() => {
    if (!webSocket) return;
    
    webSocket.onopen = () => {
      console.log('WebSocket connection opened');
      setLocked(false);
    };
  
    webSocket.onmessage = (event) => {
      const data: { 
        type: ReceivedDataType,
        content?: string,
        color?: string
      } = JSON.parse(event.data)

      switch (data.type) {
        case 'reset':
          /** Empty chatMessages */
          setChatImages([]);
          break;
        case 'prompt':
          /**
           * 1 - Push user message to chatMessages with the respective color
           * 2 - Clear timeouts and delete keys from the timeouts dictionary,
           * that way no more typing indicators are displayed.
           * 3 - Add AI Typing indicator.
           */
          setChatImages([...chatImages, {
            caption: data.content,
            color: data.color as string,
          }]);
          delete userTypingTimeouts[data.color as string]
          setUserTypingTimeouts({ ...userTypingTimeouts });
          setLocked(true);
          break;
        case 'color':
          setUserColor(data.content as string);
          break;
        case 'typing':
          /**
           * Display typing indicator for the respective color,
           * clear and set timeouts accordingly 
           */
          clearTimeout(userTypingTimeouts[data.color as string])
          userTypingTimeouts[data.color as string] = setTimeout(() => {
            delete userTypingTimeouts[data.color as string];
            setUserTypingTimeouts({ ...userTypingTimeouts });
          }, 5000)
          setUserTypingTimeouts({ ...userTypingTimeouts });
          break;
        case 'image':
          const lastImage = chatImages[chatImages.length - 1];
          lastImage.imageUrl = data.content;
          chatImages.pop();
          setChatImages([...chatImages, lastImage]);
          setLocked(false);
      }
    };
  
    webSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  
    webSocket.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }, [chatImages, userTypingTimeouts]);

  useEffect(() => {
    getState();
  }, []);

  return (
    <div className="absolute flex flex-col top-0 left-[50%] bottom-0 w-[100%] -translate-x-[50%] pb-5 pr-5 pl-5 max-w-lg mx-auto my-0 overflow-hidden">
      <div
        className="absolute left-0 top-0 w-[100%] py-5 text-center backdrop-blur-sm bg-white bg-opacity-70 pointer-events-none whitespace-nowrap border-b border-gray-200 border-solid"
        style={{ zIndex: 1 }}
      >
        <span className="text-3xl">
          AI Image Generator
        </span>
        {" "}
        <span className="text-sm">
          by Jezz Lucena
        </span>
      </div>
      <div className="chatContainer grow overflow-y-scroll pt-[90px]">
        {chatImages.map((image, index) => <ChatImage image={image} key={index} />)}
        {Object.keys(userTypingTimeouts).map(color => <ChatImage image={{ color }} key={color} />)}
      </div>
      <div>
        <form action={createPrompt}>
          <textarea
            className="p-[10px] w-[100%] h-auto overflow-y-hidden text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            rows={1}
            value={userInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          ></textarea>
          <div className="flex font-bold text-xs">
            <div className="grow">
              Powered by
              {" "}
              <a
                className="underline p-0"
                href="https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct"
                target="_blank"
                >Stable Diffusion v2
              </a>
            </div>
            <button
              className="ml-2 bg-gray-100 hover:bg-gray-200 text-black py-1 px-2 rounded"
            >
              en_US
            </button>
            <button
              className={"ml-2 bg-gray-100 hover:bg-gray-200 text-black py-1 px-2 rounded " + (isLocked ? ' opacity-50 cursor-not-allowed ' : '' )}
              onClick={clearMessages}
            >
              Reset
            </button>
            <button
              className={"ml-2 bg-blue-500 hover:opacity-70 text-white py-1 px-2 rounded " + (isLocked ? ' opacity-50 cursor-not-allowed ' : '' )}
              type="submit"
              style={{ backgroundColor: userColor }}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
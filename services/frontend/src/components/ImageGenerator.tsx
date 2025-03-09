"use client"
import { GeneratedImage } from "@/types/GeneratedImage";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import ChatImage from "./ChatImage";
import axios, { AxiosResponse } from "axios";
import styles from "./ImageGenerator.module.scss"
import {useTranslations} from 'next-intl';
import { redirect, useParams } from "next/navigation";
import { LANGUAGES } from "@/util/constants";
import { Locale } from "@/i18n/routing";
import LanguageModal from "./LanguageModal";

export const isBrowser = typeof window !== "undefined";
export const webSocket = isBrowser ? new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8085/ws") : null;

/** String literal representing the types of messages that can be sent */
type SentDataType = 'reset' | 'prompt' | 'typing'
/** String literal representing the types of messages that can be received */
type ReceivedDataType = SentDataType | 'image' | 'color'

export default function ImageGenerator() {
  const chatContainer = useRef<HTMLDivElement>(null);
  const textArea = useRef<HTMLTextAreaElement>(null);

  const [isLocked, setLocked] = useState(true);
  const [isLanguageSelected, setLanguageSelected] = useState(true);
  const [userColor, setUserColor] = useState<string>('');
  const [userInput, setUserInput] = useState('');
  const [chatImages, setChatImages] = useState<GeneratedImage[]>([]);
  const [userTypingTimeouts, setUserTypingTimeouts] = useState<{
    [key: string]: NodeJS.Timeout
  }>({});

  const params = useParams<{ locale: string }>()
  const t = useTranslations('ImageGenerator');
  
  /** Scrolls the {@link chatContainer} to the bottom (e.g. when a new message is submitted by a user) */
  const scrollToBottom = () => {
    const elm = chatContainer.current;
    if (elm) elm.scrollTop = elm.scrollHeight;
  }

  /**
   * Returns true if {@link chatContainer} is currently scrolled to the bottom
   * Used to avoid screen jumps while the AI is streaming.
   */
  const isScrolledToBottom = () => {
    const elm = chatContainer.current;
    return elm &&
      Math.abs(elm.scrollHeight - elm.scrollTop - elm.clientHeight) < 1;
  }

  /**
   * Resize text area (e.g. when the user types a message that takes
   * up more than one line.)
   */
  const resizeTextArea = () => {
    const elm = textArea.current;
    if (elm) {
      const wasAtBottom = isScrolledToBottom();
  
      elm.style.height = 'auto';
      elm.style.height = `${elm.scrollHeight}px`;
  
      if (wasAtBottom) setTimeout(() => scrollToBottom(), 0);
    }
  }

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
      if (type === 'prompt') {
        setUserInput('');
        setTimeout(() => resizeTextArea(), 100);
      }
    } else {
      /** Otherwise, handle error recovery (e.g. display a toast, show message with error flag) */
      switch (type) {
        case 'prompt':
          chatImages.push({
            caption: content,
            color: userColor,
            error: true,
          });
          toast.error(t("error.imageRequest"));
          break;
        case 'reset':
          toast.error("error.resetting");
      }

      setTimeout(() => scrollToBottom(), 0);
    }
  };
  
  const clearMessages = (event: React.MouseEvent<HTMLElement>) => {
    if (chatImages.length === 0 || isLocked) return;
    event.preventDefault();
    sendData('reset');
  };

  /** Submit prompt message */
  const createPrompt = () => {
    if (!userInput || isLocked) return;
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
    resizeTextArea();
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
        setChatImages(res.data['images'])
        setLocked(res.data['isLocked'])
      })
      .catch((error: Error) => {
        toast.error(t('error.fetching'))
        console.error(error)
      })
  };

  useEffect(() => {
    if (!webSocket) return;

    webSocket.onopen = () => {
      toast.success(t("connected"))
      console.log('WebSocket connection opened')
      setLocked(false);
    };
  
    webSocket.onmessage = (event) => {
      const data: { 
        type: ReceivedDataType,
        content?: string,
        color?: string
      } = JSON.parse(event.data)

      const wasAtBottom = isScrolledToBottom();

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

      if (wasAtBottom) setTimeout(() => scrollToBottom(), 100);
    };
  
    webSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  
    webSocket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    setTimeout(() => scrollToBottom(), 0);
  }, [chatImages, t, userTypingTimeouts]);

  useEffect(() => {
    getState();
  }, []);

  return (
    <div className="absolute flex flex-col top-0 left-[50%] bottom-0 w-[100%] -translate-x-[50%] pb-5 pr-5 pl-5  overflow-hidden">
      <div
        className="absolute left-0 top-0 w-[100%] py-5 text-center backdrop-blur-sm bg-background/70 bg-opacity-70 pointer-events-none whitespace-nowrap border-b border-gray-200 border-solid"
        style={{ zIndex: 1 }}
      >
        <span className="text-3xl">
          { t('title') }
        </span>
        {" "}
        <span className="text-sm">
          { t('byJezzLucena') }
        </span>
      </div>
      <div ref={chatContainer} className={styles.chatContainer + " grow overflow-y-scroll pt-[90px] max-w-[768px] mx-auto my-0"}>
        {chatImages.map((image, index) => <ChatImage image={image} key={index} />)}
        {Object.keys(userTypingTimeouts).map(color => <ChatImage image={{ color }} key={color} />)}
      </div>
      <div className="w-[100%] max-w-[768px] mx-auto my-0">
        <form action={createPrompt}>
          <textarea
            className="p-[10px] w-[100%] h-auto overflow-y-hidden text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            ref={textArea}
            rows={1}
            value={userInput}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          ></textarea>
          <div className="flex font-bold text-xs">
            <div className="grow">
              { t('poweredBy') }
              {" "}
              <a
                className="underline p-0"
                href="https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct"
                target="_blank"
                >Stable Diffusion
              </a>
            </div>
            <button
              className="ml-2 bg-gray-100 hover:bg-gray-200 text-black py-1 px-2 rounded"
              onClick={() => setLanguageSelected(false)}
            >
              { LANGUAGES[params.locale as Locale].short }
            </button>
            <button
              className={"ml-2 bg-gray-100 hover:bg-gray-200 text-black py-1 px-2 rounded " + (isLocked ? ' opacity-50 cursor-not-allowed ' : '' )}
              onClick={clearMessages}
            >
              { t('reset') }
            </button>
            <button
              className={"ml-2 bg-blue-500 hover:opacity-70 text-white py-1 px-2 rounded " + (isLocked ? ' opacity-50 cursor-not-allowed ' : '' )}
              type="submit"
              style={{ backgroundColor: userColor }}
            >
              { t('send') }
            </button>
          </div>
        </form>
      </div>

      {!isLanguageSelected && 
        <LanguageModal
          onChoose={language => redirect(`/${language}`)}
          onClose={() => setLanguageSelected(true)}
        />
      }
    </div>
  );
}
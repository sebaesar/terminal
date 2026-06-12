import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { sendTelemetryEvent } from "@hooks/useTelemetry";
import { simulateTypingSequence, humanDelay } from "@utils/typingSimulation";

type ChatRole = "assistant" | "user";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

type ChatStatus = {
  isOpen: boolean;
  isMinimized: boolean;
  maximizeOnOpen: boolean;
  loading: boolean;
  input: string;
  unread: number;
  error?: string | null;
};

type ChatStore = ChatStatus & {
  messages: ChatMessage[];
  sendMessage: (text?: string) => Promise<void>;
  setInput: (value: string) => void;
  clear: () => void;
  openChat: () => void;
  openChatMaximized: () => void;
  closeChat: () => void;
  minimizeChat: () => void;
  toggleChat: () => void;
  markRead: () => void;
  cancel: () => void;
  setMaximizeOnOpen: (value: boolean) => void;
};

const CHATBOT_URL = import.meta.env.VITE_CHATBOT_URL;

const uuid = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

// Lightweight IndexedDB storage for zustand persist.
const createIdbStorage = () => {
  if (typeof indexedDB === "undefined") return null;

  const dbName = "terminal-chatbot";
  const storeName = "state";

  const openDb = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  const run = async <T>(
    mode: IDBTransactionMode,
    op: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const req = op(store);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  };

  return {
    async getItem(name: string) {
      return run<string | null>("readonly", (s) => s.get(name));
    },
    async setItem(name: string, value: string) {
      return run("readwrite", (s) => s.put(value, name)).then(() => undefined);
    },
    async removeItem(name: string) {
      return run("readwrite", (s) => s.delete(name)).then(() => undefined);
    },
  };
};

const idbStorage = createIdbStorage();

const storage = createJSONStorage(() => {
  if (idbStorage) return idbStorage;
  // Fallback to localStorage if IndexedDB is unavailable.
  return {
    getItem: (name: string) =>
      Promise.resolve(
        typeof window !== "undefined" ? localStorage.getItem(name) : null,
      ),
    setItem: (name: string, value: string) =>
      Promise.resolve(
        typeof window !== "undefined"
          ? localStorage.setItem(name, value)
          : undefined,
      ),
    removeItem: (name: string) =>
      Promise.resolve(
        typeof window !== "undefined"
          ? localStorage.removeItem(name)
          : undefined,
      ),
  };
});

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => {
      let abortController: AbortController | null = null;
      let typingTimers: number[] = [];
      let pendingText = "";
      let currentTyped = "";
      let finalizeWhenQueueEmpty = false;

      const clearTypingTimers = () => {
        typingTimers.forEach((t) => window.clearTimeout(t));
        typingTimers = [];
      };

      const stopTypingLoop = () => {
        clearTypingTimers();
        pendingText = "";
        currentTyped = "";
        finalizeWhenQueueEmpty = false;
      };

      const ensureStreamingMessage = () => {
        const last = get().messages.at(-1);
        if (last?.role === "assistant" && last.id === "streaming") return;
        set((state) => {
          const messages: ChatMessage[] = [
            ...state.messages,
            {
              id: "streaming",
              role: "assistant",
              createdAt: Date.now(),
              content: currentTyped,
            },
          ];
          return {
            messages,
            loading: true,
            unread:
              state.isOpen && !state.isMinimized
                ? state.unread
                : state.unread + 1,
          };
        });
      };

      const updateStreamingContent = (content: string) => {
        set((state) => {
          const messages = [...state.messages];
          const last = messages[messages.length - 1];
          if (last?.role === "assistant" && last.id === "streaming") {
            messages[messages.length - 1] = { ...last, content };
          } else {
            messages.push({
              id: "streaming",
              role: "assistant",
              createdAt: Date.now(),
              content,
            });
          }
          return { messages, loading: true };
        });
      };

      const startTyping = () => {
        if (!pendingText) return;
        ensureStreamingMessage();
        const textToType = pendingText;
        const baseTyped = currentTyped;
        pendingText = "";
        const { timers, duration } = simulateTypingSequence(textToType, {
          delayFn: (prev, ch) => humanDelay(baseTyped + prev, ch),
          onChar: (typed) => {
            const nextContent = baseTyped + typed;
            currentTyped = nextContent;
            updateStreamingContent(nextContent);
          },
        });
        typingTimers = timers;
        const finalizeTimer = window.setTimeout(() => {
          typingTimers = [];
          if (pendingText.length) {
            startTyping();
          } else if (finalizeWhenQueueEmpty) {
            finalizeAssistant();
            finalizeWhenQueueEmpty = false;
          }
        }, duration + 10);
        typingTimers.push(finalizeTimer);
      };

      const pushAssistantChunk = (chunk: string) => {
        if (!chunk) return;
        pendingText += chunk;
        if (typingTimers.length === 0) {
          startTyping();
        }
      };

      const finalizeAssistant = () => {
        if (pendingText.length || typingTimers.length) {
          finalizeWhenQueueEmpty = true;
          return;
        }
        set((state) => {
          const messages = [...state.messages];
          const last = messages[messages.length - 1];
          if (last?.id === "streaming") {
            messages[messages.length - 1] = { ...last, id: uuid() };
          }
          return { messages, loading: false };
        });
        currentTyped = "";
      };

      return {
        messages: [],
        isOpen: false,
        isMinimized: false,
        maximizeOnOpen: false,
        loading: false,
        input: "",
        unread: 0,
        error: null,
        setMaximizeOnOpen: (value: boolean) => set({ maximizeOnOpen: value }),
        setInput: (value: string) => set({ input: value }),
        markRead: () => set((state) => (state.unread ? { unread: 0 } : {})),
        openChat: () =>
          set((state) => ({
            isOpen: true,
            isMinimized: false,
            unread: 0,
            error: null,
            maximizeOnOpen: false,
            // leave messages as-is
          })),
        openChatMaximized: () =>
          set(() => ({
            isOpen: true,
            isMinimized: false,
            unread: 0,
            error: null,
            maximizeOnOpen: true,
          })),
        closeChat: () =>
          set(() => ({
            isOpen: false,
            isMinimized: false,
          })),
        minimizeChat: () =>
          set((state) => ({
            ...state,
            isMinimized: true,
            isOpen: false,
          })),
        toggleChat: () =>
          set((state) => ({
            isOpen: !state.isOpen || state.isMinimized,
            isMinimized: state.isOpen && !state.isMinimized ? true : false,
            unread: !state.isOpen || state.isMinimized ? 0 : state.unread,
          })),
        clear: () =>
          set(() => {
            stopTypingLoop();
            abortController?.abort();
            abortController = null;
            return {
              messages: [],
              input: "",
              unread: 0,
              loading: false,
              error: null,
            };
          }),
        cancel: () => {
          if (abortController) {
            abortController.abort();
            abortController = null;
          }
          stopTypingLoop();
          finalizeAssistant();
          set({ loading: false });
        },
        sendMessage: async (text?: string) => {
          const state = get();
          const content = (text ?? state.input).trim();
          if (!content) return;

          const userMessage: ChatMessage = {
            id: uuid(),
            role: "user",
            content,
            createdAt: Date.now(),
          };

          set((prev) => ({
            messages: [...prev.messages, userMessage],
            input: "",
            loading: true,
            error: null,
          }));

          void sendTelemetryEvent({
            action: "chat_message",
            userInput: content,
            message: "chat user message",
            context: {
              messageId: userMessage.id,
            },
          });

          const rawHistory = [...get().messages];
          const history = rawHistory
            .slice(-12) // avoid unnecessary bandwidth
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content })); // drop id/createdAt

          abortController = new AbortController();

          try {
            const resp = await fetch(CHATBOT_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                history,
                message: content,
              }),
              signal: abortController.signal,
            });

            if (!resp.ok) {
              throw new Error(`HTTP ${resp.status}`);
            }
            const reader = resp.body?.getReader();
            if (!reader) throw new Error("Empty response body");

            const decoder = new TextDecoder("utf-8");
            let streamBuffer = "";
            const processLine = (rawLine: string) => {
              const line = rawLine.trim();
              if (!line.startsWith("data:")) return false;
              const payload = line.slice(5).trimStart();
              if (payload === "[DONE]") {
                finalizeAssistant();
                abortController = null;
                return true;
              }
              try {
                const json = JSON.parse(payload);
                const newText = json.response ?? "";
                if (newText) pushAssistantChunk(newText);
              } catch {
                /* ignore malformed chunks */
              }
              return false;
            };
            const process = async (): Promise<void> => {
              const { done, value } = await reader.read();
              if (done) {
                const trailing = decoder.decode();
                if (trailing) streamBuffer += trailing;
                if (streamBuffer.trim() && processLine(streamBuffer)) return;
                finalizeAssistant();
                abortController = null;
                return;
              }
              streamBuffer += decoder.decode(value, { stream: true });
              const lines = streamBuffer.split(/\r?\n/);
              streamBuffer = lines.pop() ?? "";
              for (const line of lines) {
                if (processLine(line)) return;
              }
              await process();
            };

            await process();
          } catch (error) {
            const telemetryError =
              error instanceof Error
                ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                  }
                : { message: String(error) };
            console.error("chatbot error", error);
            void sendTelemetryEvent({
              action: "chat_message_error",
              userInput: content,
              message: "chatbot failed",
              level: "error",
              error: telemetryError,
            });
            abortController = null;
            stopTypingLoop();
            finalizeAssistant();
            set((prev) => ({
              loading: false,
              error:
                error instanceof Error ? error.message : "Something went wrong",
              messages: [
                ...prev.messages,
                {
                  id: uuid(),
                  role: "assistant",
                  createdAt: Date.now(),
                  content:
                    "I hit a snag reaching the server. Please try again or check your connection.",
                },
              ],
            }));
          }
        },
      };
    },
    {
      name: "chatbot-store",
      storage,
      version: 2,
      partialize: (state) => ({
        messages: state.messages,
        isOpen: state.isOpen,
        isMinimized: state.isMinimized,
        maximizeOnOpen: state.maximizeOnOpen,
        loading: state.loading,
        input: state.input,
        unread: state.unread,
        error: state.error,
      }),
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState as ChatStore;
        }

        const state = { ...(persistedState as Record<string, unknown>) };
        delete state.tone;
        return state as ChatStore;
      },
    },
  ),
);

export const openChat = () => useChatStore.getState().openChat();
export const openChatMaximized = () =>
  useChatStore.getState().openChatMaximized();
export const toggleChat = () => useChatStore.getState().toggleChat();
export const minimizeChat = () => useChatStore.getState().minimizeChat();

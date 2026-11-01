"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { chat, streamEvents } from "@/lib/api";
import type { ChatResponse, SSEEnvelope, SourceOut } from "@/types/api";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2, Plus, Send, Brain, Search, CheckCircle, ChevronDown, ChevronUp, Globe } from "lucide-react";
import { MicIcon, type MicIconHandle } from "@/components/ui/mic-icon";
import { Playfair_Display } from "next/font/google";

const playfairDisplay = Playfair_Display({
    weight: ["700"],
    subsets: ["latin"],
    style: ["italic"],
    variable: "--font-playfair",
    display: "swap",
});

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceOut[];
  verdict?: string;
  streaming?: boolean;
  researchProgress?: ResearchProgress;
}

interface ResearchProgress {
  stage: string;
  sources: Array<{
    url: string;
    title?: string;
    tier?: string;
    words?: number;
  }>;
  events: string[];
}

export default function ChatPage() {
  const { id: sessionId } = useParams();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [loadingState, setLoadingState] = useState<string>("thinking");
  const [showThoughts, setShowThoughts] = useState<{ [key: string]: boolean }>({});

  const inputRef = useRef(input);
  inputRef.current = input;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sourcesRef = useRef<SourceOut[]>([]);
  const verdictRef = useRef("");
  const stopRef = useRef<(() => void) | null>(null);
  const initialized = useRef(false);
  const micRef = useRef<MicIconHandle>(null);
  const recognitionRef = useRef<any>(null);
  const baseMessageRef = useRef<string>("");
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadingStates = [
    { text: "Thinking", icon: "brain" },
    { text: "Analyzing", icon: "brain" },
    { text: "Searching sources", icon: "search" },
    { text: "Verifying claims", icon: "check" },
    { text: "Cross-referencing", icon: "search" },
    { text: "Gathering evidence", icon: "search" },
  ];

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0 && sessionId) {
      try {
        localStorage.setItem(`chat_${sessionId}`, JSON.stringify(messages));
        
        // Generate and save chat title from first user message
        const firstUserMsg = messages.find(m => m.role === "user");
        if (firstUserMsg) {
          const title = firstUserMsg.content.slice(0, 40).trim();
          const shortTitle = title.length > 40 ? title.slice(0, 37) + "..." : title;
          
          // Save to chat sessions list
          const sessions = JSON.parse(localStorage.getItem("chat_sessions") || "[]");
          const existingIndex = sessions.findIndex((s: any) => s.id === sessionId);
          const sessionData = {
            id: sessionId,
            title: shortTitle,
            timestamp: Date.now(),
          };
          
          if (existingIndex >= 0) {
            sessions[existingIndex] = sessionData;
          } else {
            sessions.unshift(sessionData);
          }
          
          // Keep only last 50 sessions
          localStorage.setItem("chat_sessions", JSON.stringify(sessions.slice(0, 50)));
        }
      } catch (e) {
        console.error("Failed to save chat:", e);
      }
    }
  }, [messages, sessionId]);

  // Load messages from localStorage on mount
  useEffect(() => {
    if (sessionId && !initialized.current) {
      try {
        const saved = localStorage.getItem(`chat_${sessionId}`);
        if (saved) {
          const loadedMessages = JSON.parse(saved);
          setMessages(loadedMessages);
        }
      } catch (e) {
        console.error("Failed to load chat:", e);
      }
    }
  }, [sessionId]);

  const finishResearch = useCallback(
    (assistantId: string) => {
      setIsStreaming(false);
      setStreamingId(null);
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantId) return m;
          let content = m.content || "";
          if (verdictRef.current) {
            content += "\n\n---\n" + verdictRef.current;
          }
          if (sourcesRef.current.length) {
            content +=
              "\n\nSources:\n" +
              sourcesRef.current
                .map(
                  (s, i) =>
                    `- [${s.title || s.url || "Source"}](${s.url || "#"})`
                )
                .join("\n");
          }
          return {
            ...m,
            streaming: false,
            content,
            sources: [...sourcesRef.current],
            verdict: verdictRef.current || undefined,
          };
        })
      );
      sourcesRef.current = [];
      verdictRef.current = "";
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
    },
    []
  );

  const handleSend = useCallback(async () => {
    const text = inputRef.current.trim();
    if (!text || isStreaming) return;

    // Clear input immediately
    setInput("");
    inputRef.current = "";

    const userMsg: ChatMessage = {
      id: "m_" + Date.now(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setError("");
    
    // Start cycling loading states
    let stateIndex = 0;
    setLoadingState(loadingStates[0].text);
    loadingIntervalRef.current = setInterval(() => {
      stateIndex = (stateIndex + 1) % loadingStates.length;
      setLoadingState(loadingStates[stateIndex].text);
    }, 2500);

    const history = [...messagesRef.current, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res: ChatResponse = await chat({ message: text, history });

      if (res.intent === "chat") {
        setMessages((prev) => [
          ...prev,
          {
            id: "m_" + Date.now(),
            role: "assistant",
            content: res.reply || "I'm here. What would you like to look into?",
          },
        ]);
        setIsStreaming(false);
        if (loadingIntervalRef.current) {
          clearInterval(loadingIntervalRef.current);
          loadingIntervalRef.current = null;
        }
      } else {
        const runId = res.run_id ?? null;
        const assistantId = "m_" + Date.now();
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: res.reply || "Let me verify that for you.",
            streaming: true,
          },
        ]);
        setStreamingId(assistantId);
        sourcesRef.current = [];
        verdictRef.current = "";

        if (runId != null) {
          const researchProgress: ResearchProgress = {
            stage: "Starting research",
            sources: [],
            events: [],
          };

          const stop = streamEvents(
            runId,
            (e: SSEEnvelope) => {
              // Update research progress based on event type
              if (e.type === "search_query") {
                researchProgress.stage = "Searching sources";
                researchProgress.events.push(`Searching: ${e.payload?.query || ""}`);
              } else if (e.type === "source_fetched" && e.payload) {
                researchProgress.sources.push({
                  url: e.payload.url || "",
                  title: e.payload.title,
                  tier: e.payload.tier,
                  words: e.payload.words,
                });
                researchProgress.events.push(`Found: ${e.payload.url || ""}`);
                setLoadingState("Fetching sources");
              } else if (e.type === "stage_done") {
                researchProgress.stage = `Completed: ${e.payload?.stage || ""}`;
                researchProgress.events.push(`Stage done: ${e.payload?.stage || ""}`);
                setLoadingState("Analyzing claims");
              } else if (e.type === "slot_generation") {
                researchProgress.events.push(`Generated ${e.payload?.count || 0} requirements`);
                setLoadingState("Mapping information");
              } else if (e.type === "finding_finalized") {
                verdictRef.current = String(e.payload?.state || "");
                researchProgress.events.push(`Finding: ${e.payload?.state || ""}`);
              } else if (e.type === "run_done") {
                verdictRef.current = verdictRef.current || "Research complete";
                researchProgress.stage = "Complete";
              }

              // Update the streaming message with progress
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, researchProgress: { ...researchProgress } }
                    : m
                )
              );
            },
            () => finishResearch(assistantId),
            (err: Error) => {
              setError(err.message);
              setIsStreaming(false);
              setStreamingId(null);
            }
          );
          stopRef.current = stop;
        } else {
          setIsStreaming(false);
          setStreamingId(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsStreaming(false);
      setStreamingId(null);
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    }
  }, [isStreaming, finishResearch, loadingStates]);

  useEffect(() => {
    if (!sessionId || initialized.current) return;
    initialized.current = true;
    try {
      const stashed = sessionStorage.getItem(`lemma_chat_${sessionId}`);
      if (stashed) {
        sessionStorage.removeItem(`lemma_chat_${sessionId}`);
        inputRef.current = stashed;
        setInput(stashed);
        // Automatically send the message after a brief delay
        const t = setTimeout(() => {
          handleSend();
        }, 100);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [sessionId, handleSend]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      micRef.current?.stopAnimation();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    baseMessageRef.current = input;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + " ";
        } else {
          interimTranscript += t;
        }
      }
      const base = baseMessageRef.current;
      const newMessage = ((base ? base + " " : "") + finalTranscript + interimTranscript).trim();
      setInput(newMessage);
      inputRef.current = newMessage;
    };

    rec.onerror = () => {
      setIsListening(false);
      micRef.current?.stopAnimation();
    };

    rec.onend = () => {
      setIsListening(false);
      micRef.current?.stopAnimation();
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setIsListening(true);
      micRef.current?.startAnimation();
    } catch {
      setIsListening(false);
      micRef.current?.stopAnimation();
    }
  };

  return (
    <AppShell>
      <div className="min-h-screen w-full relative overflow-hidden">
        {/* Banner Background - Same as evals page for consistent opacity and clarity */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero-bg.jpg"
            alt=""
            className="w-full h-full object-cover opacity-50 [filter:brightness(0.7)_contrast(1.05)]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-[#0d0908]" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>
        <div className="relative z-10 h-[calc(100vh)] flex flex-col">
          <div className="flex items-center gap-2.5 px-6 py-3 shrink-0 border-b border-white/5">
            <div className="flex flex-col">
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add some top spacing */}
          <div className="w-full max-w-4xl mx-auto pt-8 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className={`${playfairDisplay.variable} font-playfair text-4xl font-bold italic text-white/40`}>
                Lemma
              </span>
              <p className="text-white/70 text-sm max-w-xs leading-relaxed">
                Hi! I&apos;m Lemma. Ask me anything, or say something like{" "}
                <span className="text-white">"verify this claim..."</span>{" "}
                and I&apos;ll research it for you — right here in this chat.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className="flex gap-3 w-full mb-6">
              {m.role === "user" ? (
                <div className="ml-auto flex flex-col items-end max-w-[75%]">
                  <div
                    className={cn(
                      "inline-block rounded-2xl rounded-tr-sm px-4 py-2.5 text-[15px] text-white whitespace-pre-wrap break-words shadow-sm bg-[#2f2f2f]"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col w-full max-w-[85%]">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-0.5 shrink-0 pt-1">
                      <span className={`${playfairDisplay.variable} font-playfair text-base font-bold italic text-white shrink-0`}>
                        L
                      </span>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div
                        className={cn(
                          "inline-block rounded-2xl rounded-tl-sm px-4 py-2.5 text-[15px] text-white/90 whitespace-pre-wrap break-words shadow-sm bg-[#2f2f2f]"
                        )}
                      >
                        {m.content}
                      </div>

                      {/* Research Progress Dropdown (like Bolt's Thoughts) */}
                      {m.researchProgress && (m.streaming || m.researchProgress.sources.length > 0) && (
                        <div className="rounded-xl border border-white/10 bg-[#1a1a1a] overflow-hidden">
                          <button
                            onClick={() => setShowThoughts(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Brain className="w-4 h-4 text-white/60" />
                              <span className="text-sm font-medium text-white/80">
                                Thoughts
                              </span>
                              {m.streaming && (
                                <span className="text-xs text-white/50">
                                  {m.researchProgress.stage}
                                </span>
                              )}
                            </div>
                            {showThoughts[m.id] ? (
                              <ChevronUp className="w-4 h-4 text-white/60" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-white/60" />
                            )}
                          </button>

                          {showThoughts[m.id] && (
                            <div className="px-4 py-3 space-y-3 border-t border-white/10 max-h-64 overflow-y-auto">
                              {/* Sources being fetched */}
                              {m.researchProgress.sources.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                                    Sources ({m.researchProgress.sources.length})
                                  </p>
                                  {m.researchProgress.sources.map((src, idx) => {
                                    const domain = new URL(src.url).hostname;
                                    return (
                                      <a
                                        key={idx}
                                        href={src.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                                      >
                                        <img
                                          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                                          alt=""
                                          className="w-4 h-4 shrink-0"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                            if (fallback) fallback.style.display = 'block';
                                          }}
                                        />
                                        <Globe className="w-3.5 h-3.5 text-white/70 shrink-0 hidden" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs text-white/80 truncate group-hover:text-white">
                                            {src.title || domain}
                                          </p>
                                          {src.tier && (
                                            <p className="text-[10px] text-white/50">
                                              {src.tier} • {src.words || 0} words
                                            </p>
                                          )}
                                        </div>
                                        <ExternalLink className="w-3 h-3 text-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </a>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Research events */}
                              {m.researchProgress.events.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                                    Progress
                                  </p>
                                  <div className="space-y-1">
                                    {m.researchProgress.events.slice(-5).map((event, idx) => (
                                      <p key={idx} className="text-xs text-white/60 font-mono">
                                        • {event}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {!m.streaming && (m.sources?.length || m.verdict) && (
                    <div className="ml-10 mt-2">
                      {m.sources?.length && (
                        <>
                          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                            Sources
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {m.sources.map((s, i) => {
                              if (!s.url) return null;
                              const domain = new URL(s.url).hostname;
                              return (
                                <a
                                  key={i}
                                  href={s.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "text-xs text-white hover:underline flex items-center gap-1.5 px-2 py-1 rounded-full",
                                    "bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
                                  )}
                                >
                                  <img
                                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                                    alt=""
                                    className="w-3.5 h-3.5 shrink-0"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                      if (fallback) fallback.style.display = 'inline-block';
                                    }}
                                  />
                                  <ExternalLink className="w-3 h-3 shrink-0 hidden" />
                                  {s.title || s.url}
                                </a>
                              );
                            })}
                          </div>
                        </>
                      )}
                      {m.verdict && (
                        <p className="mt-2 text-xs text-white/60 border-t border-white/5 pt-2">
                          Verdict: {m.verdict}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isStreaming && (
            <div className="flex items-start gap-3 w-full max-w-[85%] mb-6">
              <span className={`${playfairDisplay.variable} font-playfair text-base font-bold italic text-white shrink-0 pt-1`}>
                L
              </span>
              <div className="inline-flex items-center gap-3 rounded-2xl rounded-tl-sm px-4 py-3 text-white bg-[#2f2f2f]/50 shadow-sm border border-white/5">
                {loadingState.toLowerCase().includes("thinking") || loadingState.toLowerCase().includes("analyzing") ? (
                  <Brain className="w-5 h-5 text-white animate-pulse" />
                ) : loadingState.toLowerCase().includes("verifying") || loadingState.toLowerCase().includes("check") ? (
                  <CheckCircle className="w-5 h-5 text-white animate-pulse" />
                ) : (
                  <Search className="w-5 h-5 text-white animate-pulse" />
                )}
                <span className="text-base text-white">{loadingState}...</span>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Bottom prompt bar — compact like ChatGPT */}
        <div className="shrink-0 px-4 pb-4 pt-2">
          <div className="mx-auto w-full max-w-3xl">
            <div className="relative flex items-end gap-3 rounded-3xl border border-white/20 bg-[#2f2f2f] px-4 py-3 shadow-lg">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.docx,.doc,image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    // Handle file upload here
                    console.log('Files selected:', e.target.files);
                  }
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach"
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0 mb-0.5"
              >
                <Plus className="w-5 h-5" />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize
                  const textarea = e.target;
                  textarea.style.height = 'auto';
                  const newHeight = Math.min(Math.max(textarea.scrollHeight, 28), 200);
                  textarea.style.height = `${newHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask anything…"
                className={cn(
                  "flex-1 bg-transparent border-none outline-none px-2 py-2 text-white placeholder-white/40 resize-none text-[15px] leading-6 overflow-y-hidden",
                  "max-h-[200px]"
                )}
                rows={1}
                style={{ 
                  minHeight: '28px',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              />
              <div className="flex items-center gap-3 shrink-0 mb-0.5">
                {/* Think toggle with icon */}
                <button
                  type="button"
                  onClick={() => setIsThinking(!isThinking)}
                  aria-label="Think"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                    isThinking
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                      : "bg-white/5 text-white/80 hover:bg-white/10"
                  )}
                >
                  <Brain className="w-4 h-4" />
                  <span>Think</span>
                </button>
                <button
                  type="button"
                  aria-label="Microphone"
                  onClick={toggleListening}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isListening 
                      ? "text-white bg-white/10" 
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  )}
                >
                  <MicIcon ref={micRef} size={20} />
                </button>
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  aria-label="Send"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white text-black hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-400 text-center">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  </AppShell>
  );
}
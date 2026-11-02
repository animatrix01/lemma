import React, { useState, useRef, useEffect, useCallback } from "react";
import { Plus, ArrowUp, X, FileText, Loader2, Archive, Brain, Image, File, FileType } from "lucide-react";
import { MicIcon, type MicIconHandle } from "@/components/ui/mic-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/* --- ICONS --- */
export const Icons = {
    Logo: (props: React.SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="presentation" {...props}>
            <g fill="currentColor" fillRule="evenodd">
                <circle cx="100" cy="100" r="26" />
            </g>
            <g fill="none" stroke="currentColor" strokeWidth="17">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                    <ellipse
                        key={angle}
                        cx="100"
                        cy="52"
                        rx="24"
                        ry="50"
                        transform={`rotate(${angle} 100 100) rotate(28 100 52)`}
                    />
                ))}
            </g>
        </svg>
    ),
    Plus: Plus,
    Brain: Brain,
    ArrowUp: ArrowUp,
    X: X,
    FileText: FileText,
    Loader2: Loader2,
    Archive: Archive,
    Image: Image,
    File: File,
    FileType: FileType,
};

/* --- UTILS --- */
const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/* --- COMPONENTS --- */
interface AttachedFile {
    id: string;
    file: File;
    type: string;
    preview: string | null;
    uploadStatus: string;
    content?: string;
}

interface PastedSnippet {
    id: string;
    content: string;
    timestamp: Date;
}

interface FilePreviewCardProps {
    file: AttachedFile;
    onRemove: (id: string) => void;
}

const FilePreviewCard: React.FC<FilePreviewCardProps> = ({ file, onRemove }) => {
    const isImage = file.type.startsWith("image/") && file.preview;
    return (
        <div className="relative group flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-border bg-card animate-fade-in transition-all hover:border-primary">
            {isImage ? (
                <div className="w-full h-full relative">
                    <img src={file.preview!} alt={file.file.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                </div>
            ) : (
                <div className="w-full h-full p-3 flex flex-col justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-muted rounded">
                            <Icons.FileText className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                            {file.file.name.split('.').pop()}
                        </span>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-xs font-medium text-foreground truncate" title={file.file.name}>
                            {file.file.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                            {formatFileSize(file.file.size)}
                        </p>
                    </div>
                </div>
            )}
            <button
                onClick={() => onRemove(file.id)}
                className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Icons.X className="w-3 h-3" />
            </button>
            {file.uploadStatus === 'uploading' && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Icons.Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
            )}
        </div>
    );
};

interface PastedContentCardProps {
    content: {
        id: string;
        content: string;
        timestamp: Date;
    };
    onRemove: (id: string) => void;
}

const PastedContentCard: React.FC<PastedContentCardProps> = ({ content, onRemove }) => {
    return (
        <div className="relative group flex-shrink-0 w-28 h-28 rounded-2xl overflow-hidden border border-border bg-card animate-fade-in p-3 flex flex-col justify-between shadow-sm">
            <div className="overflow-hidden w-full">
                <p className="text-[10px] text-muted-foreground leading-[1.4] font-mono break-words whitespace-pre-wrap line-clamp-4 select-none">
                    {content.content}
                </p>
            </div>
            <div className="flex items-center justify-between w-full mt-2">
                <div className="inline-flex items-center justify-center px-1.5 py-[2px] rounded border border-border bg-background">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">PASTED</span>
                </div>
            </div>
            <button
                onClick={() => onRemove(content.id)}
                className="absolute top-2 right-2 p-[3px] bg-background border border-border rounded-full text-muted-foreground hover:text-foreground transition-colors shadow-sm opacity-0 group-hover:opacity-100"
            >
                <Icons.X className="w-2 h-2" />
            </button>
        </div>
    );
};

interface ClaudeChatInputProps {
    onSendMessage: (data: {
        message: string;
        files: AttachedFile[];
        pastedContent: PastedSnippet[];
        model: string;
        isThinkingEnabled: boolean;
    }) => void;
    disabled?: boolean;
    readOnly?: boolean;
    onFocus?: () => void;
    placeholder?: string;
    initialMessage?: string;
}

export const ClaudeChatInput: React.FC<ClaudeChatInputProps> = ({ onSendMessage, disabled = false, readOnly = false, onFocus, placeholder = "Ask anything...", initialMessage }) => {
    const [message, setMessage] = useState(initialMessage || "");
    const [files, setFiles] = useState<AttachedFile[]>([]);
    const [pastedContent, setPastedContent] = useState<PastedSnippet[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isThinkingEnabled, setIsThinkingEnabled] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const micRef = useRef<MicIconHandle>(null);
    const recognitionRef = useRef<any>(null);
    const baseMessageRef = useRef<string>("");

    const placeholders = [
        "What are you trying to verify?",
        "Check if sources contradict each other...",
        "Find missing information in these articles...",
        "Verify claims in this policy document...",
        "Compare data across multiple sources...",
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => {
                setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
                setIsAnimating(false);
            }, 300);
        }, 2500);

        return () => clearInterval(interval);
    }, [placeholders.length]);

    useEffect(() => {
        if (initialMessage) {
            setMessage(initialMessage);
        }
    }, [initialMessage]);

    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        
        textarea.style.height = 'auto';
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 28), 200);
        textarea.style.height = `${newHeight}px`;
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [message]);

    const handleFiles = useCallback((newFilesList: FileList | File[]) => {
        const newFiles = Array.from(newFilesList).map(file => {
            const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
            return {
                id: Math.random().toString(36).substr(2, 9),
                file,
                type: isImage ? 'image/unknown' : (file.type || 'application/octet-stream'),
                preview: isImage ? URL.createObjectURL(file) : null,
                uploadStatus: 'pending'
            };
        });

        setFiles(prev => [...prev, ...newFiles]);

        if (!message) {
            if (newFiles.length === 1) {
                const f = newFiles[0];
                setMessage(f.type.startsWith('image/') ? "Analyze this image..." : "Analyze this document...");
            } else {
                setMessage(`Analyze these ${newFiles.length} files...`);
            }
        }

        newFiles.forEach(f => {
            setTimeout(() => {
                setFiles(prev => prev.map(p => p.id === f.id ? { ...p, uploadStatus: 'complete' } : p));
            }, 800 + Math.random() * 1000);
        });
    }, [message]);

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        const pastedFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                const file = items[i].getAsFile();
                if (file) pastedFiles.push(file);
            }
        }
        if (pastedFiles.length > 0) {
            e.preventDefault();
            handleFiles(pastedFiles);
            return;
        }

        const text = e.clipboardData.getData('text');
        if (text.length > 300) {
            e.preventDefault();
            const snippet = {
                id: Math.random().toString(36).substr(2, 9),
                content: text,
                timestamp: new Date()
            };
            setPastedContent(prev => [...prev, snippet]);
            if (!message) {
                setMessage("Analyze pasted text...");
            }
        }
    };

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
        baseMessageRef.current = message;
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        rec.onresult = (event: any) => {
            let finalTranscript = "";
            let interimTranscript = "";
            for (let i = 0; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) finalTranscript += t + " ";
                else interimTranscript += t;
            }
            const base = baseMessageRef.current;
            setMessage(((base ? base + " " : "") + finalTranscript + interimTranscript).trim());
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

    useEffect(() => {
        return () => {
            recognitionRef.current?.stop();
            recognitionRef.current = null;
        };
    }, []);

    const handleSend = async () => {
        if (!message.trim() && files.length === 0 && pastedContent.length === 0) return;
        
        // If Think mode is enabled, add a delay based on message length
        if (isThinkingEnabled && message.trim()) {
            const thinkingDelay = message.length < 100 ? 2000 + Math.random() * 1000 : 5000 + Math.random() * 1000;
            // You could add a loading state here if needed
            await new Promise(resolve => setTimeout(resolve, thinkingDelay));
        }
        
        onSendMessage({ message, files, pastedContent, model: "sonnet-4.5", isThinkingEnabled });
        setMessage("");
        setFiles([]);
        setPastedContent([]);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const hasContent = message.trim() || files.length > 0 || pastedContent.length > 0;

    return (
        <div
            className="relative w-full max-w-6xl mx-auto transition-all duration-300"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <div className="box-content flex flex-col mx-2 md:mx-0 items-stretch transition-all duration-300 relative z-10 rounded-[20px] cursor-text border border-white/10 bg-[#1c1c1b] shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_0_40px_-12px_rgba(239,68,68,0.45)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_52px_-10px_rgba(239,68,68,0.55)] focus-within:border-red-500/30 focus-within:shadow-[0_0_0_1px_rgba(239,68,68,0.25),0_0_60px_-8px_rgba(239,68,68,0.5)]">
                {/* Attachment box — full-width row of chips */}
                {(files.length > 0 || pastedContent.length > 0) && (
                    <div className="flex gap-2.5 overflow-x-auto px-5 pt-4">
                        {pastedContent.map(content => (
                            <PastedContentCard
                                key={content.id}
                                content={content}
                                onRemove={id => setPastedContent(prev => prev.filter(c => c.id !== id))}
                            />
                        ))}
                        {files.map(file => (
                            <FilePreviewCard
                                key={file.id}
                                file={file}
                                onRemove={id => setFiles(prev => prev.filter(f => f.id !== id))}
                            />
                        ))}
                    </div>
                )}

                {/* Text row */}
                <div className="px-5 pt-5 pb-3 relative">
                    <div className="relative flex items-start">
                        <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={(e) => {
                                setMessage(e.target.value);
                                adjustTextareaHeight();
                            }}
                            onPaste={handlePaste}
                            onKeyDown={handleKeyDown}
                            onFocus={onFocus}
                            placeholder=" "
                            disabled={disabled}
                            readOnly={readOnly}
                            className="w-full bg-transparent border-0 outline-none text-white text-[15px] placeholder:text-transparent resize-none py-0.5 leading-relaxed block antialiased overflow-y-auto scrollbar-hide"
                            rows={1}
                            autoFocus={!readOnly}
                            style={{ 
                                minHeight: '56px',
                                maxHeight: '200px'
                            }}
                        />
                        {!message && (
                            <div className="absolute inset-0 pointer-events-none flex items-start pt-0.5">
                                <span
                                    className={`text-[15px] text-zinc-500 transition-all duration-300 ${
                                        isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
                                    }`}
                                >
                                    {(placeholder ? [placeholder] : placeholders)[placeholderIndex % (placeholder ? 1 : placeholders.length)]}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action row — attach | spacer | Plan, mic, send */}
                <div className="flex items-center justify-between px-4 pb-4 pt-2 gap-2">
                    <div className="flex items-center gap-1.5">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="flex h-10 w-10 items-center justify-center rounded-full text-white bg-zinc-700/50 hover:bg-zinc-600/60 active:scale-95 transition-all duration-150"
                                    type="button"
                                    aria-label="Attach files"
                                >
                                    <Icons.Plus className="w-5 h-5" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="start"
                                side="bottom"
                                sideOffset={10}
                                className="w-60 rounded-xl border-zinc-700/70 bg-[#262626] p-1.5 shadow-2xl"
                            >
                                <DropdownMenuItem
                                    onClick={() => pdfInputRef.current?.click()}
                                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:bg-zinc-700/50 focus:text-white"
                                >
                                    <Icons.FileText className="h-4 w-4 shrink-0 text-zinc-400" />
                                    <span>Upload or add files</span>
                                    <span className="ml-auto text-xs text-zinc-500">PDF, DOCX</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 bg-zinc-700/50" />
                                <DropdownMenuItem
                                    onClick={() => imageInputRef.current?.click()}
                                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:bg-zinc-700/50 focus:text-white"
                                >
                                    <Icons.Image className="h-4 w-4 shrink-0 text-zinc-400" />
                                    <span>Add photos</span>
                                    <span className="ml-auto text-xs text-zinc-500">PNG, JPG</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1 bg-zinc-700/50" />
                                <DropdownMenuItem
                                    onClick={() => {
                                        setMessage("Scan this article and verify its claims:\n\n[Paste article URL here]");
                                        textareaRef.current?.focus();
                                    }}
                                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:bg-zinc-700/50 focus:text-white"
                                >
                                    <svg 
                                        className="h-4 w-4 shrink-0 text-zinc-400" 
                                        viewBox="0 0 24 24" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        strokeWidth="2"
                                    >
                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                    </svg>
                                    <span>Scan a source</span>
                                    <span className="ml-auto text-xs text-zinc-500">URL</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Tooltip>
                            <TooltipTrigger
                                type="button"
                                onClick={() => setIsThinkingEnabled(!isThinkingEnabled)}
                                className={`transition-all duration-200 h-10 px-4 flex items-center justify-center gap-1.5 rounded-full active:scale-95 group relative overflow-hidden
                                    ${isThinkingEnabled
                                        ? 'text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/30'
                                        : 'text-zinc-400 hover:text-white bg-transparent hover:bg-zinc-700/50'}
                                `}
                                aria-pressed={isThinkingEnabled}
                                aria-label="Think mode"
                            >
                                <Icons.Brain className={`w-4 h-4 relative z-10 transition-transform ${isThinkingEnabled ? 'scale-110' : 'scale-100'}`} />
                                <span className="text-sm font-medium relative z-10">Think</span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{isThinkingEnabled ? 'Deep reasoning enabled' : 'Enable deep reasoning'}</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger
                                type="button"
                                onClick={toggleListening}
                                onMouseEnter={() => micRef.current?.startAnimation()}
                                onMouseLeave={() => {
                                    if (!isListening) micRef.current?.stopAnimation();
                                }}
                                className={`transition-colors duration-200 h-10 w-10 flex items-center justify-center rounded-full active:scale-95
                                    ${isListening
                                        ? 'text-primary bg-primary/10 animate-pulse'
                                        : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'}
                                `}
                                aria-pressed={isListening}
                                aria-label="Voice input"
                            >
                                <MicIcon ref={micRef} size={18} />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Say it here!</p>
                            </TooltipContent>
                        </Tooltip>
                        <button
                            onClick={handleSend}
                            disabled={!hasContent}
                            className={`
                                inline-flex items-center justify-center gap-1.5 relative shrink-0 transition-all duration-200 h-10 px-6 rounded-full active:scale-95 font-medium text-[15px]
                                ${hasContent
                                    ? 'bg-white text-black hover:bg-zinc-200 shadow-md shadow-black/30'
                                    : 'bg-white/85 text-black hover:bg-white cursor-pointer'}
                            `}
                            type="button"
                            aria-label="Send message"
                        >
                            Analyze
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/10 text-black">
                                <Icons.ArrowUp className="w-4 h-4" />
                            </span>
                        </button>
                    </div>
                </div>
            </div>
            {isDragging && (
                <div className="absolute inset-0 bg-muted/90 border-2 border-dashed border-primary rounded-2xl z-50 flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
                    <Icons.Archive className="w-10 h-10 text-primary mb-2 animate-bounce" />
                    <p className="text-primary font-medium">Drop files to upload</p>
                </div>
            )}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.docx,.doc,image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files);
                    e.target.value = '';
                }}
            />
            <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*,.png,.jpg,.jpeg,.gif,.webp,.svg"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files);
                    e.target.value = '';
                }}
            />
            <input
                ref={pdfInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files);
                    e.target.value = '';
                }}
            />
        </div>
    );
};

export default ClaudeChatInput;

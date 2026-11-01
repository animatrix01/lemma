"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Playfair_Display } from "next/font/google";
import {
    Plus,
    FlaskConical,
    ChevronDown,
    Trash2,
    Pencil,
    Check,
    X,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const playfairDisplay = Playfair_Display({
    weight: ["700"],
    subsets: ["latin"],
    style: ["italic"],
    variable: "--font-playfair",
    display: "swap",
});

interface ChatSession {
    id: string;
    title: string;
    timestamp: number;
}

interface AppSidebarProps {
    hidden: boolean;
}

export function AppSidebar({ hidden }: AppSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [rail, setRail] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [recentOpen, setRecentOpen] = useState(true);
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [mounted, setMounted] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState("");
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const loadChatSessions = () => {
        try {
            const sessions = JSON.parse(localStorage.getItem("chat_sessions") || "[]");
            setChatSessions(sessions.slice(0, 20)); // Show last 20 chats
        } catch {
            setChatSessions([]);
        }
    };

    const deleteChat = (sessionId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
            // Remove from sessions list
            const sessions = JSON.parse(localStorage.getItem("chat_sessions") || "[]");
            const updated = sessions.filter((s: ChatSession) => s.id !== sessionId);
            localStorage.setItem("chat_sessions", JSON.stringify(updated));
            
            // Remove the actual chat messages
            localStorage.removeItem(`chat_${sessionId}`);
            
            // Refresh the list
            loadChatSessions();
            
            // If we're on this chat page, redirect to dashboard
            if (pathname === `/c/${sessionId}`) {
                router.push('/dashboard');
            }
        } catch (e) {
            console.error("Failed to delete chat:", e);
        }
    };

    const startEditing = (session: ChatSession, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingId(session.id);
        setEditingTitle(session.title);
    };

    const saveEdit = (sessionId: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (!editingTitle.trim()) {
            cancelEdit();
            return;
        }
        
        try {
            const sessions = JSON.parse(localStorage.getItem("chat_sessions") || "[]");
            const updated = sessions.map((s: ChatSession) => 
                s.id === sessionId ? { ...s, title: editingTitle.trim() } : s
            );
            localStorage.setItem("chat_sessions", JSON.stringify(updated));
            loadChatSessions();
            setEditingId(null);
            setEditingTitle("");
        } catch (e) {
            console.error("Failed to save edit:", e);
        }
    };

    const cancelEdit = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setEditingId(null);
        setEditingTitle("");
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        loadChatSessions();
        
        // Refresh chat sessions every 2 seconds to catch new chats
        const interval = setInterval(() => {
            loadChatSessions();
        }, 2000);
        
        return () => clearInterval(interval);
    }, [pathname, mounted]);

    if (hidden) return null;

    const expanded = !rail || hovered;

    const items = [
        { label: "New Analysis", href: "/dashboard", icon: Plus },
        { label: "Evals", href: "/evals", icon: FlaskConical },
    ];

    return (
        <aside
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={cn(
                "relative z-40 hidden shrink-0 flex-col border-r border-white/5 bg-[#0d0908] text-sidebar-foreground transition-all duration-200 md:flex",
                expanded ? "w-72" : "w-16",
                playfairDisplay.variable
            )}
        >
            {/* Header */}
            <div
                className={cn(
                    "flex items-center gap-3 px-4 pt-4 pb-3",
                    expanded ? "justify-between" : "justify-center"
                )}
            >
                {expanded ? (
                    <Link href="/dashboard" className="flex items-center gap-3 px-0">
                        <span className="font-playfair text-2xl font-bold italic tracking-wide text-white">
                            Lemma
                        </span>
                    </Link>
                ) : (
                    <Link href="/dashboard" title="LEMMA">
                        <span className="font-playfair text-xl font-bold italic text-white">
                            L
                        </span>
                    </Link>
                )}
            </div>

            {/* Nav items */}
            <nav className="flex flex-col gap-1 px-3 mt-2">
                {items.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        title={expanded ? undefined : item.label}
                        className={cn(
                            buttonVariants({
                                variant: pathname === item.href ? "secondary" : "ghost",
                            }),
                            "justify-start h-10 text-[15px] font-medium",
                            !expanded && "justify-center px-0"
                        )}
                    >
                        <item.icon className="w-5 h-5 shrink-0" />
                        {expanded && <span className="truncate">{item.label}</span>}
                    </Link>
                ))}
            </nav>

            {/* Recent section */}
            <div 
                className="mt-6 flex min-h-0 flex-1 flex-col px-3 overflow-y-auto scrollbar-hide"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }}
            >
                {/* Chat History */}
                {mounted && (
                    <>
                        <div
                            className={cn(
                                "flex items-center justify-between px-3 mb-2",
                                !expanded && "justify-center"
                            )}
                        >
                            {expanded && (
                                <button
                                    type="button"
                                    title="Toggle recent chats"
                                    onClick={() => setRecentOpen(!recentOpen)}
                                    className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Recent Chats
                                    <ChevronDown
                                        className={cn(
                                            "w-4 h-4 transition-transform",
                                            !recentOpen && "-rotate-90"
                                        )}
                                    />
                                </button>
                            )}
                        </div>

                        {expanded && recentOpen && (
                            <div className="flex flex-col gap-1 mb-4">
                                {chatSessions.length === 0 && (
                                    <div className="px-3 py-2 text-center text-xs text-muted-foreground">
                                        No chats yet
                                    </div>
                                )}
                                {chatSessions.map((session) => {
                                    const isEditing = editingId === session.id;
                                    const isHovered = hoveredId === session.id;
                                    const isActive = pathname === `/c/${session.id}`;

                                    return (
                                        <div
                                            key={session.id}
                                            className="relative group"
                                            onMouseEnter={() => setHoveredId(session.id)}
                                            onMouseLeave={() => setHoveredId(null)}
                                        >
                                            {isEditing ? (
                                                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted">
                                                    <input
                                                        type="text"
                                                        value={editingTitle}
                                                        onChange={(e) => setEditingTitle(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") saveEdit(session.id);
                                                            if (e.key === "Escape") cancelEdit();
                                                        }}
                                                        className="flex-1 bg-transparent border-none outline-none text-[15px] text-foreground"
                                                        autoFocus
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <button
                                                        onClick={(e) => saveEdit(session.id, e)}
                                                        className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
                                                    >
                                                        <Check className="w-3.5 h-3.5 text-green-500" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => cancelEdit(e)}
                                                        className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
                                                    >
                                                        <X className="w-3.5 h-3.5 text-red-500" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <Link 
                                                    href={`/c/${session.id}`}
                                                    className="block"
                                                >
                                                    <div className={cn(
                                                        "group/item flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors pr-2",
                                                        isActive ? "bg-muted" : "hover:bg-muted"
                                                    )}>
                                                        <svg 
                                                            className="w-4 h-4 shrink-0 text-muted-foreground"
                                                            viewBox="0 0 24 24" 
                                                            fill="none" 
                                                            stroke="currentColor" 
                                                            strokeWidth="2"
                                                        >
                                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                        </svg>
                                                        <span className="truncate text-[15px] text-muted-foreground group-hover/item:text-foreground leading-snug flex-1">
                                                            {session.title}
                                                        </span>
                                                        {(isHovered || isActive) && (
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button
                                                                    onClick={(e) => startEditing(session, e)}
                                                                    className="p-1.5 hover:bg-white/10 rounded transition-colors opacity-0 group-hover/item:opacity-100"
                                                                    title="Rename"
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => deleteChat(session.id, e)}
                                                                    className="p-1.5 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover/item:opacity-100"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </aside>
    );
}

export default AppSidebar;

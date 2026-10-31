"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { analyze } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const DOMAINS = ["Education", "Benefits", "Policy"] as const;

export default function Home() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [urls, setUrls] = useState<string[]>([""]);
  const [domain, setDomain] = useState<string>("Education");
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.onresult = (e: any) => setTopic(e.results[0][0].transcript);
    rec.start();
  }

  async function send() {
    setSending(true);
    const res = await analyze({ topic, question: topic, domain, urls: urls.filter(Boolean) });
    router.push(`/runs/${res.run_id}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">New Analysis</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Topic or question, optional URLs, then send.
      </p>

      <Card className="mt-6">
        <CardContent className="space-y-4 pt-6">
          <Textarea
            placeholder="What are you trying to decide?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
          />

          <div className="space-y-2">
            <div className="text-sm font-medium">URLs</div>
            {urls.map((u, i) => (
              <Input
                key={i}
                placeholder="https://..."
                value={u}
                onChange={(e) => {
                  const next = [...urls];
                  next[i] = e.target.value;
                  setUrls(next);
                }}
              />
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUrls([...urls, ""])}
            >
              + Add URL
            </Button>
          </div>

          <label className="block rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground cursor-pointer">
            Drop PDF or image here (attachments)
            <input type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          </label>
          {files.length > 0 && <div className="text-xs text-muted-foreground">{files.map((f) => f.name).join(", ")}</div>}

          <div className="flex flex-wrap gap-2">
            {DOMAINS.map((d) => (
              <Badge
                key={d}
                variant={domain === d ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setDomain(d)}
              >
                {d}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Voice input" onClick={startVoice}>
              Mic
            </Button>
            <Button className="ml-auto" onClick={send} disabled={sending}>
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
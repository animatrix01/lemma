"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6 space-y-2">
      <div className="text-destructive">Something went wrong.</div>
      <button className="underline" onClick={reset}>Retry</button>
    </div>
  );
}
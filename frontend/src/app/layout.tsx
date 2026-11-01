import type { Metadata } from "next";
import "./globals.css";

import { TooltipProvider } from "@/components/ui/tooltip";
import { DisableEditMode } from "@/components/disable-edit-mode";

export const metadata: Metadata = {
  title: "LEMMA",
  description: "Digital Dark Spot — information-gap detection",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased dark bg-[#0d0908]" contentEditable="false" suppressContentEditableWarning>
      <body 
        className="min-h-full flex bg-[#0d0908]" 
        contentEditable="false" 
        suppressContentEditableWarning
        style={{
          userSelect: 'text',
          WebkitUserModify: 'read-only',
          caretColor: 'transparent'
        }}
      >
        <DisableEditMode />
        <TooltipProvider>
          <main className="flex-1 min-w-0 bg-[#0d0908]">{children}</main>
        </TooltipProvider>
      </body>
    </html>
  );
}

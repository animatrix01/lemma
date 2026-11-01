"use client";

import { useEffect } from "react";

export function DisableEditMode() {
  useEffect(() => {
    // Aggressively disable edit mode
    const forceDisable = () => {
      document.designMode = "off";
      document.body.contentEditable = "inherit";
      document.documentElement.contentEditable = "inherit";
      
      // Remove contenteditable from all elements
      document.querySelectorAll('[contenteditable="true"]').forEach((el) => {
        if (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA") {
          el.removeAttribute("contenteditable");
        }
      });
    };
    
    forceDisable();
    
    // Run immediately
    const immediate = setInterval(forceDisable, 100);
    
    // Watch for changes
    const observer = new MutationObserver(forceDisable);
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["contenteditable", "designmode"],
      subtree: true,
      childList: true,
    });
    
    // Also listen for focus events
    document.addEventListener("focus", forceDisable, true);
    document.addEventListener("click", forceDisable, true);
    
    return () => {
      clearInterval(immediate);
      observer.disconnect();
      document.removeEventListener("focus", forceDisable, true);
      document.removeEventListener("click", forceDisable, true);
    };
  }, []);
  
  return null;
}

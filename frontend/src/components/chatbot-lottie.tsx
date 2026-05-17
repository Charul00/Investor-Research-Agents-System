"use client";

import { Bot } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AnimationItem } from "lottie-web";

type ChatbotLottieProps = {
  className?: string;
  label?: string;
};

export function ChatbotLottie({ className = "", label = "Live AI agent" }: ChatbotLottieProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let animation: AnimationItem | null = null;
    let isCancelled = false;

    async function loadAnimation() {
      try {
        const [lottieModule, animationResponse] = await Promise.all([
          import("lottie-web"),
          fetch("/Live%20chatbot.json"),
        ]);
        const animationData = await animationResponse.json();

        if (isCancelled || !containerRef.current) {
          return;
        }

        animation = lottieModule.default.loadAnimation({
          animationData,
          autoplay: true,
          container: containerRef.current,
          loop: true,
          renderer: "svg",
        });
      } catch {
        if (!isCancelled) {
          setFailed(true);
        }
      }
    }

    void loadAnimation();

    return () => {
      isCancelled = true;
      animation?.destroy();
    };
  }, []);

  if (failed) {
    return (
      <span className={`grid place-items-center ${className}`} aria-label={label} role="img">
        <Bot size={28} aria-hidden="true" />
      </span>
    );
  }

  return <div ref={containerRef} className={className} aria-label={label} role="img" />;
}

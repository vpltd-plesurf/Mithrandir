"use client";

import { User, Bot } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import SourceCitation from "./SourceCitation";

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-accent" />
        </div>
      )}
      <div
        className={`max-w-[75%] ${
          isUser
            ? "bg-accent/15 border-accent/30"
            : "bg-card border-border"
        } border rounded-xl px-4 py-3`}
      >
        <div className="font-body text-base text-text-primary leading-relaxed whitespace-pre-wrap">
          {message.content}
          {message.content === "" && !isUser && (
            <span className="text-text-secondary italic flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
              {message.status === "searching" && "Searching the library..."}
              {message.status === "reasoning" && "Reasoning..."}
              {message.status === "answering" && "Answering..."}
              {!message.status && "Thinking..."}
            </span>
          )}
        </div>
        {message.sources && message.sources.length > 0 && (
          <SourceCitation sources={message.sources} />
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center">
          <User className="w-4 h-4 text-text-secondary" />
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  const renderContent = () => {
    if (typeof content === "string") {
      // If string contains newlines, split and render each line as its own block
      if (content.includes("\n")) {
        return content.split("\n").map((line, i) => (
          <div key={i} className="whitespace-nowrap">
            {line}
          </div>
        ));
      }
      return <div className="whitespace-nowrap">{content}</div>;
    }
    return content;
  };

  return (
    <div className="relative inline-block">
      <div className="group inline-flex items-center">
        {children}
        <div className="pointer-events-none absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 scale-95 opacity-0 transition-all group-hover:opacity-100 group-hover:scale-100">
          <div className="bg-slate-900 text-white text-xs rounded py-1 px-2 shadow-lg max-w-xs text-center">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

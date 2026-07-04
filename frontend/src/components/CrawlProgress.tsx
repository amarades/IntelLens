import React, { useEffect, useRef } from "react";

interface CrawlProgressProps {
  logs: string[];
  progress: number;
  status: string;
}

export const CrawlProgress: React.FC<CrawlProgressProps> = ({ logs, progress, status }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll terminal log to bottom
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <span className="h-3 w-3 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="font-semibold text-sm text-slate-300">Crawler Terminal Status</span>
        </div>
        <span className="text-xs px-2 py-1 rounded bg-slate-800 text-blue-400 font-mono">
          {status}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-mono text-slate-400">
          <span>Operation Progress</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Console Output */}
      <div className="h-60 bg-black/40 rounded-lg p-4 font-mono text-xs text-green-400 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {logs.length === 0 ? (
          <div className="text-slate-500 italic">Awaiting connection events...</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="leading-relaxed whitespace-pre-wrap">
              <span className="text-blue-500 select-none mr-2">&gt;</span>
              {log}
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
export default CrawlProgress;

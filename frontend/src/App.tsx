import React, { useState } from "react";
import { startResearch, getResearchStreamUrl, getResearchStatus, getDownloadReportUrl } from "./services/api";
import type { ResearchResult } from "./services/api";
import { CrawlProgress } from "./components/CrawlProgress";
import { ResearchDashboard } from "./components/ResearchDashboard";
import { ChatInterface } from "./components/ChatInterface";
import { Search, Globe, MessageSquare, AlertCircle, Compass, Cpu } from "lucide-react";

export function App() {
  const [companyName, setCompanyName] = useState("");
  const [url, setUrl] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("IDLE");
  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat">("dashboard");

  const handleStartResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() && !url.trim()) {
      setError("Please specify either a Company Name or website URL.");
      return;
    }

    setError(null);
    setResult(null);
    setLogs([]);
    setProgress(0);
    setStatus("PENDING");

    try {
      const response = await startResearch(companyName.trim(), url.trim());
      const newTaskId = response.task_id;
      setTaskId(newTaskId);

      // Connect SSE stream
      const eventSourceUrl = getResearchStreamUrl(newTaskId);
      const eventSource = new EventSource(eventSourceUrl);

      eventSource.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.message) {
            setLogs((prev) => [...prev, data.message]);
          }
          if (data.progress !== undefined) {
            setProgress(data.progress);
          }
          if (data.status) {
            setStatus(data.status);
          }

          if (data.status === "COMPLETED") {
            eventSource.close();
            // Fetch final synthesized result
            const finalStatus = await getResearchStatus(newTaskId);
            if (finalStatus.result) {
              setResult(finalStatus.result);
            }
          } else if (data.status === "FAILED") {
            eventSource.close();
            setError(data.message || "An unexpected error occurred during research synthesis.");
          }
        } catch (err) {
          console.error("SSE parse error", err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setStatus("FAILED");
        setError("EventSource connection lost.");
      };

    } catch (err: any) {
      setStatus("FAILED");
      setError(err.message || "Could not launch company research.");
    }
  };

  const handleDownloadPdf = () => {
    if (!taskId) return;
    window.open(getDownloadReportUrl(taskId), "_blank");
  };

  const handleReset = () => {
    setTaskId(null);
    setStatus("IDLE");
    setProgress(0);
    setLogs([]);
    setResult(null);
    setError(null);
    setCompanyName("");
    setUrl("");
    setActiveTab("dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white pb-12">
      {/* Header Banner */}
      <nav className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={handleReset}>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Cpu size={18} className="text-white" />
            </div>
            <span className="font-extrabold text-white tracking-tight text-lg">IntelLens</span>
          </div>
          <div className="text-xs text-slate-500 font-medium">Research Engine v1.0</div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 pt-12 space-y-8">
        
        {/* State 1: IDLE / Search Submission */}
        {status === "IDLE" && (
          <div className="max-w-xl mx-auto text-center space-y-8 pt-12">
            <div className="space-y-3">
              <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
                AI-Powered Company Research Assistant
              </h1>
              <p className="text-slate-400 text-base md:text-lg">
                Intelligently crawl company domains, discover competitor overlaps, and synthesize SWOT insights and pain points instantly.
              </p>
            </div>

            <form onSubmit={handleStartResearch} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-2xl text-left space-y-6">
              <div className="space-y-4">
                {/* Company Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Company Name</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                    <input
                      type="text"
                      placeholder="e.g. Stripe"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* URL Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Website URL (Optional)</label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-3.5 text-slate-500" size={18} />
                    <input
                      type="text"
                      placeholder="e.g. https://stripe.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                Launch Research Engine
              </button>
            </form>
          </div>
        )}

        {/* State 2: Crawling & Scrape Visualization */}
        {status !== "IDLE" && !result && (
          <div className="max-w-2xl mx-auto space-y-6 pt-12">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-white">Target Synthesis Active</h2>
              <p className="text-sm text-slate-400">Wait while our crawler parses core pages and queries market indexes.</p>
            </div>
            
            <CrawlProgress logs={logs} progress={progress} status={status} />

            {error && (
              <div className="space-y-4">
                <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-rose-400 text-sm flex items-center gap-3">
                  <AlertCircle size={18} />
                  <div>
                    <h5 className="font-semibold text-white">Execution Failed</h5>
                    <p className="text-xs text-rose-400/90">{error}</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full py-3 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 text-sm font-semibold transition-colors cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        )}

        {/* State 3: Completed dossier view */}
        {result && taskId && (
          <div className="space-y-6">
            
            {/* View navigation Tabs */}
            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                    activeTab === "dashboard"
                      ? "border-blue-500 text-white"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Compass size={16} />
                    Strategic Dossier
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                    activeTab === "chat"
                      ? "border-blue-500 text-white"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare size={16} />
                    Agent Chat Q&A
                  </span>
                </button>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-4 cursor-pointer"
              >
                Analyze Another Company
              </button>
            </div>

            {activeTab === "dashboard" ? (
              <ResearchDashboard data={result} onDownloadPdf={handleDownloadPdf} />
            ) : (
              <div className="max-w-3xl mx-auto">
                <ChatInterface taskId={taskId} />
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
export default App;

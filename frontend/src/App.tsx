import React, { useState } from "react";
import { startResearch, getResearchStreamUrl, getResearchStatus, getDownloadReportUrl } from "./services/api";
import type { ResearchResult } from "./services/api";
import { CrawlProgress } from "./components/CrawlProgress";
import { ResearchDashboard } from "./components/ResearchDashboard";
import { ChatInterface } from "./components/ChatInterface";
import { Plus, Zap, Send, AlertCircle, Compass, MessageSquare, ArrowRight, Bot } from "lucide-react";

const QUICK_SEARCHES = ["notion.so", "Figma", "Linear", "Vercel", "Stripe", "Anthropic"];

const STEPS = [
  { n: 1, label: "Enter a company name or URL" },
  { n: 2, label: "Serper.dev searches and crawls it" },
  { n: 3, label: "OpenRouter AI generates insights" },
  { n: 4, label: "Download a professional PDF report" },
];

export function App() {
  // Form state
  const [searchInput, setSearchInput] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [discordToken, setDiscordToken] = useState(() => localStorage.getItem("intel_discord_token") || "");
  const [discordChannel, setDiscordChannel] = useState(() => localStorage.getItem("intel_discord_channel") || "");

  // Config sidebar state
  const [sidebarTab, setSidebarTab] = useState<"api" | "discord">("api");
  const [openRouterKey, setOpenRouterKey] = useState(() => localStorage.getItem("intel_or_key") || "");
  const [serperKey, setSerperKey] = useState(() => localStorage.getItem("intel_serper_key") || "");
  const [configSaved, setConfigSaved] = useState(false);

  // Research flow state
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("IDLE");
  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat">("dashboard");

  const handleSaveConfig = () => {
    localStorage.setItem("intel_or_key", openRouterKey.trim());
    localStorage.setItem("intel_serper_key", serperKey.trim());
    localStorage.setItem("intel_discord_token", discordToken.trim());
    localStorage.setItem("intel_discord_channel", discordChannel.trim());
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  };

  const launchResearch = async (query: string) => {
    if (!query.trim()) return;
    setError(null);
    setResult(null);
    setLogs([]);
    setProgress(0);
    setStatus("PENDING");

    // Detect if it's a URL or company name
    const isUrl = query.startsWith("http") || query.includes(".");
    const companyName = isUrl ? undefined : query;
    const urlVal = isUrl ? (query.startsWith("http") ? query : `https://${query}`) : undefined;

    try {
      const response = await startResearch(
        companyName,
        urlVal,
        applicantName.trim() || undefined,
        applicantEmail.trim() || undefined,
        discordToken.trim() || undefined,
        discordChannel.trim() || undefined
      );
      const newTaskId = response.task_id;
      setTaskId(newTaskId);

      const eventSource = new EventSource(getResearchStreamUrl(newTaskId));
      eventSource.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.message) setLogs((prev) => [...prev, data.message]);
          if (data.progress !== undefined) setProgress(data.progress);
          if (data.status) setStatus(data.status);
          if (data.status === "COMPLETED") {
            eventSource.close();
            const finalStatus = await getResearchStatus(newTaskId);
            if (finalStatus.result) setResult(finalStatus.result);
          } else if (data.status === "FAILED") {
            eventSource.close();
            setError(data.message || "An unexpected error occurred.");
          }
        } catch (err) { console.error("SSE parse error", err); }
      };
      eventSource.onerror = () => {
        eventSource.close();
        setStatus("FAILED");
        setError("Connection to server was lost.");
      };
    } catch (err: any) {
      setStatus("FAILED");
      setError(err.message || "Could not launch research.");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    launchResearch(searchInput);
  };

  const handleReset = () => {
    setTaskId(null);
    setStatus("IDLE");
    setProgress(0);
    setLogs([]);
    setResult(null);
    setError(null);
    setSearchInput("");
    setActiveTab("dashboard");
  };

  const handleDownloadPdf = () => {
    if (!taskId) return;
    window.open(getDownloadReportUrl(taskId), "_blank");
  };

  const isActive = status !== "IDLE";

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">

      {/* ─── LEFT SIDEBAR ─── */}
      <aside className="w-72 flex-shrink-0 bg-[#111111] border-r border-white/[0.06] flex flex-col overflow-y-auto">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight">IntelLens</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Company Intelligence</div>
            </div>
          </div>
        </div>

        {/* New Research Button */}
        <div className="px-4 py-4">
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 text-sm font-medium text-slate-300 transition-all cursor-pointer"
          >
            <Plus size={15} />
            New Research
          </button>
        </div>

        {/* Config Tabs */}
        <div className="px-4 pb-3">
          <div className="flex rounded-lg bg-white/[0.04] p-0.5 gap-0.5">
            <button
              onClick={() => setSidebarTab("api")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${sidebarTab === "api" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              API
            </button>
            <button
              onClick={() => setSidebarTab("discord")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${sidebarTab === "discord" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              DISCORD
            </button>
          </div>
        </div>

        {/* Config Content */}
        <div className="px-4 flex-1 space-y-4">
          {sidebarTab === "api" ? (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">OpenRouter API Key</label>
                <input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Serper.dev API Key</label>
                <input
                  type="password"
                  placeholder="Your Serper key..."
                  value={serperKey}
                  onChange={(e) => setSerperKey(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">AI Model</label>
                <select className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-colors appearance-none cursor-pointer">
                  <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="anthropic/claude-3.5-sonnet">Claude Sonnet 4.5</option>
                  <option value="openai/gpt-4o">GPT-4o</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                <div className="text-xs font-bold text-violet-300 mb-1 flex items-center gap-1.5">
                  <Bot size={12} />
                  Discord Bot Integration
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">After research completes, the report auto-sends to your configured channel.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Bot Token</label>
                <input
                  type="password"
                  placeholder="Bot token..."
                  value={discordToken}
                  onChange={(e) => setDiscordToken(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Channel ID</label>
                <input
                  type="text"
                  placeholder="000000000000000000"
                  value={discordChannel}
                  onChange={(e) => setDiscordChannel(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                />
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Applicant Details</div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500">Full Name</label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500">Email Address</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          {/* Save Config Button */}
          <button
            onClick={handleSaveConfig}
            className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${configSaved ? "bg-emerald-600 text-white" : "bg-[#F2C94C] hover:bg-[#e5bc42] text-black"}`}
          >
            {configSaved ? "✓ Saved!" : "Save Configuration"}
          </button>
        </div>

        {/* How it works */}
        <div className="px-4 py-5 border-t border-white/[0.06] space-y-3">
          <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">How it works</div>
          {STEPS.map((step) => (
            <div key={step.n} className="flex items-start gap-2.5">
              <span className="text-[10px] text-[#F2C94C] font-bold tabular-nums mt-0.5">{step.n}</span>
              <span className="text-[11px] text-slate-400 leading-relaxed">{step.label}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <div className="text-[10px] text-slate-600 uppercase tracking-widest text-center">
            OpenRouter · Serper · jsPDF
          </div>
        </div>
      </aside>

      {/* ─── RIGHT MAIN WORKSPACE ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Workspace Header */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-white">Company Research</h1>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>
          {isActive && (
            <button
              onClick={handleReset}
              className="text-[11px] text-slate-500 hover:text-slate-300 border border-white/[0.07] hover:border-white/20 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              New Research
            </button>
          )}
        </header>

        {/* ─── IDLE STATE: Hero + Bottom Search Bar ─── */}
        {status === "IDLE" && !result && (
          <div className="flex-1 flex flex-col">
            {/* Hero */}
            <div className="flex-1 flex flex-col items-center justify-center px-12 text-center space-y-6">
              <div className="text-[11px] font-bold text-[#F2C94C] uppercase tracking-[0.2em]">AI-Powered Intelligence</div>
              <h2 className="text-5xl md:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
                Know any company<br />in minutes.
              </h2>
              <p className="text-slate-400 text-base max-w-md leading-relaxed">
                Enter a company name or website URL to get AI-powered insights, competitor analysis, pain points, and a professional PDF report.
              </p>

              {/* Quick search tags */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {QUICK_SEARCHES.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { setSearchInput(tag); launchResearch(tag); }}
                    className="px-3.5 py-1.5 rounded-full border border-white/10 hover:border-white/25 hover:bg-white/5 text-xs text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-2.5">
                  <AlertCircle size={13} />
                  {error}
                </div>
              )}
            </div>

            {/* Floating Bottom Search Bar */}
            <div className="px-8 pb-6 flex-shrink-0">
              <div className="text-center text-[10px] text-slate-600 mb-3 uppercase tracking-widest">
                — Configure API keys in the sidebar to get started —
              </div>
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Enter a company name (e.g. Aurora Labs) or website URL (e.g. https://aurora.dev)..."
                  className="w-full bg-[#181818] border border-white/[0.08] hover:border-white/[0.14] focus:border-violet-500/50 rounded-xl px-5 py-4 pr-36 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 bottom-2 flex items-center gap-2 px-5 rounded-lg bg-[#F2C94C] hover:bg-[#e5bc42] text-black text-sm font-bold transition-colors cursor-pointer"
                >
                  Research
                  <ArrowRight size={14} />
                </button>
              </form>
              <div className="text-center text-[10px] text-slate-700 mt-2 uppercase tracking-widest">
                Enter to Research · Shift+Enter for New Line
              </div>
            </div>
          </div>
        )}

        {/* ─── ACTIVE STATE: Crawl terminal ─── */}
        {isActive && !result && (
          <div className="flex-1 flex flex-col overflow-hidden px-8 py-6 space-y-5">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Target Synthesis Active</h2>
              <p className="text-sm text-slate-500">Wait while our crawler parses core pages and queries market indexes.</p>
            </div>
            <div className="flex-1 overflow-auto">
              <CrawlProgress logs={logs} progress={progress} status={status} />
            </div>
            {error && (
              <div className="space-y-3 flex-shrink-0">
                <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-rose-400 text-sm flex items-center gap-3">
                  <AlertCircle size={18} />
                  <div>
                    <h5 className="font-semibold text-white">Execution Failed</h5>
                    <p className="text-xs text-rose-400/90 mt-0.5">{error}</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="w-full py-3 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 text-sm font-semibold transition-colors cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── COMPLETED STATE: Dashboard / Chat tabs ─── */}
        {result && taskId && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs bar */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-8 flex-shrink-0">
              <div className="flex">
                {(["dashboard", "chat"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-4 py-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${activeTab === tab ? "border-violet-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}
                  >
                    {tab === "dashboard" ? <><Compass size={14} /> Strategic Dossier</> : <><MessageSquare size={14} /> Agent Q&A Chat</>}
                  </button>
                ))}
              </div>
              <button
                onClick={handleReset}
                className="text-[11px] text-slate-600 hover:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> New Research
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {activeTab === "dashboard" ? (
                <ResearchDashboard data={result} onDownloadPdf={handleDownloadPdf} />
              ) : (
                <div className="max-w-3xl mx-auto">
                  <ChatInterface taskId={taskId} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

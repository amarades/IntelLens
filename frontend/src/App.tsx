import React, { useState, useRef, useEffect } from "react";
import { startResearch, getResearchStreamUrl, getResearchStatus, getDownloadReportUrl } from "./services/api";
import type { ResearchResult } from "./services/api";
import { CrawlProgress } from "./components/CrawlProgress";
import { ResearchDashboard } from "./components/ResearchDashboard";
import { ChatInterface } from "./components/ChatInterface";
import {
  Plus, Zap, Send, AlertCircle, Compass, MessageSquare,
  Bot, ChevronRight, Search, Scan
} from "lucide-react";

const QUICK_SEARCHES = [
  { label: "notion.so", icon: "📝" },
  { label: "Stripe", icon: "💳" },
  { label: "Figma", icon: "🎨" },
  { label: "Linear", icon: "📐" },
  { label: "Vercel", icon: "▲" },
  { label: "Anthropic", icon: "🤖" },
];

const STEPS = [
  { n: "01", label: "Enter company name or URL" },
  { n: "02", label: "Crawler maps the domain tree" },
  { n: "03", label: "AI synthesizes SWOT & pain points" },
  { n: "04", label: "PDF report generated instantly" },
];

export function App() {
  const [searchInput, setSearchInput] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [discordToken, setDiscordToken] = useState(() => localStorage.getItem("intel_discord_token") || "");
  const [discordChannel, setDiscordChannel] = useState(() => localStorage.getItem("intel_discord_channel") || "");
  const [sidebarTab, setSidebarTab] = useState<"api" | "discord">("api");
  const [configSaved, setConfigSaved] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("IDLE");
  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat">("dashboard");
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "IDLE") {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [status]);

  const handleSaveConfig = () => {
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
    const isUrl = query.startsWith("http") || (query.includes(".") && !query.includes(" "));
    const companyName = isUrl ? undefined : query;
    const urlVal = isUrl ? (query.startsWith("http") ? query : `https://${query}`) : undefined;
    try {
      const response = await startResearch(
        companyName, urlVal,
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
        } catch { /* */ }
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
    setTaskId(null); setStatus("IDLE"); setProgress(0);
    setLogs([]); setResult(null); setError(null);
    setSearchInput(""); setActiveTab("dashboard");
  };

  const handleDownloadPdf = () => {
    if (!taskId) return;
    window.open(getDownloadReportUrl(taskId), "_blank");
  };

  const isActive = status !== "IDLE";

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: "#070b14" }}>
      {/* Aurora ambient glow */}
      <div className="aurora-bg" />

      {/* Grid texture */}
      <div className="fixed inset-0 grid-bg opacity-100 pointer-events-none z-0" />

      {/* ─── LEFT SIDEBAR ─── */}
      <aside className="relative z-10 w-64 flex-shrink-0 flex flex-col border-r"
        style={{ background: "rgba(10,14,23,0.9)", borderColor: "rgba(255,255,255,0.06)" }}>

        {/* Logo area */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-3 mb-6">
            {/* Animated logo mark */}
            <div className="relative h-9 w-9">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 opacity-20 blur-md animate-pulse" />
              <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-xl">
                <Zap size={15} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white">IntelLens</div>
              <div style={{ fontSize: "9px", letterSpacing: "0.15em", color: "#475569" }} className="uppercase font-semibold">Intelligence Engine</div>
            </div>
          </div>

          {/* New Research button */}
          <button onClick={handleReset}
            className="w-full flex items-center gap-2 py-2.5 px-3.5 rounded-lg text-xs font-semibold text-slate-300 border transition-all cursor-pointer group"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(16,185,129,0.4)"; (e.currentTarget as HTMLElement).style.color = "#6ee7b7"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = ""; }}>
            <Plus size={13} />
            New Research
            <ChevronRight size={12} className="ml-auto opacity-40" />
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />

        {/* Config tabs */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: "rgba(255,255,255,0.04)" }}>
            {(["api", "discord"] as const).map(tab => (
              <button key={tab} onClick={() => setSidebarTab(tab)}
                className="flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer uppercase tracking-wide"
                style={{
                  background: sidebarTab === tab ? "rgba(255,255,255,0.09)" : "transparent",
                  color: sidebarTab === tab ? "#e2e8f0" : "#64748b"
                }}>
                {tab === "discord" ? "⚡ " : "🔑 "}{tab}
              </button>
            ))}
          </div>
        </div>

        {/* Config fields */}
        <div className="px-4 flex-1 overflow-y-auto space-y-4 pb-4">
          {sidebarTab === "api" ? (
            <>
              {[
                { label: "OpenRouter Key", placeholder: "sk-or-v1-...", type: "password" },
                { label: "Serper.dev Key", placeholder: "Your Serper key...", type: "password" },
              ].map(field => (
                <div key={field.label} className="space-y-1.5">
                  <label style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#475569" }} className="uppercase font-bold">
                    {field.label}
                  </label>
                  <input type={field.type} placeholder={field.placeholder}
                    className="w-full rounded-lg px-3 py-2.5 text-xs text-white input-glow transition-all"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#e2e8f0" }}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <label style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#475569" }} className="uppercase font-bold">AI Model</label>
                <select className="w-full rounded-lg px-3 py-2.5 text-xs text-white cursor-pointer appearance-none"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <option>Gemini 2.5 Flash</option>
                  <option>Claude Sonnet 4.5</option>
                  <option>GPT-4o</option>
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Discord info banner */}
              <div className="rounded-lg p-3 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, rgba(88,101,242,0.15), rgba(59,130,246,0.08))", border: "1px solid rgba(88,101,242,0.25)" }}>
                <div className="flex items-start gap-2">
                  <Bot size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-blue-300 mb-1">Auto-Delivery</div>
                    <p style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.5 }}>
                      Completed reports are sent directly to your Discord channel as a PDF attachment.
                    </p>
                  </div>
                </div>
              </div>
              {[
                { label: "Bot Token", placeholder: "Bot token...", type: "password", val: discordToken, set: setDiscordToken },
                { label: "Channel ID", placeholder: "000000000000000000", type: "text", val: discordChannel, set: setDiscordChannel },
              ].map(field => (
                <div key={field.label} className="space-y-1.5">
                  <label style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#475569" }} className="uppercase font-bold">{field.label}</label>
                  <input type={field.type} placeholder={field.placeholder} value={field.val}
                    onChange={e => field.set(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-xs text-white input-glow transition-all"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  />
                </div>
              ))}
              <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
              <div style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#475569" }} className="uppercase font-bold">Applicant Details</div>
              {[
                { label: "Full Name", placeholder: "Your full name", type: "text", val: applicantName, set: setApplicantName },
                { label: "Email Address", placeholder: "email@example.com", type: "email", val: applicantEmail, set: setApplicantEmail },
              ].map(field => (
                <div key={field.label} className="space-y-1.5">
                  <label style={{ fontSize: "9px", color: "#475569" }}>{field.label}</label>
                  <input type={field.type} placeholder={field.placeholder} value={field.val}
                    onChange={e => field.set(e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-xs text-white input-glow transition-all"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  />
                </div>
              ))}
            </>
          )}

          {/* Save button */}
          <button onClick={handleSaveConfig}
            className="w-full py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
              style={{ background: configSaved ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.12)",
                border: configSaved ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(20,184,166,0.35)",
                color: configSaved ? "#6ee7b7" : "#5eead4" }}>
            {configSaved ? "✓ Saved" : "Save Configuration"}
          </button>
        </div>

        {/* Steps */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} className="px-4 py-4 space-y-3">
          <div style={{ fontSize: "9px", letterSpacing: "0.14em", color: "#334155" }} className="uppercase font-bold">How it works</div>
          {STEPS.map((step) => (
            <div key={step.n} className="flex items-start gap-2.5">
              <span className="font-mono text-[10px] font-bold mt-0.5 flex-shrink-0" style={{ color: "#10b981" }}>{step.n}</span>
              <span style={{ fontSize: "11px", color: "#475569", lineHeight: 1.5 }}>{step.label}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ─── RIGHT MAIN WORKSPACE ─── */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">

        {/* Top nav strip */}
        <header className="flex items-center justify-between px-8 py-3.5 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(7,11,20,0.6)", backdropFilter: "blur(8px)" }}>
          <div className="flex items-center gap-3">
            <Scan size={14} className="text-emerald-400" />
            <span className="text-sm font-semibold text-slate-200">Company Research</span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
              LIVE
            </span>
          </div>
          {isActive && (
            <button onClick={handleReset}
              className="text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5"
              style={{ color: "#64748b" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#64748b"; }}>
              <Plus size={12} /> New Research
            </button>
          )}
        </header>

        {/* ── IDLE HERO ── */}
        {status === "IDLE" && !result && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Hero section */}
            <div className="flex-1 flex flex-col items-center justify-center px-12 text-center fade-up">
              {/* Eyebrow tag */}
              <div className="mb-6 flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold"
                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7", letterSpacing: "0.08em" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                AI-POWERED INTELLIGENCE
              </div>

              {/* Main headline */}
              <h1 className="text-5xl md:text-6xl font-black leading-[1.05] mb-5 tracking-tight"
                style={{ background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Decode any company<br />
                <span style={{ background: "linear-gradient(90deg, #10b981, #14b8a6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  in minutes.
                </span>
              </h1>

              {/* Subtext */}
              <p className="text-base max-w-md mb-8 leading-relaxed" style={{ color: "#64748b" }}>
                Deep-crawl any domain. Uncover SWOT analysis, tech stacks, pain points, and competitor maps with one search.
              </p>

              {/* Quick-search tags */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                {QUICK_SEARCHES.map((tag) => (
                  <button key={tag.label}
                    onClick={() => { setSearchInput(tag.label); launchResearch(tag.label); }}
                    className="research-tag flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b" }}>
                    <span>{tag.icon}</span> {tag.label}
                  </button>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-lg mt-2"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                  <AlertCircle size={13} />
                  {error}
                </div>
              )}
            </div>

            {/* Floating bottom search */}
            <div className="px-8 pb-8 flex-shrink-0">
              <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "#1e293b", textAlign: "center" }} className="mb-3 uppercase font-semibold">
                — Configure API keys in the sidebar to get started —
              </div>
              <form onSubmit={handleSearchSubmit} className="search-bar-container relative">
                {/* Animated glow ring on focus */}
                <div className="search-glow absolute -inset-px rounded-2xl pointer-events-none"
                  style={{ background: "linear-gradient(90deg, rgba(16,185,129,0.3), rgba(20,184,166,0.3))", filter: "blur(6px)" }} />
                <div className="relative flex items-center rounded-2xl overflow-hidden"
                  style={{ background: "rgba(15,21,35,0.95)", border: "1px solid rgba(255,255,255,0.09)" }}>
                  <Search size={16} className="ml-5 flex-shrink-0" style={{ color: "#334155" }} />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchInput}
                    onChange={(e) => { setSearchInput(e.target.value); setIsTyping(e.target.value.length > 0); }}
                    placeholder="Enter a company name (e.g. Notion) or website URL (e.g. https://stripe.com)..."
                    className="flex-1 px-4 py-4 text-sm bg-transparent focus:outline-none"
                    style={{ color: "#e2e8f0" }}
                  />
                  <button type="submit"
                    className="flex items-center gap-2 mx-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex-shrink-0"
                    style={{
                      background: isTyping ? "linear-gradient(135deg, #10b981, #14b8a6)" : "rgba(255,255,255,0.06)",
                      color: isTyping ? "#fff" : "#475569",
                      boxShadow: isTyping ? "0 0 20px rgba(16,185,129,0.3)" : "none"
                    }}>
                    <Send size={13} />
                    Research
                  </button>
                </div>
              </form>
              <div style={{ fontSize: "10px", color: "#1e293b", textAlign: "center", marginTop: "8px", letterSpacing: "0.05em" }}>
                ENTER to research · SHIFT+ENTER for new line
              </div>
            </div>
          </div>
        )}

        {/* ── ACTIVE CRAWLING STATE ── */}
        {isActive && !result && (
          <div className="flex-1 flex flex-col px-8 py-7 space-y-5 overflow-hidden fade-up">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {/* Animated scanner icon */}
                <div className="relative w-5 h-5">
                  <div className="absolute inset-0 rounded-full bg-emerald-500 opacity-20 animate-ping" />
                  <div className="relative w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
                    <Scan size={10} className="text-white" />
                  </div>
                </div>
                <h2 className="text-lg font-bold text-white">Target Synthesis Active</h2>
              </div>
              <p className="text-sm ml-7" style={{ color: "#475569" }}>
                Crawling domain pages and feeding AI context — this takes about 90 seconds.
              </p>
            </div>

            <div className="flex-1 overflow-auto min-h-0">
              <CrawlProgress logs={logs} progress={progress} status={status} />
            </div>

            {error && (
              <div className="flex-shrink-0 space-y-3">
                <div className="p-4 rounded-xl flex items-center gap-3 text-sm"
                  style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
                  <div>
                    <h5 className="font-semibold text-white">Execution Failed</h5>
                    <p className="text-xs mt-0.5" style={{ color: "#f87171" }}>{error}</p>
                  </div>
                </div>
                <button onClick={handleReset}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" }}>
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── COMPLETED RESULT VIEW ── */}
        {result && taskId && (
          <div className="flex-1 flex flex-col overflow-hidden fade-up">
            {/* Tabs */}
            <div className="flex items-center justify-between px-8 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex">
                {(["dashboard", "chat"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className="flex items-center gap-2 px-4 py-3.5 text-xs font-semibold border-b-2 transition-all cursor-pointer"
                    style={{
                      borderColor: activeTab === tab ? "#10b981" : "transparent",
                      color: activeTab === tab ? "#e2e8f0" : "#475569"
                    }}>
                    {tab === "dashboard"
                      ? <><Compass size={13} /> Strategic Dossier</>
                      : <><MessageSquare size={13} /> Agent Q&amp;A</>}
                  </button>
                ))}
              </div>
              <button onClick={handleReset}
                className="flex items-center gap-1.5 text-[11px] font-medium transition-all cursor-pointer"
                style={{ color: "#334155" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#334155"; }}>
                <Plus size={12} /> New Research
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {activeTab === "dashboard"
                ? <ResearchDashboard data={result} onDownloadPdf={handleDownloadPdf} />
                : <div className="max-w-3xl mx-auto"><ChatInterface taskId={taskId} /></div>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

import React from "react";
import { ResearchResult } from "../services/api";
import { TrendingUp, Target, Cpu, Download, ShieldAlert, CheckCircle } from "lucide-react";

interface ResearchDashboardProps {
  data: ResearchResult;
  onDownloadPdf: () => void;
}

export const ResearchDashboard: React.FC<ResearchDashboardProps> = ({ data, onDownloadPdf }) => {
  const profile = data.company_profile;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Profile Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{profile.name}</h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
              {profile.industry}
            </span>
          </div>
          <p className="text-slate-400 text-lg font-medium">{profile.tagline}</p>
          <div className="flex gap-4 pt-1 text-sm text-slate-500">
            <span>Size: <b>{profile.estimated_size}</b></span>
            <span>&bull;</span>
            <span>Confidence: <b>{data.confidence_score}%</b></span>
          </div>
        </div>
        <button
          onClick={onDownloadPdf}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all duration-200 shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          <Download size={18} />
          Download PDF Report
        </button>
      </div>

      {/* Description */}
      <div className="bg-slate-950 border border-slate-900 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Executive Summary</h3>
        <p className="text-slate-300 leading-relaxed text-sm md:text-base">{profile.detailed_description}</p>
      </div>

      {/* SWOT Framework */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-400" />
          Strategic SWOT Framework
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-6 space-y-3">
            <h3 className="font-bold text-emerald-400 text-base">Strengths</h3>
            <ul className="space-y-2">
              {data.swot.strengths.map((str, idx) => (
                <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">&bull;</span>
                  {str}
                </li>
              ))}
            </ul>
          </div>
          {/* Weaknesses */}
          <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-6 space-y-3">
            <h3 className="font-bold text-rose-400 text-base">Weaknesses</h3>
            <ul className="space-y-2">
              {data.swot.weaknesses.map((weak, idx) => (
                <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                  <span className="text-rose-500 mt-0.5">&bull;</span>
                  {weak}
                </li>
              ))}
            </ul>
          </div>
          {/* Opportunities */}
          <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-6 space-y-3">
            <h3 className="font-bold text-blue-400 text-base">Opportunities</h3>
            <ul className="space-y-2">
              {data.swot.opportunities.map((opp, idx) => (
                <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">&bull;</span>
                  {opp}
                </li>
              ))}
            </ul>
          </div>
          {/* Threats */}
          <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-6 space-y-3">
            <h3 className="font-bold text-amber-400 text-base">Threats</h3>
            <ul className="space-y-2">
              {data.swot.threats.map((threat, idx) => (
                <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">&bull;</span>
                  {threat}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Pain Points & Challenges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle size={18} className="text-emerald-400" />
            Customer Pain Points Resolved
          </h2>
          <ul className="space-y-3">
            {data.pain_points.customer_pain_points.map((pt, idx) => (
              <li key={idx} className="text-slate-300 text-sm leading-relaxed">
                {pt}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert size={18} className="text-rose-400" />
            Internal Scale Challenges
          </h2>
          <ul className="space-y-3">
            {data.pain_points.internal_challenges.map((ic, idx) => (
              <li key={idx} className="text-slate-300 text-sm leading-relaxed">
                {ic}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Products & Services */}
      {data.products_services.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Target size={20} className="text-blue-400" />
            Key Offerings & Solutions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.products_services.map((item, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 space-y-2">
                <h4 className="font-bold text-white text-sm">{item.name}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">{item.description}</p>
                {item.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {item.features.map((feat, fidx) => (
                      <span key={fidx} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {feat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitive Overlaps */}
      {data.competitors.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-400" />
            Competitive Landscape
          </h2>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 space-y-4">
            {data.competitors.map((comp, idx) => (
              <div key={idx} className="border-b border-slate-800 last:border-b-0 pb-4 last:pb-0 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-white text-sm flex items-center gap-2">
                    {comp.name}
                    {comp.website && (
                      <span className="text-[10px] text-slate-500 font-mono">({comp.website})</span>
                    )}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-red-950/20 text-rose-400 border border-rose-900/30">
                    Overlap: {comp.overlap_score}%
                  </span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{comp.comparison}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technologies */}
      {data.technologies.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu size={18} className="text-blue-400" />
            Detected Tech Stack
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.technologies.map((tech, idx) => (
              <span key={idx} className="text-xs px-3 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800/85">
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default ResearchDashboard;

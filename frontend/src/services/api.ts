const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://intellens.onrender.com";

export interface CompanySummary {
  name: string;
  tagline: string;
  detailed_description: string;
  industry: string;
  estimated_size: string;
}

export interface ProductServiceItem {
  name: string;
  description: string;
  features: string[];
}

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface PainPoints {
  customer_pain_points: string[];
  internal_challenges: string[];
}

export interface CompetitorInsight {
  name: string;
  website: string;
  overlap_score: number;
  comparison: string;
}

export interface ResearchResult {
  company_profile: CompanySummary;
  products_services: ProductServiceItem[];
  swot: SwotAnalysis;
  pain_points: PainPoints;
  competitors: CompetitorInsight[];
  technologies: string[];
  confidence_score: number;
}

export interface ResearchStatusResponse {
  task_id: string;
  status: string;
  progress: number;
  error?: string | null;
  result?: ResearchResult | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function startResearch(
  companyName?: string,
  url?: string,
  applicantName?: string,
  applicantEmail?: string,
  discordToken?: string,
  discordChannel?: string
): Promise<ResearchStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_name: companyName || null,
      url: url || null,
      applicant_name: applicantName || null,
      applicant_email: applicantEmail || null,
      discord_token: discordToken || null,
      discord_channel: discordChannel || null
    }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Failed to start company research.");
  }
  return response.json();
}

export async function getResearchStatus(taskId: string): Promise<ResearchStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/research/${taskId}`);
  if (!response.ok) {
    throw new Error("Failed to load research details.");
  }
  return response.json();
}

export function getResearchStreamUrl(taskId: string): string {
  return `${API_BASE_URL}/research/${taskId}/stream`;
}

export async function sendChatMessage(taskId: string, message: string, history: ChatMessage[]): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task_id: taskId, message, history }),
  });
  if (!response.ok) {
    throw new Error("Could not send chat instruction.");
  }
  const data = await response.json();
  return data.response;
}

export function getDownloadReportUrl(taskId: string): string {
  return `${API_BASE_URL}/research/${taskId}/pdf`;
}

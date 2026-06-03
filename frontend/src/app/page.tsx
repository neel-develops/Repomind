"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Star, GitFork, Eye, AlertCircle, Calendar, Shield, 
  GitBranch, Code, Clock, User, Heart, ChevronRight, Save, Loader2 
} from "lucide-react";
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from "recharts";

// Interface for Backend response
interface RepoMetadata {
  fullName: string;
  name: string;
  owner: string;
  ownerAvatarUrl: string;
  description: string | null;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  defaultBranch: string;
  primaryLanguage: string | null;
  license: string | null;
  createdDate: string;
  lastUpdatedDate: string;
}

interface Scores {
  popularity: number;
  activity: number;
  health: number;
}

interface AnalyticsData {
  repository: RepoMetadata;
  scores: Scores;
  technology: Record<string, number>;
  contributors: {
    totalCount: number;
    topContributors: Array<{ login: string; contributions: number }>;
  };
}

const BACKEND_URL = "http://localhost:8080";

// Chart Colors
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitReset, setRateLimitReset] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);

  // Observations Form State
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchRepoIntelligence = async (repoName: string) => {
    if (!repoName.trim()) return;
    setLoading(true);
    setError(null);
    setRateLimitReset(null);
    setData(null);
    setSaveSuccess(false);

    try {
      const response = await fetch(`${BACKEND_URL}/api/repo/search?query=${encodeURIComponent(repoName.trim())}`);
      const resData = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          const detail = resData.detail;
          setError(detail?.message || "Rate limit exceeded.");
          if (detail?.resetTime) {
            const date = new Date(detail.resetTime);
            setRateLimitReset(date.toLocaleTimeString());
          }
        } else {
          setError(resData.detail || "Failed to retrieve repository data.");
        }
        setLoading(false);
        return;
      }

      setData(resData);
    } catch (err: any) {
      setError("Unable to connect to the backend server. Make sure FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRepoIntelligence(searchQuery);
  };

  const handleSaveInsight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !note.trim()) return;
    setSaveLoading(true);
    setSaveSuccess(false);

    try {
      const response = await fetch(`${BACKEND_URL}/api/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoFullName: data.repository.fullName,
          note: note,
          priority: priority
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save observation");
      }

      setSaveSuccess(true);
      setNote(""); // clear note form
    } catch (err: any) {
      alert("Error saving observation to database. Verify PostgreSQL connection.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Preset repo clicks
  const presets = [
    "facebook/react",
    "vercel/next.js",
    "microsoft/vscode",
    "openai/openai-python",
    "langchain-ai/langchain"
  ];

  // Helper for formatting large numbers
  const formatNum = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  // Convert language records to recharts array
  const languageChartData = data
    ? Object.entries(data.technology).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          GitHub Repository Intelligence
        </h1>
        <p className="mt-4 text-base text-slate-400 max-w-2xl mx-auto">
          Convert raw statistics into actionable scores and professional visualizations. Discover popularity, activity updates, and codebases health metrics instantly.
        </p>
      </div>

      {/* Search Bar Container */}
      <div className="mx-auto max-w-2xl mb-8">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full rounded-xl border border-border bg-input py-4 pl-10 pr-24 text-sm text-slate-200 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Enter repository path (e.g. facebook/react)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 right-2 flex items-center">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
              </button>
            </div>
          </div>
        </form>

        {/* Suggestion tags */}
        <div className="mt-3 flex flex-wrap gap-2 justify-center items-center">
          <span className="text-xs text-slate-500">Suggestions:</span>
          {presets.map((preset) => (
            <button
              key={preset}
              onClick={() => {
                setSearchQuery(preset);
                fetchRepoIntelligence(preset);
              }}
              className="rounded-full bg-slate-800/40 border border-border px-3 py-1 text-xs text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800/80 transition-all"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Main UI State Switcher */}
      <AnimatePresence mode="wait">
        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-auto max-w-2xl rounded-xl border border-red-500/20 bg-red-950/20 p-4 mb-8 flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm text-red-200">Analysis Error</h3>
              <p className="text-xs text-red-400 mt-1">{error}</p>
              {rateLimitReset && (
                <p className="text-xs text-red-300 font-medium mt-2">
                  Rate limits will reset at: <span className="underline">{rateLimitReset}</span>
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="h-44 w-full animate-pulse rounded-xl bg-slate-800/20 border border-border" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="h-32 animate-pulse rounded-xl bg-slate-800/20 border border-border" />
              <div className="h-32 animate-pulse rounded-xl bg-slate-800/20 border border-border" />
              <div className="h-32 animate-pulse rounded-xl bg-slate-800/20 border border-border" />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="h-80 animate-pulse rounded-xl bg-slate-800/20 border border-border" />
              <div className="h-80 animate-pulse rounded-xl bg-slate-800/20 border border-border" />
            </div>
          </motion.div>
        )}

        {/* Intelligence Data Results */}
        {data && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-8"
          >
            {/* Repo General Banner */}
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-4">
                <img
                  src={data.repository.ownerAvatarUrl}
                  alt={data.repository.owner}
                  className="h-16 w-16 rounded-xl border border-slate-700 bg-slate-800"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold tracking-tight text-white">{data.repository.fullName}</h2>
                    {data.repository.license && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2.5 py-0.5 text-xs font-semibold text-slate-300 border border-border">
                        <Shield className="h-3 w-3" /> {data.repository.license}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-400 max-w-xl line-clamp-2">
                    {data.repository.description || "No description provided."}
                  </p>
                </div>
              </div>

              {/* Side facts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto">
                <div className="rounded-lg bg-slate-900/40 border border-border/55 p-3 text-center">
                  <div className="flex justify-center text-yellow-500 mb-1"><Star className="h-4 w-4" /></div>
                  <span className="block text-sm font-bold text-white">{formatNum(data.repository.stars)}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Stars</span>
                </div>
                <div className="rounded-lg bg-slate-900/40 border border-border/55 p-3 text-center">
                  <div className="flex justify-center text-blue-400 mb-1"><GitFork className="h-4 w-4" /></div>
                  <span className="block text-sm font-bold text-white">{formatNum(data.repository.forks)}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Forks</span>
                </div>
                <div className="rounded-lg bg-slate-900/40 border border-border/55 p-3 text-center">
                  <div className="flex justify-center text-teal-400 mb-1"><Eye className="h-4 w-4" /></div>
                  <span className="block text-sm font-bold text-white">{formatNum(data.repository.watchers)}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Watchers</span>
                </div>
                <div className="rounded-lg bg-slate-900/40 border border-border/55 p-3 text-center">
                  <div className="flex justify-center text-rose-500 mb-1"><AlertCircle className="h-4 w-4" /></div>
                  <span className="block text-sm font-bold text-white">{formatNum(data.repository.openIssues)}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Issues</span>
                </div>
              </div>
            </div>

            {/* Core Metrics Engines */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Popularity Card */}
              <div className="rounded-xl border border-border bg-card p-6 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-400">Popularity Score</span>
                  <Heart className="h-5 w-5 text-blue-500" />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">{data.scores.popularity}</span>
                  <span className="text-sm text-slate-500">/ 100</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Reflects user interest and community forks scale logarithmically.
                </p>
                <div className="mt-4 h-1.5 w-full rounded-full bg-slate-800">
                  <div 
                    className="h-full rounded-full bg-blue-500" 
                    style={{ width: `${data.scores.popularity}%` }}
                  />
                </div>
              </div>

              {/* Activity Card */}
              <div className="rounded-xl border border-border bg-card p-6 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-400">Activity Score</span>
                  <Clock className="h-5 w-5 text-green-500" />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">{data.scores.activity}</span>
                  <span className="text-sm text-slate-500">/ 100</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Based on commits count, PR updates, and push frequency (last 30 days).
                </p>
                <div className="mt-4 h-1.5 w-full rounded-full bg-slate-800">
                  <div 
                    className="h-full rounded-full bg-green-500" 
                    style={{ width: `${data.scores.activity}%` }}
                  />
                </div>
              </div>

              {/* Health Card */}
              <div className="rounded-xl border border-border bg-card p-6 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-400">Health Score</span>
                  <Shield className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">{data.scores.health}</span>
                  <span className="text-sm text-slate-500">/ 100</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Based on issue resolution ratios, community scale, and license protection.
                </p>
                <div className="mt-4 h-1.5 w-full rounded-full bg-slate-800">
                  <div 
                    className="h-full rounded-full bg-yellow-500" 
                    style={{ width: `${data.scores.health}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Visual Charts Layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Technologies Chart */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-base font-bold text-white mb-4">Technology Stack Distribution</h3>
                {languageChartData.length > 0 ? (
                  <div className="h-64 flex flex-col md:flex-row items-center justify-center gap-4">
                    <div className="h-full w-full md:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={languageChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {languageChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: "#131b2e", borderColor: "#1e293b" }}
                            formatter={(value) => [`${value}%`, "Share"]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Language Legends */}
                    <div className="w-full md:w-1/2 flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                      {languageChartData.map((entry, idx) => (
                        <div key={entry.name} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="font-semibold text-slate-200">{entry.name}</span>
                          </div>
                          <span className="text-slate-400">{entry.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                    No language data reported for this repository.
                  </div>
                )}
              </div>

              {/* Contributors Contributions Chart */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="text-base font-bold text-white mb-4">Top Contributor Distribution</h3>
                {data.contributors.topContributors.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.contributors.topContributors.slice(0, 10)}>
                        <XAxis 
                          dataKey="login" 
                          stroke="#64748b" 
                          fontSize={10} 
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={10} 
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#131b2e", borderColor: "#1e293b", color: "#fff" }}
                          cursor={{ fill: "rgba(59, 130, 246, 0.05)" }}
                        />
                        <Bar dataKey="contributions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                    No contributor activity metrics available.
                  </div>
                )}
              </div>
            </div>

            {/* Save Observations Dashboard Engine */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Repository detailed stats card */}
              <div className="rounded-xl border border-border bg-card p-6 lg:col-span-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-white mb-4">Repository Specifications</h3>
                  <div className="space-y-4 text-xs">
                    <div className="flex justify-between border-b border-border/40 pb-2">
                      <span className="text-slate-400 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Owner</span>
                      <span className="text-slate-200 font-semibold">{data.repository.owner}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/40 pb-2">
                      <span className="text-slate-400 flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5" /> Default Branch</span>
                      <span className="text-slate-200 font-mono font-semibold">{data.repository.defaultBranch}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/40 pb-2">
                      <span className="text-slate-400 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Created</span>
                      <span className="text-slate-200 font-semibold">
                        {new Date(data.repository.createdDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border/40 pb-2">
                      <span className="text-slate-400 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Last Updated</span>
                      <span className="text-slate-200 font-semibold">
                        {new Date(data.repository.lastUpdatedDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5"><Code className="h-3.5 w-3.5" /> Primary Tech</span>
                      <span className="text-slate-200 font-semibold">{data.repository.primaryLanguage || "None"}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-border/40 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Powered by RepoMind transformation engines
                  </span>
                </div>
              </div>

              {/* Note creator */}
              <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
                <h3 className="text-base font-bold text-white mb-4">Record Intelligence Observation</h3>
                <form onSubmit={handleSaveInsight} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Observation Note
                    </label>
                    <textarea
                      rows={4}
                      className="block w-full rounded-lg border border-border bg-input p-3 text-sm text-slate-200 placeholder-slate-500 focus:border-primary focus:outline-none"
                      placeholder="Write your qualitative notes or review observations here..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="flex items-center gap-4">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Priority Level:
                      </label>
                      <div className="inline-flex rounded-lg border border-border p-0.5 bg-input">
                        {["Low", "Medium", "High"].map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => setPriority(level)}
                            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                              priority === level
                                ? level === "High"
                                  ? "bg-red-500 text-white"
                                  : level === "Medium"
                                  ? "bg-amber-500 text-white"
                                  : "bg-blue-500 text-white"
                                : "text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={saveLoading || !note.trim()}
                      className="inline-flex w-full sm:w-auto h-10 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      {saveLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="h-4 w-4" /> Save Observation
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 rounded-lg bg-green-950/20 border border-green-500/20 p-3 text-xs text-green-400 text-center font-medium"
                  >
                    ✓ Observation saved successfully! View it in the "Saved Insights" dashboard.
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

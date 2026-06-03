"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Calendar, AlertTriangle, Shield, Trash2, Edit2, Check, X, 
  ChevronRight, ArrowUpDown, Filter, Star, GitFork, User, AlertCircle, Loader2
} from "lucide-react";

interface Repository {
  id: string;
  fullName: string;
  name: string;
  ownerName: string;
  ownerAvatarUrl: string;
  description: string | null;
  stars: number;
  forks: number;
  watchers: number;
  primaryLanguage: string | null;
}

interface Insight {
  id: string;
  repoId: string;
  note: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  repository: Repository;
}

const BACKEND_URL = "http://localhost:8080";

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortBy, setSortBy] = useState("createdAt"); // "createdAt" | "priority" | "repoName"

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState("");
  const [editingPriority, setEditingPriority] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      // Build query string params
      const params = new URLSearchParams();
      if (priorityFilter !== "All") {
        params.append("priority", priorityFilter);
      }
      if (searchQuery.trim()) {
        params.append("query", searchQuery.trim());
      }
      params.append("sortBy", sortBy);

      const response = await fetch(`${BACKEND_URL}/api/insights?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch observations.");
      }
      const data = await response.json();
      setInsights(data);
    } catch (err: any) {
      setError("Unable to connect to the backend server. Make sure PostgreSQL is online and FastAPI is running.");
    } finally {
      setLoading(false);
    }
  };

  // Run search when filters change
  useEffect(() => {
    fetchInsights();
  }, [priorityFilter, sortBy]);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      fetchInsights();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this observation note?")) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/insights/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error("Failed to delete observation");
      }

      // Remove from UI state
      setInsights(insights.filter(i => i.id !== id));
    } catch (err: any) {
      alert("Error deleting observation.");
    }
  };

  const startEdit = (insight: Insight) => {
    setEditingId(insight.id);
    setEditingNote(insight.note);
    setEditingPriority(insight.priority);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async (id: string) => {
    if (!editingNote.trim()) return;
    setEditLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/insights/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: editingNote,
          priority: editingPriority
        })
      });

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      const updated = await response.json();
      
      // Update local state
      setInsights(insights.map(i => i.id === id ? updated : i));
      setEditingId(null);
    } catch (err: any) {
      alert("Error updating observation.");
    } finally {
      setEditLoading(false);
    }
  };

  const formatNum = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case "High": return "bg-red-500/10 text-red-400 border border-red-500/20";
      case "Medium": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      default: return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Title */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Saved Intelligence Observations</h1>
          <p className="mt-1 text-sm text-slate-400">
            Audit, filter, and organize notes saved for your repositories of interest.
          </p>
        </div>
      </div>

      {/* Query Filters Dashboard */}
      <div className="rounded-xl border border-border bg-card p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-lg border border-border bg-input py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-400 focus:border-primary focus:outline-none"
            placeholder="Search by repo or note content... (press Enter)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyPress}
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Priority filter */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 flex items-center gap-1"><Filter className="h-3.5 w-3.5" /> Priority:</span>
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-input">
              {["All", "High", "Medium", "Low"].map((level) => (
                <button
                  key={level}
                  onClick={() => setPriorityFilter(level)}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
                    priorityFilter === level
                      ? "bg-slate-800 text-white border border-slate-700"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 flex items-center gap-1"><ArrowUpDown className="h-3.5 w-3.5" /> Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-border bg-input px-3 py-1.5 font-semibold text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="createdAt">Date Created</option>
              <option value="priority">Priority level</option>
              <option value="repoName">Repository Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main observation listings */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-36 w-full animate-pulse rounded-xl bg-slate-800/20 border border-border" />
            ))}
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-red-500/20 bg-red-950/10 p-6 flex flex-col items-center justify-center text-center max-w-lg mx-auto"
          >
            <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
            <h3 className="font-semibold text-red-200">Database Connection Error</h3>
            <p className="text-xs text-red-400 mt-1 max-w-sm">
              Verify that you ran `docker compose up -d` to spawn PostgreSQL and set up Prisma migration.
            </p>
            <button
              onClick={fetchInsights}
              className="mt-4 rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 transition-colors"
            >
              Retry Connection
            </button>
          </motion.div>
        ) : insights.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-border bg-card p-12 text-center max-w-md mx-auto"
          >
            <AlertTriangle className="h-10 w-10 text-slate-500 mx-auto mb-3" />
            <h3 className="font-bold text-white text-lg">No Observations Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              There are no notes matching the search/filter parameters. Write notes on the main dashboard to see them listed here!
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="rounded-xl border border-border bg-card p-5 relative transition-all hover:border-slate-700"
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  {/* Repo Metadata Header */}
                  <div className="flex items-center gap-3">
                    <img
                      src={insight.repository.ownerAvatarUrl}
                      alt={insight.repository.ownerName}
                      className="h-10 w-10 rounded-lg border border-slate-700 bg-slate-800"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-white">{insight.repository.fullName}</h4>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" /> {formatNum(insight.repository.stars)}</span>
                        <span className="flex items-center gap-1"><GitFork className="h-3 w-3 text-blue-400" /> {formatNum(insight.repository.forks)}</span>
                        <span>{insight.repository.primaryLanguage || "No Language"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 self-end md:self-start">
                    {editingId !== insight.id ? (
                      <>
                        <button
                          onClick={() => startEdit(insight)}
                          className="rounded-md border border-border bg-input p-1.5 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
                          title="Edit Note"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(insight.id)}
                          className="rounded-md border border-border bg-input p-1.5 text-red-400 hover:text-red-300 hover:border-red-500/30 hover:bg-red-550/10 transition-all"
                          title="Delete Note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Notes Block */}
                <div className="mt-4 pt-3 border-t border-border/40">
                  {editingId !== insight.id ? (
                    <div>
                      <p className="text-slate-300 text-sm whitespace-pre-line leading-relaxed">
                        {insight.note}
                      </p>
                      
                      {/* Priority Tag & Date audit */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 font-bold ${getPriorityColor(insight.priority)}`}>
                            {insight.priority} Priority
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Saved {new Date(insight.createdAt).toLocaleString()}</span>
                          {insight.createdAt !== insight.updatedAt && (
                            <span className="italic">(Updated {new Date(insight.updatedAt).toLocaleString()})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Inline Update Form */
                    <div className="space-y-4">
                      <textarea
                        rows={3}
                        className="block w-full rounded-lg border border-border bg-input p-3 text-xs text-slate-200 focus:border-primary focus:outline-none"
                        value={editingNote}
                        onChange={(e) => setEditingNote(e.target.value)}
                        required
                      />

                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Priority:
                          </span>
                          <div className="inline-flex rounded-lg border border-border p-0.5 bg-input">
                            {["Low", "Medium", "High"].map((level) => (
                              <button
                                key={level}
                                type="button"
                                onClick={() => setEditingPriority(level)}
                                className={`rounded-md px-2.5 py-0.5 text-[10px] font-semibold transition-all ${
                                  editingPriority === level
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

                        {/* Save Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={cancelEdit}
                            disabled={editLoading}
                            className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-border bg-input px-3 text-[10px] font-semibold text-slate-300 hover:text-white"
                          >
                            <X className="h-3 w-3" /> Cancel
                          </button>
                          <button
                            onClick={() => handleUpdate(insight.id)}
                            disabled={editLoading || !editingNote.trim()}
                            className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-primary px-3 text-[10px] font-semibold text-white hover:bg-blue-600"
                          >
                            {editLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-3 w-3" /> Save Changes
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

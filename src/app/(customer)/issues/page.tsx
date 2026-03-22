"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertTriangle, CheckCircle2, Briefcase, User } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

interface Issue {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface PastJob {
  id: string;
  scheduled_date: string;
  scheduled_start_time: string | null;
  status: string;
  plan_request_items: { title: string } | null;
  service_providers: { name: string } | null;
}

interface ServiceProvider {
  id: string;
  name: string;
}

type IssueCategory = "past_job" | "provider" | null;

export default function CustomerIssuesPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Category selection
  const [category, setCategory] = useState<IssueCategory>(null);

  // Past job flow
  const [pastJobs, setPastJobs] = useState<PastJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");

  // Provider flow
  const [providerList, setProviderList] = useState<ServiceProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [selectedProviderName, setSelectedProviderName] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/customer/issues")
      .then((r) => r.json())
      .then((d) => {
        setIssues(d.issues ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (category === "past_job") {
      setLoadingJobs(true);
      fetch("/api/customer/jobs/history")
        .then((r) => r.json())
        .then((d) => setPastJobs(d.jobs ?? []))
        .catch(() => setPastJobs([]))
        .finally(() => setLoadingJobs(false));
    } else if (category === "provider") {
      setLoadingProviders(true);
      fetch("/api/customer/providers")
        .then((r) => r.json())
        .then((d) => setProviderList(d.providers ?? []))
        .catch(() => setProviderList([]))
        .finally(() => setLoadingProviders(false));
    }
    setSelectedJobId("");
    setSelectedProviderId("");
    setSelectedProviderName("");
  }, [category]);

  const showForm =
    (category === "past_job" && selectedJobId) ||
    (category === "provider" && selectedProviderId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
      };
      if (category === "past_job" && selectedJobId) {
        body.job_allocation_id = selectedJobId;
      }
      if (category === "provider" && selectedProviderName) {
        body.description = `Provider context: ${selectedProviderName}${description.trim() ? `\n\n${description.trim()}` : ""}`;
      }
      const res = await fetch("/api/customer/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to raise issue. Please try again.");
        return;
      }
      setSuccess(true);
      setTitle("");
      setDescription("");
      setCategory(null);
      setSelectedJobId("");
      setSelectedProviderId("");
      if (data.issue) {
        setIssues((prev) => [data.issue, ...prev]);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-[480px] mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 rounded-full hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800 flex-1">Raise an Issue</h1>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 py-6 space-y-4">
        {/* Success banner */}
        {success && (
          <div className="bg-green-50 rounded-2xl border border-green-100 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <p className="text-sm text-green-700 font-medium">
              Issue raised! Our team will look into it shortly.
            </p>
          </div>
        )}

        {/* Step 1: Category */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">What is your issue about?</p>
          <div className="space-y-2">
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                category === "past_job"
                  ? "border-[#004aad] bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="category"
                checked={category === "past_job"}
                onChange={() => setCategory("past_job")}
                className="mt-0.5 accent-[#004aad]"
              />
              <div className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Report about a past job</p>
                  <p className="text-xs text-gray-500">Something went wrong with a scheduled service</p>
                </div>
              </div>
            </label>
            <label
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                category === "provider"
                  ? "border-[#004aad] bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="category"
                checked={category === "provider"}
                onChange={() => setCategory("provider")}
                className="mt-0.5 accent-[#004aad]"
              />
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Report about a provider</p>
                  <p className="text-xs text-gray-500">Feedback or complaint about a service provider</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Step 2a: Select past job */}
        {category === "past_job" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Select the Job</p>
            {loadingJobs ? (
              <div className="flex items-center gap-2 py-2">
                <div className="w-4 h-4 border-2 border-[#004aad] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-400">Loading your past jobs…</span>
              </div>
            ) : pastJobs.length === 0 ? (
              <p className="text-sm text-gray-400">No completed jobs found.</p>
            ) : (
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
              >
                <option value="">Choose a job…</option>
                {pastJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.plan_request_items?.title ?? "Job"} ·{" "}
                    {new Date(job.scheduled_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {job.service_providers?.name ? ` · ${job.service_providers.name}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Step 2b: Select provider */}
        {category === "provider" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Select the Provider</p>
            {loadingProviders ? (
              <div className="flex items-center gap-2 py-2">
                <div className="w-4 h-4 border-2 border-[#004aad] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-400">Loading providers…</span>
              </div>
            ) : providerList.length === 0 ? (
              <p className="text-sm text-gray-400">No providers found.</p>
            ) : (
              <select
                value={selectedProviderId}
                onChange={(e) => {
                  setSelectedProviderId(e.target.value);
                  const p = providerList.find((p) => p.id === e.target.value);
                  setSelectedProviderName(p?.name ?? "");
                }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30"
              >
                <option value="">Choose a provider…</option>
                {providerList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Step 3: Issue form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <p className="text-sm font-semibold text-gray-700">Describe Your Issue</p>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Issue Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Helper did not arrive today"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30 focus:border-[#004aad]"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Details (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Please provide any additional details…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004aad]/30 focus:border-[#004aad] resize-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="w-full py-3 rounded-xl bg-[#004aad] text-white font-semibold text-sm disabled:opacity-50 transition-opacity"
            >
              {submitting ? "Submitting…" : "Raise Issue"}
            </button>
          </form>
        )}

        {/* Past issues */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#004aad] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : issues.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">My Issues</p>
            {issues.map((issue) => (
              <div key={issue.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-medium text-gray-900 text-sm flex-1 leading-snug">{issue.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[issue.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {issue.status.replace("_", " ")}
                  </span>
                </div>
                {issue.description && !issue.description.startsWith("Provider context:") && (
                  <p className="text-xs text-gray-500 mb-1">{issue.description}</p>
                )}
                <p className="text-xs text-gray-400">
                  {new Date(issue.created_at).toLocaleDateString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="py-8 flex flex-col items-center gap-3 text-gray-400">
              <AlertTriangle className="w-10 h-10 text-gray-300" />
              <p className="text-sm">No issues raised yet</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

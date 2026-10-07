"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  Calendar,
  Check,
  Clock3,
  Download,
  ExternalLink,
  Filter,
  Flame,
  FileSearch,
  Inbox,
  LayoutDashboard,
  Loader2,
  RefreshCcw,
  Search,
  Sparkles,
  Target,
  ThumbsDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { PIPELINE_STAGES, type Lead, type PipelineStage } from "@/lib/scoring";

import ProspectPanel from "./prospect-panel";

interface LeadsResponse {
  leads: Lead[];
  clientRegistry?: {loaded:boolean;accounts:number};
  mode: "example" | "pilot";
  isoWeek: string;
  addedThisWeek: number;
  weeklyTarget: number;
  lastRun: { runAt: string; added: number; candidatesReviewed: number } | null;
}

const stageLabel: Record<PipelineStage, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.value, s.label])
) as Record<PipelineStage, string>;

export default function Home() {
  const leadVersions = useRef(new Map<string,number>());
  const saveQueue = useRef(Promise.resolve());
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meta, setMeta] = useState<Omit<LeadsResponse, "leads"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(true);
  const [highFitOnly, setHighFitOnly] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [scope,setScope] = useState("all");
  const [stageFilter,setStageFilter] = useState("all");
  const [serviceFilter,setServiceFilter] = useState("all");
  const [workFilter,setWorkFilter] = useState("all");

  const loadLeads = useCallback(async () => {
    const res = await fetch("/api/leads", { cache: "no-store" });
    if (!res.ok) throw new Error("Pipeline unavailable; retry after checking access and database.");
    const data = (await res.json()) as LeadsResponse;
    leadVersions.current = new Map(data.leads.map(l=>[l.id,l.version??0]));
    setLeads(data.leads);
    setMeta({
      clientRegistry: data.clientRegistry,
      mode: data.mode,
      isoWeek: data.isoWeek,
      addedThisWeek: data.addedThisWeek,
      weeklyTarget: data.weeklyTarget,
      lastRun: data.lastRun,
    });
    setSelectedId((current) => current ?? data.leads[0]?.id ?? null);
    return data;
  }, []);

  useEffect(() => {
    loadLeads().catch(e => toast.error(e.message)).finally(() => setLoading(false));
  }, [loadLeads]);

  const thisWeekLeads = useMemo(
    () => (meta ? leads.filter((l) => l.weekAdded === meta.isoWeek) : leads),
    [leads, meta]
  );

  const visible = useMemo(
    () =>
      leads.filter(
        (l) =>
          (scope === "all" || l.weekAdded === meta?.isoWeek) &&
          (stageFilter === "all" || l.stage === stageFilter) &&
          (serviceFilter === "all" || l.serviceLine === serviceFilter) &&
          (workFilter !== "followups" || (!!l.followUpDate && l.followUpDate <= new Date().toLocaleDateString("en-CA") && !["won","lost"].includes(l.stage))) &&
          (workFilter !== "review" || !l.checkedAt || Date.now()-Date.parse(l.checkedAt)>7*86400000) &&
          (filter === "all" || l.sourceType === filter) &&
          (!highFitOnly || l.fit >= 85) &&
          (l.organization.toLowerCase().includes(query.toLowerCase()) ||
            l.serviceLine.toLowerCase().includes(query.toLowerCase()) ||
            l.title.toLowerCase().includes(query.toLowerCase()))
      ),
    [leads, meta, scope, stageFilter, serviceFilter, workFilter, filter, highFitOnly, query]
  );

  const selected = useMemo(
    () => leads.find((l) => l.id === selectedId) ?? null,
    [leads, selectedId]
  );

  useEffect(() => {
    setNoteDraft(selected?.notes ?? "");
    // Intentionally only reset the draft when the *selection* changes, not
    // on every notes update (which includes our own optimistic saves).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const rfpCount = thisWeekLeads.filter((l) => l.sourceType === "rfp").length;
  const jobCount = thisWeekLeads.filter((l) => l.sourceType === "job_posting").length;
  const highFitCount = thisWeekLeads.filter((l) => l.fit >= 85).length;
  const activeCount = leads.filter((l) => l.stage !== "won" && l.stage !== "lost").length;
  const wonCount = leads.filter((l) => l.stage === "won").length;

  const patchLead = useCallback(
    async (id: string, patch: { stage?: PipelineStage; notes?: string; owner?: string; nextAction?: string; followUpDate?: string }) => {
      const operation = saveQueue.current.then(async () => {
      try {
        const res = await fetch(`/api/leads/${encodeURIComponent(id)}`, {method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({...patch,version:leadVersions.current.get(id)??0})});
        if (!res.ok) throw new Error((await res.json()).error || "Save failed");
        const {lead}=await res.json(); leadVersions.current.set(id,lead.version??0); setLeads(cur=>cur.map(l=>l.id===id?lead:l)); toast.success("Change saved");
      } catch(error) {toast.error(error instanceof Error?error.message:"Save failed"); await loadLeads().catch(()=>{});}
      });
      saveQueue.current = operation;
      await operation;
    },
    [loadLeads]
  );

  const setStage = (id: string, stage: PipelineStage) => {
    patchLead(id, { stage });

  };

  const saveNotes = () => {
    if (!selected || selected.notes === noteDraft) return;
    patchLead(selected.id, { notes: noteDraft });

  };

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      const data = await loadLeads();
      toast.success(
        data.lastRun
          ? `Pipeline current as of ${new Date(data.lastRun.runAt).toLocaleString()}`
          : "No search run has landed yet"
      );
    } catch(error) { toast.error(error instanceof Error ? error.message : "Refresh failed"); } finally {
      setChecking(false);
    }
  };

  const exportCsv = async () => {
    let saved: LeadsResponse; try { saved = await loadLeads(); } catch { toast.error("Cannot export unsaved/unavailable data."); return; }
    const rows = [
      ["Organization", "Type", "Fit", "Service line", "Title", "Location", "Deadline", "Stage", "URL", "Notes", "Owner", "Checked at", "Next action", "Follow-up date", "Client screening"],
      ...saved.leads.map((l) => [
        l.organization,
        l.sourceType === "rfp" ? "RFP" : "Job posting",
        String(l.fit),
        l.serviceLine,
        l.title,
        l.location,
        l.deadline ?? "",
        stageLabel[l.stage],
        l.url, l.notes, l.owner ?? "Unassigned", l.checkedAt ?? "Unverified", l.nextAction ?? "", l.followUpDate ?? "", l.clientCheck?.reason ?? "Not checked",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${(/^\s*[=+@-]/.test(v) ? "'" + v : v).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "keena-weekly-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Lead queue exported");
  };

  const copyBrief = async () => {
    if (!selected) return;
    try { await navigator.clipboard.writeText(
      `${selected.organization}\n${selected.title}\n${selected.url}\nFit: ${selected.fit}/100\nSignal: ${selected.signal} · Checked: ${selected.checkedAt ?? "Unverified"} · ${(!selected.checkedAt || Date.now()-Date.parse(selected.checkedAt)>7*86400000) ? "Source review overdue" : "Recently checked"} · ${selected.deadline && Date.parse(selected.deadline)<Date.now() ? "EXPIRED — do not pursue" : "Verify source before pursuing"}\nKeena fit: ${selected.serviceLine}\n\n${noteDraft}`
    );
    toast.success("Lead brief copied"); } catch { toast.error("Clipboard unavailable; copy from the lead details."); }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f7] text-[#222]">
      <div role="status" className="p-3">{meta?.clientRegistry?.loaded ? `${meta.clientRegistry.accounts} active-client names loaded for screening. ` : "Active-client registry unavailable — review accounts before outreach. "}{meta?.mode === "example" ? "Fictional demo queue — no real procurement or customer evidence." : "Local internal workspace — supervised source review; job postings are fit hypotheses, not confirmed buying intent."}</div>
      <Toaster position="top-right" richColors />
      <header className="topbar">
        <div className="brand-lockup" aria-label="Keena Growth Operations">
          <span className="brand-mark">
            <span>K</span>
          </span>
          <div>
            <strong>KEENA</strong>
            <small>GROWTH OPS</small>
          </div>
        </div>
        <nav className="topnav" aria-label="Primary navigation">
          <button className="active" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <LayoutDashboard />
            Command center
          </button>
          <button onClick={() => document.getElementById("lead-queue")?.scrollIntoView({ behavior: "smooth" })}>
            <Target />
            Pipeline
          </button>
          <button onClick={() => document.getElementById("feed-info")?.scrollIntoView({ behavior: "smooth" })}>
            <Bot />
            Data feed
          </button>
        </nav>
        <div className="top-actions">
          <span className="live-pill">
            <i />
            {loading ? "Loading…" : `${meta?.addedThisWeek ?? 0}/${meta?.weeklyTarget ?? 15} this week`}
          </span>
          <Button className="avatar" aria-label="Account menu">
            KH
          </Button>
        </div>
      </header>
      <main className="shell">
        <section className="intro">
          <div>
            <p className="eyebrow">{meta?.isoWeek ?? "…"} · REAL RFPS &amp; JOB POSTINGS</p>
            <h1>Your growth command center</h1>
            <p>Up to 15 real open RFPs and job postings a week, matched to Keena&apos;s service lines.</p>
          </div>
          <div className="intro-actions">
            <Button variant="outline" onClick={exportCsv}>
              <Download />
              Export CSV
            </Button>
            <Button className="run-button" onClick={checkForUpdates} disabled={checking}>
              {checking ? <Loader2 className="animate-spin" /> : <RefreshCcw />}
              {checking ? "Checking…" : "Reload saved queue"}
            </Button>
          </div>
        </section>
        <section className="kpis" aria-label="Weekly lead metrics">
          <article>
            <div className="metric-icon red">
              <Target />
            </div>
            <div>
              <span>This week&apos;s leads</span>
              <strong>{meta?.addedThisWeek ?? 0}</strong>
              <small>
                of <b>{meta?.weeklyTarget ?? 15}</b> weekly target
              </small>
            </div>
          </article>
          <article>
            <div className="metric-icon amber">
              <Flame />
            </div>
            <div>
              <span>High service fit</span>
              <strong>{highFitCount}</strong>
              <small>Fit score 85 or above</small>
            </div>
          </article>
          <article>
            <div className="metric-icon blue">
              <Inbox />
            </div>
            <div>
              <span>RFPs / job postings</span>
              <strong>
                {rfpCount} <em>/</em> {jobCount}
              </strong>
              <small>Open procurement vs. hiring signal</small>
            </div>
          </article>
          <article>
            <div className="metric-icon dark">
              <Clock3 />
            </div>
            <div>
              <span>Active pipeline</span>
              <strong>{activeCount}</strong>
              <small>{wonCount} won all-time</small>
            </div>
          </article>
        </section>
        <section className="workspace" id="lead-queue">
          <div className="queue-panel">
            <div className="panel-head">
              <div>
                <h2>Opportunity queue</h2>
                <p>Filter opportunities, review evidence, and plan your next move</p>
              </div>
              <div className="queue-actions">
                <label className="searchbox">
                  <Search />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search leads" />
                </label>
                <Button
                  variant={highFitOnly ? "secondary" : "outline"}
                  className="filter-btn"
                  onClick={() => setHighFitOnly((v) => !v)}
                >
                  <Filter />
                  {highFitOnly ? "High fit on" : "High fit"}
                </Button>
              </div>
            </div>
            <div className="queue-filters">
              <label>Period<select value={scope} onChange={e=>setScope(e.target.value)}><option value="all">All time</option><option value="week">This week</option></select></label>
              <label>Stage<select value={stageFilter} onChange={e=>setStageFilter(e.target.value)}><option value="all">All stages</option>{PIPELINE_STAGES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
              <label>Service line<select value={serviceFilter} onChange={e=>setServiceFilter(e.target.value)}><option value="all">All services</option>{[...new Set(leads.map(l=>l.serviceLine))].sort().map(s=><option key={s}>{s}</option>)}</select></label>
              <label>Work queue<select value={workFilter} onChange={e=>setWorkFilter(e.target.value)}><option value="all">All work</option><option value="followups">Follow-ups due</option><option value="review">Source review overdue</option></select></label>
            </div>
            <Tabs value={filter} onValueChange={setFilter} className="lead-tabs">
              <TabsList>
                <TabsTrigger value="all">All {leads.length}</TabsTrigger>
                <TabsTrigger value="rfp">RFPs {leads.filter(l=>l.sourceType==="rfp").length}</TabsTrigger>
                <TabsTrigger value="job_posting">Jobs {leads.filter(l=>l.sourceType==="job_posting").length}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Table className="lead-table">
              <TableHeader>
                <TableRow>
                  <TableHead>ORGANIZATION</TableHead>
                  <TableHead>TYPE</TableHead>
                  <TableHead>FIT</TableHead>
                  <TableHead>WHY NOW</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((l) => (
                  <TableRow
                    key={l.id}
                    data-state={selected?.id === l.id ? "selected" : undefined}
                    onClick={() => {
                      setSelectedId(l.id);
                      setDrawer(true);
                    }}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="account">
                        <span className="company-avatar">{l.initials}</span>
                        <div>
                          <strong>{l.organization}</strong>
                          <span>{l.title}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`source ${l.sourceType === "rfp" ? "inbound" : "outbound"}`}>
                        {l.sourceType === "rfp" ? "RFP" : "Job"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="fit-cell">
                        <strong>{l.fit}</strong>
                        <Progress value={l.fit} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="signal">
                        <strong>{l.signal}</strong>
                        <span>{l.serviceLine} · {l.clientCheck?.reason}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {l.stage === "won" ? (
                        <span className="approved">
                          <Check />
                          Won
                        </span>
                      ) : l.stage === "lost" ? (
                        <span className="rejected">
                          <ThumbsDown />
                          Lost
                        </span>
                      ) : (
                        <span className="stage-pill">{stageLabel[l.stage]}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!loading && visible.length === 0 && (
              <div className="empty-state">
                <Search />
                <strong>No leads match</strong>
                <span>
                  {thisWeekLeads.length === 0
                    ? "No opportunities in this view. Reload reads saved data; ingest source candidates to add opportunities."
                    : "Clear the search or high-fit filter."}
                </span>
              </div>
            )}
            <div className="table-foot">
              <span>Showing {visible.length} of {leads.length} saved opportunities</span>
              <span>{leads.length} total in pipeline</span>
            </div>
          </div>
          <aside className={`detail-panel ${drawer && selected ? "open" : "closed"}`} aria-label="Selected lead details">
            {selected && (
              <>
                <div className="detail-head">
                  <p>LEAD BRIEF</p>
                  <button onClick={() => setDrawer(false)} aria-label="Close lead details">
                    <X />
                  </button>
                </div>
                <div className="detail-company">
                  <span className="company-avatar large">{selected.initials}</span>
                  <div>
                    <h2>{selected.organization}</h2>
                    <p>{selected.title}</p>
                  </div>
                </div>
                <div className="score-block">
                  <div>
                    <span>KEENA FIT SCORE</span>
                    <strong>
                      {selected.fit}
                      <small>/100</small>
                    </strong>
                  </div>
                  <Progress value={selected.fit} />
                </div>
                <div className="brief-section">
                  <h3>Why this account, why now</h3>
                  <p>
                    {selected.sourceType === "rfp" ? "An open RFP" : "An open job requisition"} at{" "}
                    {selected.organization} matches <strong>{selected.serviceLine}</strong>. Matched on:
                    &ldquo;{selected.matchedKeyword}&rdquo;. {selected.signal} · Checked: {selected.checkedAt ?? "Unverified"} · {(!selected.checkedAt || Date.now()-Date.parse(selected.checkedAt)>7*86400000) ? "Source review overdue" : "Recently checked"} · {selected.deadline && Date.parse(selected.deadline)<Date.now() ? "EXPIRED — do not pursue" : "Verify source before pursuing"}
                    {selected.postedDate && ` Posted ${selected.postedDate}.`}
                  </p>
                </div>
                <div className="brief-section">
                  <h3>Client screening and product fit</h3>
                  <p>{selected.clientCheck?.reason ?? "Client screening requires review"}</p>
                  {selected.offeringMatches?.map(m=><p key={m.product}><strong>{m.product}</strong> · Deck slides {m.slides}<br/>Buyer roles: {m.buyerTitles.join(", ")}</p>)}
                  <p>Discovery: confirm current EHR, scope, account owner, decision process, budget approval and project timing. Fit is a rules score, not a win probability.</p>
                </div>
                <div className="brief-section">
                  <h3>Pipeline stage</h3>
                  <div className="stage-grid">
                    {PIPELINE_STAGES.map((s) => (
                      <button
                        key={s.value}
                        className={`stage-chip ${selected.stage === s.value ? "active" : ""}`}
                        onClick={() => setStage(selected.id, s.value)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="brief-section">
                  <h3>Source</h3>
                  <label>Follow-up owner <input key={selected.id} defaultValue={selected.owner ?? "Unassigned"} maxLength={120} onBlur={e => { if (e.target.value !== selected.owner) patchLead(selected.id, {owner:e.target.value}); }} /></label>
                  <a className="buyer-card" href={selected.url} target="_blank" rel="noreferrer">
                    {selected.sourceType === "rfp" ? <FileSearch /> : <Calendar />}
                    <div>
                      <strong>{selected.sourceType === "rfp" ? "View the RFP notice" : "View the job posting"}</strong>
                      <span className="source-link">
                        {selected.url} <ExternalLink size={11} />
                      </span>
                    </div>
                  </a>
                </div>
                <div className="brief-section">
                  <h3>Next action &amp; follow-up</h3>
                  <label>Next action<input key={`action-${selected.id}`} defaultValue={selected.nextAction??""} maxLength={500} onBlur={e=>{if(e.target.value!==(selected.nextAction??""))patchLead(selected.id,{nextAction:e.target.value});}}/></label>
                  <label>Follow-up date<input type="date" value={selected.followUpDate??""} onChange={e=>patchLead(selected.id,{followUpDate:e.target.value})}/></label>
                  <h3>Research notes</h3>
                  <textarea
                    className="notes"
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    onBlur={saveNotes}
                    placeholder="Add qualification notes, objections, or next steps…"
                  />
                </div>
                <div className="detail-actions three">
                  <Button onClick={() => setStage(selected.id, "won")} disabled={selected.stage === "won"}>
                    <Check />
                    Won
                  </Button>
                  <Button variant="outline" onClick={() => setStage(selected.id, "lost")}>
                    <ThumbsDown />
                    Lost
                  </Button>
                  <Button variant="outline" onClick={copyBrief}>
                    <ArrowUpRight />
                    Copy brief
                  </Button>
                </div>
              </>
            )}
          </aside>
        </section>
        <ProspectPanel />
        <section className="agent-section" id="feed-info">
          <div className="agent-heading">
            <div>
              <p className="eyebrow">HOW THIS FEED WORKS</p>
              <h2>Real RFPs and job postings, found by search.</h2>
            </div>
            <p>
              <Sparkles />
              Last run: {meta?.lastRun ? new Date(meta.lastRun.runAt).toLocaleString() : "never"}
            </p>
          </div>
          <div className="agent-grid">
            <article className="chief">
              <div className="agent-top">
                <span className="agent-icon">
                  <Sparkles />
                </span>
                <span className="agent-status">
                  <i />
                  {meta?.addedThisWeek ?? 0}/{meta?.weeklyTarget ?? 15} added this week
                </span>
              </div>
              <h3>Weekly search run</h3>
              <p>
                A supervised research session can search the web for open RFPs and job postings matching Keena&apos;s
                service lines, then tops the pipeline up to 15 new leads — never repeating a URL already in the
                pipeline, and never surfacing an RFP whose deadline has passed.
              </p>
            </article>
            <article>
              <div className="agent-top">
                <span className="agent-icon">
                  <FileSearch />
                </span>
                <span className="agent-status">RFPs</span>
              </div>
              <h3>Open procurement</h3>
              <p>Real solicitation notices from government and health-system procurement pages, with a live link.</p>
            </article>
            <article>
              <div className="agent-top">
                <span className="agent-icon">
                  <Bot />
                </span>
                <span className="agent-status">Jobs</span>
              </div>
              <h3>Hiring signal</h3>
              <p>Job postings indicate service fit. They do not establish procurement budget or intent.</p>
            </article>
            <article>
              <div className="agent-top">
                <span className="agent-icon">
                  <Target />
                </span>
                <span className="agent-status">Scored</span>
              </div>
              <h3>Keyword ICP match</h3>
              <p>Every posting is matched to a real Keena service line and scored by fit, type, and recency.</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

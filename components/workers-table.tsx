"use client"

import { useEffect, useMemo, useState } from "react"
import { useWorkersStore } from "@/lib/workers-store"
import {
  type Worker,
  TEAM_OPTIONS,
  STATUS_OPTIONS,
  generateTimeSlots,
  getWeekDateRange,
  formatDateForFilter,
  formatDateDisplay,
  isTimeInRange,
  formatTimeRange,
} from "@/lib/worker-types"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { 
  RefreshCw, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  Search,
  X,
  Clock,
  Users,
  Filter
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Mail } from "lucide-react"

// Function to normalize text (remove accents and convert to lowercase)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

// Function to check if a worker matches a search term flexibly
function flexibleMatch(workerValue: string | null | undefined, searchTerm: string): boolean {
  if (!workerValue) return false
  
  const normalizedWorker = normalizeText(workerValue)
  const normalizedSearch = normalizeText(searchTerm)
  
  // Direct contains match
  if (normalizedWorker.includes(normalizedSearch)) return true
  
  // Check if all words in search are contained in worker value (in any order)
  const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length > 0)
  const workerWords = normalizedWorker.split(/\s+/).filter(w => w.length > 0)
  
  // Check if every search word is contained in some worker word
  const allWordsMatch = searchWords.every(searchWord =>
    workerWords.some(workerWord => workerWord.includes(searchWord))
  )
  
  return allWordsMatch
}

const TIME_SLOTS = generateTimeSlots()
const ITEMS_PER_PAGE = 50

export function WorkersTable() {
  const {
    workers,
    isLoading,
    error,
    filters,
    setFilters,
    resetFilters,
    fetchWorkers,
  } = useWorkersStore()

  const [currentPage, setCurrentPage] = useState(1)
  const [copied, setCopied] = useState(false)
  const [copiedEmails, setCopiedEmails] = useState(false)
  const [dateOptions, setDateOptions] = useState<{ value: string; label: string }[]>([])
  const [showTimeSlots, setShowTimeSlots] = useState(false)

  // Initialize date options
  useEffect(() => {
    const { dates } = getWeekDateRange()
    const options = [
      { value: "all", label: "All Dates" },
      ...dates.map((d) => ({
        value: formatDateForFilter(d),
        label: formatDateDisplay(d),
      })),
    ]
    setDateOptions(options)
  }, [])

  // Fetch workers on mount
  useEffect(() => {
    fetchWorkers()
  }, [fetchWorkers])

  // Filter workers
  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      // Team filter
      if (filters.team !== "All Teams" && worker.team?.name !== filters.team) {
        return false
      }

      // Status filter
      if (filters.status !== "All" && worker.status?.name !== filters.status) {
        return false
      }

      // Search text filter (document, name, or email) - with flexible matching
      if (filters.searchText.trim()) {
        const searchTerms = filters.searchText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)

        if (searchTerms.length > 0) {
          const matchesAny = searchTerms.some((term) => {
            return (
              flexibleMatch(worker.document, term) ||
              flexibleMatch(worker.name, term) ||
              flexibleMatch(worker.api_email, term)
            )
          })
          if (!matchesAny) return false
        }
      }

      // Date and time slot filter
      if (filters.dateRange || filters.timeSlot) {
        const matchingSchedule = worker.schedules?.find((schedule) => {
          // Date filter - check start_date_pe
          if (filters.dateRange) {
            if (schedule.start_date_pe !== filters.dateRange) return false
          }

          // Time slot filter
          if (filters.timeSlot) {
            return isTimeInRange(
              schedule.start_time_pe,
              schedule.end_time_pe,
              filters.timeSlot
            )
          }

          return true
        })

        if (!matchingSchedule) return false
      }

      return true
    })
  }, [workers, filters])

  // Paginated workers
  const paginatedWorkers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredWorkers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredWorkers, currentPage])

  const totalPages = Math.ceil(filteredWorkers.length / ITEMS_PER_PAGE)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  // Get schedule for selected date
  const getScheduleForDate = (worker: Worker, date: string): { schedule: string; break_time: string; obs: string } => {
    if (!date) {
      // If no date selected, show first schedule or empty
      const schedule = worker.schedules?.[0]
      if (!schedule) return { schedule: "-", break_time: "-", obs: "-" }
      
      if (schedule.is_rest_day) {
        return { schedule: "REST DAY", break_time: "-", obs: schedule.obs || "-" }
      }
      
      return {
        schedule: formatTimeRange(schedule.start_time_pe, schedule.end_time_pe),
        break_time: formatTimeRange(schedule.break_start_time_pe, schedule.break_end_time_pe),
        obs: schedule.obs || "-",
      }
    }

    const schedule = worker.schedules?.find((s) => s.start_date_pe === date)
    if (!schedule) return { schedule: "-", break_time: "-", obs: "-" }

    if (schedule.is_rest_day) {
      return { schedule: "REST DAY", break_time: "-", obs: schedule.obs || "-" }
    }

    return {
      schedule: formatTimeRange(schedule.start_time_pe, schedule.end_time_pe),
      break_time: formatTimeRange(schedule.break_start_time_pe, schedule.break_end_time_pe),
      obs: schedule.obs || "-",
    }
  }

  // Copy link handler
  const handleCopyLink = async () => {
    const ids = filteredWorkers
      .filter((w) => w.api_id)
      .map((w) => w.api_id)
      .join("%2C")

    const url = `https://glovo-eu.deliveryherocare.com/supervisor/agent-monitor?filter.agent.ids=${ids}`

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  // Copy emails handler
  const handleCopyEmails = async () => {
    const emails = filteredWorkers
      .filter((w) => w.api_email)
      .map((w) => w.api_email)
      .join(" ")

    try {
      await navigator.clipboard.writeText(emails)
      setCopiedEmails(true)
      setTimeout(() => setCopiedEmails(false), 2000)
    } catch (err) {
      console.error("Failed to copy emails:", err)
    }
  }

  // Force refresh handler - calls fetchWorkers with forceRefresh=true
  const handleRefresh = async () => {
    await fetchWorkers(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30">
            <Users className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Workers</h2>
            <p className="text-sm text-muted-foreground">
              {filteredWorkers.length} of {workers.length} agents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="border-cyan-500/30 bg-slate-800/50 hover:bg-cyan-500/20 hover:text-cyan-400"
            disabled={filteredWorkers.length === 0}
          >
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button
            onClick={handleCopyEmails}
            variant="outline"
            className="border-cyan-500/30 bg-slate-800/50 hover:bg-cyan-500/20 hover:text-cyan-400"
            disabled={filteredWorkers.length === 0}
          >
            {copiedEmails ? <Check className="h-4 w-4 mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            {copiedEmails ? "Copied!" : "Copy Emails"}
          </Button>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="border-cyan-500/30 bg-slate-800/50 hover:bg-cyan-500/20 hover:text-cyan-400"
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-cyan-500/20 bg-slate-900/50 p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Team Filter */}
          <Select
            value={filters.team}
            onValueChange={(value) => setFilters({ team: value })}
          >
            <SelectTrigger className="border-slate-700 bg-slate-800/50">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              {TEAM_OPTIONS.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ status: value })}
          >
            <SelectTrigger className="border-slate-700 bg-slate-800/50">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Filter */}
          <Select
            value={filters.dateRange}
            onValueChange={(value) => setFilters({ dateRange: value })}
          >
            <SelectTrigger className="border-slate-700 bg-slate-800/50">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              {dateOptions.map((opt) => (
                <SelectItem key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset Filters */}
          <Button
            onClick={resetFilters}
            variant="outline"
            className="border-slate-700 bg-slate-800/50 hover:bg-slate-700"
          >
            <X className="h-4 w-4 mr-2" />
            Reset Filters
          </Button>
        </div>

        {/* Search textarea */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Textarea
            placeholder="Search by document, name or email (one per line or comma-separated)..."
            value={filters.searchText}
            onChange={(e) => setFilters({ searchText: e.target.value })}
            className="pl-10 min-h-[60px] border-slate-700 bg-slate-800/50 resize-none"
          />
        </div>

        {/* Time slots toggle */}
        <div>
          <Button
            onClick={() => setShowTimeSlots(!showTimeSlots)}
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-800/50 hover:bg-cyan-500/20 hover:text-cyan-400"
          >
            <Clock className="h-4 w-4 mr-2" />
            {showTimeSlots ? "Hide Time Slots" : "Show Time Slots"}
            {filters.timeSlot && (
              <span className="ml-2 px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                {filters.timeSlot}
              </span>
            )}
          </Button>
        </div>

        {/* Time slots grid */}
        {showTimeSlots && (
          <div className="border border-slate-700 rounded-lg p-3 bg-slate-800/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Select time slot</span>
              {filters.timeSlot && (
                <Button
                  onClick={() => setFilters({ timeSlot: null })}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setFilters({ timeSlot: filters.timeSlot === slot ? null : slot })}
                  className={cn(
                    "px-2 py-1 text-xs rounded border transition-colors",
                    filters.timeSlot === slot
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                      : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400"
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" />
        </div>
      )}

      {/* Table */}
      {!isLoading && (
        <div className="rounded-xl border border-cyan-500/20 bg-slate-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-cyan-500/20 bg-slate-800/50">
                  <TableHead className="text-cyan-400 font-semibold">Document</TableHead>
                  <TableHead className="text-cyan-400 font-semibold">Name</TableHead>
                  <TableHead className="text-cyan-400 font-semibold">Team</TableHead>
                  <TableHead className="text-cyan-400 font-semibold">Supervisor</TableHead>
                  <TableHead className="text-cyan-400 font-semibold">Contract</TableHead>
                  <TableHead className="text-cyan-400 font-semibold">Schedule</TableHead>
                  <TableHead className="text-cyan-400 font-semibold">Break</TableHead>
                  <TableHead className="text-cyan-400 font-semibold">Obs</TableHead>
                  <TableHead className="text-cyan-400 font-semibold">Email</TableHead>
                  <TableHead className="text-cyan-400 font-semibold">Termination</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedWorkers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No workers found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedWorkers.map((worker, index) => {
                    const scheduleData = getScheduleForDate(worker, filters.dateRange)
                    return (
                      <TableRow
                        key={`${worker.document}-${index}`}
                        className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                      >
                        <TableCell className="font-mono text-sm">{worker.document}</TableCell>
                        <TableCell className="font-medium">{worker.name}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded bg-slate-800 text-xs">
                            {worker.team?.name || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{worker.supervisor || "-"}</TableCell>
                        <TableCell className="text-sm">{worker.contract_type?.name || "-"}</TableCell>
                        <TableCell className={cn(
                          "font-mono text-xs",
                          scheduleData.schedule === "REST DAY" && "text-amber-400"
                        )}>
                          {scheduleData.schedule}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{scheduleData.break_time}</TableCell>
                        <TableCell className="text-xs max-w-[100px] truncate" title={scheduleData.obs}>
                          {scheduleData.obs}
                        </TableCell>
                        <TableCell className="text-xs">{worker.api_email || "-"}</TableCell>
                        <TableCell className="text-xs">{worker.termination_date || "-"}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-slate-900/50">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="border-slate-700 bg-slate-800/50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "w-8 h-8 rounded text-sm transition-colors",
                          currentPage === pageNum
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50"
                            : "bg-slate-800/50 text-slate-400 hover:text-cyan-400"
                        )}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <Button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="border-slate-700 bg-slate-800/50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, RefreshCw, Upload } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { TIME_INTERVALS, ZONES, type Zone } from "@/lib/report-types"

interface ReportFiltersProps {
  zone: Zone
  setZone: (zone: Zone) => void
  date: Date
  setDate: (date: Date) => void
  startInterval: string | null
  setStartInterval: (interval: string | null) => void
  endInterval: string | null
  setEndInterval: (interval: string | null) => void
  selectedTeam: string
  setSelectedTeam: (team: string) => void
  teams: readonly string[]
  onRefresh: () => void
  onUpload: () => void
  isLoading: boolean
  uploadLabel?: string
  // View filter - filters already loaded data by a single interval
  viewInterval?: string | null
  setViewInterval?: (interval: string | null) => void
}

export function ReportFilters({
  zone,
  setZone,
  date,
  setDate,
  startInterval,
  setStartInterval,
  endInterval,
  setEndInterval,
  selectedTeam,
  setSelectedTeam,
  teams,
  onRefresh,
  onUpload,
  isLoading,
  uploadLabel = "Subir CSV",
  viewInterval,
  setViewInterval,
}: ReportFiltersProps) {
  const handleIntervalClick = (interval: string) => {
    // If clicking the same interval that's already selected as start
    if (startInterval === interval && !endInterval) {
      setStartInterval(null)
      return
    }
    
    // If no start interval, set it
    if (!startInterval) {
      setStartInterval(interval)
      setEndInterval(null)
      return
    }
    
    // If we have a start but no end
    if (!endInterval) {
      const startIdx = TIME_INTERVALS.indexOf(startInterval as typeof TIME_INTERVALS[number])
      const clickedIdx = TIME_INTERVALS.indexOf(interval as typeof TIME_INTERVALS[number])
      
      if (clickedIdx > startIdx) {
        setEndInterval(interval)
      } else if (clickedIdx < startIdx) {
        // Clicked before start, swap
        setEndInterval(startInterval)
        setStartInterval(interval)
      } else {
        // Same interval, clear
        setStartInterval(null)
      }
      return
    }
    
    // If we have both, start fresh
    setStartInterval(interval)
    setEndInterval(null)
  }

  const isIntervalSelected = (interval: string) => {
    if (!startInterval) return false
    if (interval === startInterval) return true
    if (interval === endInterval) return true
    
    if (startInterval && endInterval) {
      const startIdx = TIME_INTERVALS.indexOf(startInterval as typeof TIME_INTERVALS[number])
      const endIdx = TIME_INTERVALS.indexOf(endInterval as typeof TIME_INTERVALS[number])
      const currentIdx = TIME_INTERVALS.indexOf(interval as typeof TIME_INTERVALS[number])
      return currentIdx >= startIdx && currentIdx <= endIdx
    }
    
    return false
  }

  const clearIntervals = () => {
    setStartInterval(null)
    setEndInterval(null)
  }

  return (
    <div className="space-y-4">
      {/* Top row: Zone, Date, Team, Actions */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Zone Select */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Zona:</span>
          <Select value={zone} onValueChange={(v) => setZone(v as Zone)}>
            <SelectTrigger className="w-24 bg-slate-800/50 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ZONES.map((z) => (
                <SelectItem key={z} value={z}>{z}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Fecha:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-40 justify-start text-left font-normal bg-slate-800/50 border-slate-700",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: es }) : "Seleccionar"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Team Select */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Team:</span>
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-44 bg-slate-800/50 border-slate-700">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            onClick={onUpload}
            className="border-cyan-500/30 bg-slate-800/50 hover:bg-cyan-500/20 hover:text-cyan-400"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploadLabel}
          </Button>
          <Button
            onClick={onRefresh}
            disabled={isLoading}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Time Intervals */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Intervalos (opcional): {startInterval && endInterval ? `${startInterval} - ${endInterval}` : startInterval || "Sin seleccionar"}
          </span>
          {(startInterval || endInterval) && (
            <Button variant="ghost" size="sm" onClick={clearIntervals} className="text-xs h-6">
              Limpiar
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {TIME_INTERVALS.map((interval) => (
            <Button
              key={interval}
              variant="outline"
              size="sm"
              onClick={() => handleIntervalClick(interval)}
              className={cn(
                "h-7 px-2 text-xs border-slate-700 bg-slate-800/50",
                isIntervalSelected(interval) && "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
              )}
            >
              {interval}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

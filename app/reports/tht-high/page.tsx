"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Timer, AlertTriangle, Loader2 } from "lucide-react"
import { ReportFilters } from "@/components/report-filters"
import { ReportTable } from "@/components/report-table"
import { CsvUploadModal } from "@/components/csv-upload-modal"
import {
  type THTHighResponse,
  type THTHighAgent,
  type THTHighSupervisor,
  THT_HIGH_TEAMS,
  type Zone,
} from "@/lib/report-types"
import {
  buildReportUrl,
  formatDateForApi,
  formatTHTAgentsAlertText,
  formatTHTSupervisorsAlertText,
} from "@/lib/report-utils"

export default function THTHighPage() {
  // Filter states
  const [zone, setZone] = useState<Zone>("PE")
  const [date, setDate] = useState<Date>(new Date())
  const [startInterval, setStartInterval] = useState<string | null>(null)
  const [endInterval, setEndInterval] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  
  // Data states
  const [data, setData] = useState<THTHighResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const url = buildReportUrl(
        "/reports/tht-high",
        zone,
        formatDateForApi(date),
        startInterval || undefined,
        endInterval || undefined
      )

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const result: THTHighResponse = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsLoading(false)
    }
  }, [zone, date, startInterval, endInterval])

  // Filter data by selected team
  const filteredIntervals = data?.intervals.filter(
    (interval) => selectedTeam === "all" || interval.team === selectedTeam
  ) || []

  // Flatten all agents and supervisors from filtered intervals
  const allAgents: (THTHighAgent & { team: string; interval_pe: string | null; interval_es: string | null })[] = filteredIntervals.flatMap(
    (interval) =>
      interval.agents.map((agent) => ({
        ...agent,
        team: interval.team,
        interval_pe: interval.interval_pe,
        interval_es: interval.interval_es,
      }))
  )

  const allSupervisors: (THTHighSupervisor & { team: string; interval_pe: string | null; interval_es: string | null })[] = filteredIntervals.flatMap(
    (interval) =>
      interval.supervisors.map((sup) => ({
        ...sup,
        team: interval.team,
        interval_pe: interval.interval_pe,
        interval_es: interval.interval_es,
      }))
  )

  // Calculate totals
  const totalAgentCases = allAgents.reduce((acc, a) => acc + a.count, 0)
  const totalSupervisorCases = allSupervisors.reduce((acc, s) => acc + s.count, 0)

  const handleCopyAgentsText = async () => {
    const interval = zone === "PE" 
      ? (startInterval && endInterval ? `${startInterval} - ${endInterval}` : "Todo el dia")
      : (startInterval && endInterval ? `${startInterval} - ${endInterval}` : "Todo el dia")
    
    const text = formatTHTAgentsAlertText(
      allAgents,
      selectedTeam === "all" ? "Todos los teams" : selectedTeam,
      interval,
      zone
    )
    await navigator.clipboard.writeText(text)
  }

  const handleCopySupervisorsText = async () => {
    const interval = zone === "PE" 
      ? (startInterval && endInterval ? `${startInterval} - ${endInterval}` : "Todo el dia")
      : (startInterval && endInterval ? `${startInterval} - ${endInterval}` : "Todo el dia")
    
    const text = formatTHTSupervisorsAlertText(
      allSupervisors,
      selectedTeam === "all" ? "Todos los teams" : selectedTeam,
      interval,
      zone
    )
    await navigator.clipboard.writeText(text)
  }

  const agentColumns = [
    { key: "name", header: "Agente", sortable: true },
    { key: "supervisor", header: "Supervisor", sortable: true },
    { key: "coordinator", header: "Coordinador", sortable: true },
    { key: "count", header: "Cantidad", sortable: true, className: "text-center" },
    { key: "team", header: "Team", sortable: true },
    {
      key: "interval",
      header: "Intervalo",
      render: (item: THTHighAgent & { team: string; interval_pe: string | null; interval_es: string | null }) => (
        <span>{zone === "PE" ? item.interval_pe : item.interval_es || item.interval_pe}</span>
      ),
    },
  ]

  const supervisorColumns = [
    { key: "supervisor", header: "Supervisor", sortable: true },
    { key: "coordinator", header: "Coordinador", sortable: true },
    { key: "count", header: "Cantidad", sortable: true, className: "text-center" },
    { key: "team", header: "Team", sortable: true },
    {
      key: "interval",
      header: "Intervalo",
      render: (item: THTHighSupervisor & { team: string; interval_pe: string | null; interval_es: string | null }) => (
        <span>{zone === "PE" ? item.interval_pe : item.interval_es || item.interval_pe}</span>
      ),
    },
  ]

  return (
    <div className="relative z-10 p-8 max-w-7xl mx-auto">
      <Card className="border-cyan-500/20 bg-slate-900/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400/20 to-orange-500/20">
              <Timer className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-foreground">THT High</CardTitle>
              <CardDescription>
                Reporte de casos con THT elevado por agente y supervisor
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <ReportFilters
            zone={zone}
            setZone={setZone}
            date={date}
            setDate={setDate}
            startInterval={startInterval}
            setStartInterval={setStartInterval}
            endInterval={endInterval}
            setEndInterval={setEndInterval}
            selectedTeam={selectedTeam}
            setSelectedTeam={setSelectedTeam}
            teams={THT_HIGH_TEAMS}
            onRefresh={fetchData}
            onUpload={() => setUploadModalOpen(true)}
            isLoading={isLoading}
            uploadLabel="Subir CCR CSV"
          />

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
              <span className="ml-3 text-muted-foreground">Cargando datos...</span>
            </div>
          )}

          {/* Data tables */}
          {!isLoading && data && (
            <div className="space-y-8">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-muted-foreground">Total Casos (Agentes)</p>
                  <p className="text-2xl font-bold text-amber-400">{totalAgentCases}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-muted-foreground">Total Casos (Supervisores)</p>
                  <p className="text-2xl font-bold text-amber-400">{totalSupervisorCases}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-muted-foreground">Agentes</p>
                  <p className="text-2xl font-bold text-cyan-400">{allAgents.length}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-muted-foreground">Supervisores</p>
                  <p className="text-2xl font-bold text-cyan-400">{allSupervisors.length}</p>
                </div>
              </div>

              {/* Agents Table */}
              <ReportTable
                title="Agentes con THT Elevado"
                data={allAgents}
                columns={agentColumns}
                onCopyText={handleCopyAgentsText}
                copyTextLabel="Copiar Alerta"
                emptyMessage="No hay agentes con THT elevado"
              />

              {/* Supervisors Table */}
              <ReportTable
                title="Supervisores con THT Elevado"
                data={allSupervisors}
                columns={supervisorColumns}
                onCopyText={handleCopySupervisorsText}
                copyTextLabel="Copiar Alerta"
                emptyMessage="No hay supervisores con THT elevado"
              />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !data && !error && (
            <div className="flex items-center justify-center p-12 border border-dashed border-slate-700 rounded-lg">
              <p className="text-muted-foreground">
                Selecciona los filtros y presiona Actualizar para ver los datos
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <CsvUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        endpoint="/upload-contacts-with-ccr/"
        title="Subir archivo Contact Reasons"
        description="Sube el archivo CSV con los datos de contact reasons. El archivo sera procesado automaticamente."
        processFile={true}
        onSuccess={fetchData}
      />
    </div>
  )
}

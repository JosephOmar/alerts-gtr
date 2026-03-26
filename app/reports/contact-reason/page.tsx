"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, AlertTriangle, Loader2 } from "lucide-react"
import { ReportFilters } from "@/components/report-filters"
import { ReportTable } from "@/components/report-table"
import { CsvUploadModal } from "@/components/csv-upload-modal"
import {
  type ContactReasonResponse,
  type ContactReason,
  CONTACT_REASON_TEAMS,
  type Zone,
} from "@/lib/report-types"
import {
  buildReportUrl,
  formatDateForApi,
  formatContactReasonAlertText,
} from "@/lib/report-utils"

export default function ContactReasonPage() {
  // Filter states
  const [zone, setZone] = useState<Zone>("PE")
  const [date, setDate] = useState<Date>(new Date())
  const [startInterval, setStartInterval] = useState<string | null>(null)
  const [endInterval, setEndInterval] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  
  // Data states
  const [data, setData] = useState<ContactReasonResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const url = buildReportUrl(
        "/reports/contact-reasons",
        zone,
        formatDateForApi(date),
        startInterval || undefined,
        endInterval || undefined
      )

      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const result: ContactReasonResponse = await response.json()
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

  // Flatten all reasons from filtered intervals
  const allReasons: (ContactReason & { team: string; interval: string })[] = filteredIntervals.flatMap(
    (interval) =>
      interval.reasons.map((reason) => ({
        ...reason,
        team: interval.team,
        interval: interval.interval,
      }))
  )

  // Calculate totals
  const totalContacts = filteredIntervals.reduce((acc, i) => acc + i.total, 0)

  const handleCopyText = async () => {
    const text = formatContactReasonAlertText(
      allReasons,
      selectedTeam === "all" ? "Todos los teams" : selectedTeam,
      startInterval && endInterval ? `${startInterval} - ${endInterval}` : "Todo el dia",
      zone,
      totalContacts
    )
    await navigator.clipboard.writeText(text)
  }

  const reasonColumns = [
    { key: "reason", header: "Contact Reason", sortable: true },
    { key: "count", header: "Cantidad", sortable: true, className: "text-center" },
    { key: "team", header: "Team", sortable: true },
    { key: "interval", header: "Intervalo" },
  ]

  return (
    <div className="relative z-10 p-8 max-w-7xl mx-auto">
      <Card className="border-cyan-500/20 bg-slate-900/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400/20 to-indigo-500/20">
              <MessageSquare className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-foreground">Contact Reason</CardTitle>
              <CardDescription>
                Reporte de razones de contacto por team e intervalo
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
            teams={CONTACT_REASON_TEAMS}
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
                  <p className="text-sm text-muted-foreground">Total Contactos</p>
                  <p className="text-2xl font-bold text-blue-400">{totalContacts}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-muted-foreground">Razones Unicas</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {new Set(allReasons.map((r) => r.reason)).size}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-muted-foreground">Teams</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {new Set(filteredIntervals.map((i) => i.team)).size}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm text-muted-foreground">Intervalos</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {new Set(filteredIntervals.map((i) => i.interval)).size}
                  </p>
                </div>
              </div>

              {/* Reasons Table */}
              <ReportTable
                title="Contact Reasons"
                data={allReasons}
                columns={reasonColumns}
                onCopyText={handleCopyText}
                copyTextLabel="Copiar Alerta"
                emptyMessage="No hay contact reasons para mostrar"
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

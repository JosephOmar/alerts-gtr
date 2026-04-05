"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Timer, Download, Copy, Check, AlertTriangle, Loader2, Users } from "lucide-react"
import { useWorkersStore } from "@/lib/workers-store"
import type { THTTicket, THTTicketResponse, THTAlertInfo } from "@/lib/types"
import { 
  filterHighTHTTickets, 
  processTHTTicket, 
  formatTHTAlertText,
  groupAlertsByTeam 
} from "@/lib/tht-utils"

import { useRef, useCallback } from "react"
import { toPng } from "html-to-image"
import { Image} from "lucide-react"



// CS Tier1 - Customer Service (live-order, nonlive-order)
const THT_CS_TIER1_URL = "https://api-glovo-eu.deliveryherocare.com/oneview/active-cases/v3/tickets?filter.chatStatus=Active&filter.queue.channel=chat&filter.queue.country=ES&filter.queue.department=CS&filter.queue.expertise=live-order%2Cnonlive-order&orderBy=handling_time&direction=desc&cursor=%7B%22currentPage%22%3A%22%22%2C%22nextPage%22%3A%22%22%2C%22previousPages%22%3A%5B%5D%7D&pageSize=25"
// RS/VS Tier1 - Rider/Vendor Service
const THT_RS_TIER1_URL = "https://api-glovo-eu.deliveryherocare.com/oneview/active-cases/v3/tickets?filter.chatStatus=Active&filter.queue.channel=chat&filter.queue.country=ES&filter.queue.department=RS&filter.queue.expertise=tier1&orderBy=handling_time&direction=desc&cursor=%7B%22currentPage%22%3A%22%22%2C%22nextPage%22%3A%22%22%2C%22previousPages%22%3A%5B%5D%7D&pageSize=25"
// RS/VS Tier1 - Rider/Vendor Service
const THT_VS_TIER1_URL = "https://api-glovo-eu.deliveryherocare.com/oneview/active-cases/v3/tickets?filter.chatStatus=Active&filter.queue.channel=chat&filter.queue.country=ES&filter.queue.department=VS&filter.queue.expertise=tier1&orderBy=handling_time&direction=desc&cursor=%7B%22currentPage%22%3A%22%22%2C%22nextPage%22%3A%22%22%2C%22previousPages%22%3A%5B%5D%7D&pageSize=25"
// CS Tier2 - Customer Service Case inbox
const THT_CS_TIER2_URL = "https://api-glovo-eu.deliveryherocare.com/oneview/active-cases/v3/tickets?filter.chatStatus=Active&filter.queue.channel=case-inbox&filter.queue.country=ES&filter.queue.department=CS&filter.queue.expertise=tier2&orderBy=handling_time&direction=desc&cursor=%7B%22currentPage%22%3A%22%22%2C%22nextPage%22%3A%22%22%2C%22previousPages%22%3A%5B%5D%7D&pageSize=25"
// RS Tier2 - Rider Service Case inbox
const THT_RS_TIER2_URL = "https://api-glovo-eu.deliveryherocare.com/oneview/active-cases/v3/tickets?filter.chatStatus=Active&filter.queue.channel=case-inbox&filter.queue.country=ES&filter.queue.department=RS&filter.queue.expertise=tier2&orderBy=handling_time&direction=desc&cursor=%7B%22currentPage%22%3A%22%22%2C%22nextPage%22%3A%22%22%2C%22previousPages%22%3A%5B%5D%7D&pageSize=25"
// VS Tier2 - Vendor Service Case inbox
const THT_VS_TIER2_URL = "https://api-glovo-eu.deliveryherocare.com/oneview/active-cases/v3/tickets?filter.chatStatus=Active&filter.queue.channel=case-inbox&filter.queue.country=ES&filter.queue.department=VS&filter.queue.expertise=tier2%2Cdisputes&orderBy=handling_time&direction=desc&cursor=%7B%22currentPage%22%3A%22%22%2C%22nextPage%22%3A%22%22%2C%22previousPages%22%3A%5B%5D%7D&pageSize=25"

// Thresholds
const THT_CS_TIER1_THRESHOLD = 420 // 7 minutes in seconds for CS Tier1
const THT_RS_TIER1_THRESHOLD = 200 // 3 min 20s for RS/VS Tier1
const THT_VS_TIER1_THRESHOLD = 200 // 3 min 20s for RS/VS Tier1
const THT_TIER2_THRESHOLD = 420 // 7 minutes for all Tier2

type TierType = 'cs-tier1' | 'rs-tier1' | 'vs-tier1' | 'cs-tier2' | 'rs-tier2' | 'vs-tier2'
type CopiedButton = "Customer Tier1" | null

export default function THTPage() {
  const { workers, fetchWorkers } = useWorkersStore()
  const [csTier1Loading, setCsTier1Loading] = useState(false)
  const [rsTier1Loading, setRsTier1Loading] = useState(false)
  const [vsTier1Loading, setVsTier1Loading] = useState(false)
  const [csTier2Loading, setCsTier2Loading] = useState(false)
  const [rsTier2Loading, setRsTier2Loading] = useState(false)
  const [vsTier2Loading, setVsTier2Loading] = useState(false)
  const [csTier1Alerts, setCsTier1Alerts] = useState<THTAlertInfo[]>([])
  const [rsTier1Alerts, setRsTier1Alerts] = useState<THTAlertInfo[]>([])
  const [vsTier1Alerts, setVsTier1Alerts] = useState<THTAlertInfo[]>([])
  const [csTier2Alerts, setCsTier2Alerts] = useState<THTAlertInfo[]>([])
  const [rsTier2Alerts, setRsTier2Alerts] = useState<THTAlertInfo[]>([])
  const [vsTier2Alerts, setVsTier2Alerts] = useState<THTAlertInfo[]>([])
  const [csTier1Error, setCsTier1Error] = useState<string | null>(null)
  const [rsTier1Error, setRsTier1Error] = useState<string | null>(null)
  const [vsTier1Error, setVsTier1Error] = useState<string | null>(null)
  const [csTier2Error, setCsTier2Error] = useState<string | null>(null)
  const [rsTier2Error, setRsTier2Error] = useState<string | null>(null)
  const [vsTier2Error, setVsTier2Error] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [tokensConfigured, setTokensConfigured] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)
  const [copiedButton, setCopiedButton] = useState<CopiedButton>(null)

  useEffect(() => {
    // Fetch workers on mount
    fetchWorkers()
    
    // Check if tokens are configured
    const auth = localStorage.getItem("authorization")
    const profileAuth = localStorage.getItem("profile-authorization")
    setTokensConfigured(!!auth && !!profileAuth)
  }, [fetchWorkers])

  const fetchTHTData = async (url: string, tierType: TierType) => {
    const loadingMap: Record<TierType, React.Dispatch<React.SetStateAction<boolean>>> = {
      'cs-tier1': setCsTier1Loading,
      'rs-tier1': setRsTier1Loading,
      'vs-tier1': setVsTier1Loading,
      'cs-tier2': setCsTier2Loading,
      'rs-tier2': setRsTier2Loading,
      'vs-tier2': setVsTier2Loading,
    }
    const alertsMap: Record<TierType, React.Dispatch<React.SetStateAction<THTAlertInfo[]>>> = {
      'cs-tier1': setCsTier1Alerts,
      'rs-tier1': setRsTier1Alerts,
      'vs-tier1': setVsTier1Alerts,
      'cs-tier2': setCsTier2Alerts,
      'rs-tier2': setRsTier2Alerts,
      'vs-tier2': setVsTier2Alerts,
    }
    const errorMap: Record<TierType, React.Dispatch<React.SetStateAction<string | null>>> = {
      'cs-tier1': setCsTier1Error,
      'rs-tier1': setRsTier1Error,
      'vs-tier1': setVsTier1Error,
      'cs-tier2': setCsTier2Error,
      'rs-tier2': setRsTier2Error,
      'vs-tier2': setVsTier2Error,
    }
    const thresholdMap: Record<TierType, number> = {
      'cs-tier1': THT_CS_TIER1_THRESHOLD,
      'rs-tier1': THT_RS_TIER1_THRESHOLD,
      'vs-tier1': THT_VS_TIER1_THRESHOLD,
      'cs-tier2': THT_TIER2_THRESHOLD,
      'rs-tier2': THT_TIER2_THRESHOLD,
      'vs-tier2': THT_TIER2_THRESHOLD,
    }
    
    const setLoading = loadingMap[tierType]
    const setAlerts = alertsMap[tierType]
    const setError = errorMap[tierType]
    const threshold = thresholdMap[tierType]

    setLoading(true)
    setError(null)
    setAlerts([])

    try {
      const authorization = localStorage.getItem("authorization")
      const profileAuthorization = localStorage.getItem("profile-authorization")

      if (!authorization || !profileAuthorization) {
        throw new Error("Tokens no configurados. Por favor configure los tokens en Alerts > Token")
      }

      const response = await fetch(url, {
        headers: {
          "authorization": authorization,
          "profile-authorization": profileAuthorization,
        },
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const data: THTTicketResponse = await response.json()
      
      // Filter tickets with high THT based on tier-specific threshold
      const highTHTTickets = filterHighTHTTickets(data.tickets, threshold)
      
      // Process tickets and match with workers
      const alerts: THTAlertInfo[] = []
      for (const ticket of highTHTTickets) {
        const alertInfo = processTHTTicket(ticket, workers)
        if (alertInfo) {
          alerts.push(alertInfo)
        }
      }

      setAlerts(alerts)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyAlert = async (alert: THTAlertInfo) => {
    const text = formatTHTAlertText(alert)
    await navigator.clipboard.writeText(text)
    setCopiedId(alert.ticketId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const groupedCsTier1Alerts = groupAlertsByTeam(csTier1Alerts)
  const groupedRsTier1Alerts = groupAlertsByTeam(rsTier1Alerts)
  const groupedVsTier1Alerts = groupAlertsByTeam(vsTier1Alerts)
  const groupedCsTier2Alerts = groupAlertsByTeam(csTier2Alerts)
  const groupedRsTier2Alerts = groupAlertsByTeam(rsTier2Alerts)
  const groupedVsTier2Alerts = groupAlertsByTeam(vsTier2Alerts)

  const getTeamColor = (team: string): string => {
    if (team.toLowerCase().includes("customer")) return "from-blue-500/20 to-cyan-500/20 border-blue-500/30"
    if (team.toLowerCase().includes("rider")) return "from-orange-500/20 to-amber-500/20 border-orange-500/30"
    if (team.toLowerCase().includes("vendor")) return "from-purple-500/20 to-pink-500/20 border-purple-500/30"
    return "from-slate-500/20 to-slate-400/20 border-slate-500/30"
  }

  const renderAlertButtons = (alerts: THTAlertInfo[], groupedAlerts: Record<string, THTAlertInfo[]>) => {
    if (alerts.length === 0) {
      return (
        <div className="flex items-center justify-center p-6 border border-dashed border-slate-700 rounded-lg">
          <p className="text-muted-foreground text-sm">
            No hay alertas con THT elevado
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {Object.entries(groupedAlerts).map(([team, teamAlerts]) => (
          <div key={team} className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-400">{team}</span>
              <span className="text-xs text-muted-foreground">({teamAlerts.length} alertas)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {teamAlerts.map((alert) => (
                <Button
                  key={alert.ticketId}
                  variant="outline"
                  className={`h-auto py-3 px-4 justify-start text-left bg-gradient-to-br ${getTeamColor(team)} hover:opacity-90 transition-opacity`}
                  onClick={() => handleCopyAlert(alert)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="flex-shrink-0 mt-0.5">
                      {copiedId === alert.ticketId ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate text-foreground">
                        {alert.agentName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        THT: {alert.handlingTimeFormatted}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {alert.company} - TL: {alert.supervisor || "N/A"}
                      </p>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

const getTenureLabel = (tenure: number) => {
  if (tenure === 0) return { label: "Menos de 1 mes", color: "text-red-400" }
  if (tenure >= 1 && tenure <= 3) return { label: "De 1 a 3 meses", color: "text-orange-400" }
  if (tenure > 3 && tenure <= 6) return { label: "De 3 a 6 meses", color: "text-yellow-400" }
  return { label: "Más de 6 meses", color: "text-green-400" }
}

const getHandlingTimeColor = (seconds: number) => {
  if (seconds > 1200) return "text-red-400 font-semibold"
  if (seconds >= 420) return "text-orange-400"
  return "text-muted-foreground"
}

// Convierte "00:12:30" → minutos
const parseHandlingTimeToMinutes = (time: string) => {
  const [h, m, s] = time.split(":").map(Number)
  return h * 60 + m + s / 60
}

const copyAsImage = useCallback(async () => {
    if (!tableRef.current) return

    try {
      const dataUrl = await toPng(tableRef.current, {
        backgroundColor: "#1a1a2e",
        pixelRatio: 2,
      })

      const response = await fetch(dataUrl)
      const blob = await response.blob()

      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ])
      setCopiedButton("Customer Tier1")
      setTimeout(() => setCopiedButton(null), 2000)
    } catch (error) {
      console.error("Error copying image:", error)
    }
  }, [])

const renderAlertTable = (
  alerts: THTAlertInfo[],
  groupedAlerts: Record<string, THTAlertInfo[]>
) => {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 border border-dashed border-slate-700 rounded-lg">
        <p className="text-muted-foreground text-sm">
          No hay alertas con THT elevado
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedAlerts).map(([team, teamAlerts]) => (
        <div key={team} className="space-y-2">
          {/* Header equipo */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">{team}</span>
            <span className="text-xs text-muted-foreground">
              ({teamAlerts.length} alertas)
            </span>
            <Button
              onClick={copyAsImage}
              variant="outline"
              className="border-blue-500/50 bg-slate-900/50 hover:bg-blue-500/20 hover:border-blue-400 text-blue-300 transition-all duration-300 disabled:opacity-50"
            >
              {copiedButton === "Customer Tier1" ? (
                <Check className="w-4 h-4 mr-2 text-emerald-400" />
              ) : (
                <Image className="w-4 h-4 mr-2" />
              )}
              {copiedButton === "Customer Tier1" ? "Copied!" : "Copy Table"}
            </Button>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto rounded-lg border border-slate-700" ref={tableRef}>
            <table className="w-full text-sm">
              <thead className={`bg-gradient-to-r ${getTeamColor(team)} text-left`}>
                <tr>
                  <th className="px-4 py-2">Nombre</th>
                  <th className="px-4 py-2">Supervisor</th>
                  <th className="px-4 py-2">Antigüedad</th>
                  <th className="px-4 py-2">Handling Time</th>
                </tr>
              </thead>

              <tbody>
                {teamAlerts.map((alert) => {
                  const tenureInfo = getTenureLabel(alert.tenure)
                  const handlingColor = getHandlingTimeColor(alert.handlingTimeSeconds)

                  return (
                    <tr
                      key={alert.ticketId}
                      className="border-t border-slate-800 hover:bg-slate-900/50 cursor-pointer"
                      onClick={() => handleCopyAlert(alert)}
                    >
                      <td className="px-4 py-2 font-medium text-foreground">
                        {alert.agentName}
                      </td>

                      <td className="px-4 py-2 text-muted-foreground">
                        {alert.supervisor || "N/A"}
                      </td>

                      <td className={`px-4 py-2 ${tenureInfo.color}`}>
                        {tenureInfo.label}
                      </td>

                      <td className={`px-4 py-2 ${handlingColor}`}>
                        {alert.handlingTimeFormatted}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

  return (
    <div className="relative z-10 p-8 max-w-6xl mx-auto">
      <Card className="border-cyan-500/20 bg-slate-900/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
              <Timer className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-foreground">THT Monitoring</CardTitle>
              <CardDescription>
                Alertas de tiempo de gestion elevado (mayor a 7 minutos)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!tokensConfigured && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-200">
                Tokens no configurados. Por favor configure los tokens en{" "}
                <a href="/alerts/token" className="underline hover:text-amber-100">
                  Alerts {">"} Token
                </a>
              </p>
            </div>
          )}

          {/* Fetch Buttons */}
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={() => fetchTHTData(THT_CS_TIER1_URL, 'cs-tier1')}
              disabled={csTier1Loading || !tokensConfigured}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              {csTier1Loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              THT CS Tier1
            </Button>
            <Button
              onClick={() => fetchTHTData(THT_RS_TIER1_URL, 'rs-tier1')}
              disabled={rsTier1Loading || !tokensConfigured}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            >
              {rsTier1Loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              THT RS Tier1
            </Button>
            <Button
              onClick={() => fetchTHTData(THT_VS_TIER1_URL, 'vs-tier1')}
              disabled={vsTier1Loading || !tokensConfigured}
              className="bg-gradient-to-r from-purple-500 to-purple-500 hover:from-purple-600 hover:to-purple-600 text-white"
            >
              {vsTier1Loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              THT VS Tier1
            </Button>
            <Button
              onClick={() => fetchTHTData(THT_CS_TIER2_URL, 'cs-tier2')}
              disabled={csTier2Loading || !tokensConfigured}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              {csTier2Loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              CS Tier2
            </Button>
            <Button
              onClick={() => fetchTHTData(THT_RS_TIER2_URL, 'rs-tier2')}
              disabled={rsTier2Loading || !tokensConfigured}
              className="bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white"
            >
              {rsTier2Loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              RS Tier2
            </Button>
            <Button
              onClick={() => fetchTHTData(THT_VS_TIER2_URL, 'vs-tier2')}
              disabled={vsTier2Loading || !tokensConfigured}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            >
              {vsTier2Loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              VS Tier2
            </Button>
          </div>

          {/* CS Tier 1 Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-400" />
              CS Tier 1 - Chat (THT mayor a 7 min)
            </h3>
            {csTier1Error && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="text-sm text-red-200">{csTier1Error}</p>
              </div>
            )}
            {csTier1Loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                <span className="ml-2 text-muted-foreground">Cargando datos...</span>
              </div>
            ) : (
              renderAlertTable(csTier1Alerts, groupedCsTier1Alerts)
            )}
          </div>

          {/* RS Tier 1 Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-400" />
              RS Tier 1 - Chat (THT mayor a 3 min 20s)
            </h3>
            {rsTier1Error && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="text-sm text-red-200">{rsTier1Error}</p>
              </div>
            )}
            {rsTier1Loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                <span className="ml-2 text-muted-foreground">Cargando datos...</span>
              </div>
            ) : (
              renderAlertButtons(rsTier1Alerts, groupedRsTier1Alerts)
            )}
          </div>

          {/* RS/VS Tier 1 Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-400" />
              VS Tier 1 - Chat (THT mayor a 3 min 20s)
            </h3>
            {vsTier1Error && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="text-sm text-red-200">{vsTier1Error}</p>
              </div>
            )}
            {vsTier1Loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                <span className="ml-2 text-muted-foreground">Cargando datos...</span>
              </div>
            ) : (
              renderAlertButtons(vsTier1Alerts, groupedVsTier1Alerts)
            )}
          </div>

          {/* CS Tier 2 Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-400" />
              CS Tier 2 - Case Inbox
            </h3>
            {csTier2Error && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="text-sm text-red-200">{csTier2Error}</p>
              </div>
            )}
            {csTier2Loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                <span className="ml-2 text-muted-foreground">Cargando datos...</span>
              </div>
            ) : (
              renderAlertButtons(csTier2Alerts, groupedCsTier2Alerts)
            )}
          </div>

          {/* RS Tier 2 Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-rose-400" />
              RS Tier 2 - Case Inbox
            </h3>
            {rsTier2Error && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="text-sm text-red-200">{rsTier2Error}</p>
              </div>
            )}
            {rsTier2Loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
                <span className="ml-2 text-muted-foreground">Cargando datos...</span>
              </div>
            ) : (
              renderAlertButtons(rsTier2Alerts, groupedRsTier2Alerts)
            )}
          </div>

          {/* VS Tier 2 Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              VS Tier 2 - Case Inbox
            </h3>
            {vsTier2Error && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="text-sm text-red-200">{vsTier2Error}</p>
              </div>
            )}
            {vsTier2Loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                <span className="ml-2 text-muted-foreground">Cargando datos...</span>
              </div>
            ) : (
              renderAlertButtons(vsTier2Alerts, groupedVsTier2Alerts)
            )}
          </div>

          {/* Workers status */}
          <div className="pt-4 border-t border-slate-700">
            <p className="text-xs text-muted-foreground">
              Workers cargados: {workers.length} agentes
              {workers.length === 0 && (
                <span className="text-amber-400 ml-2">
                  (Cargue los workers en la seccion Workers para habilitar el match de agentes)
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

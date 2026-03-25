"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Download, Copy, Check, AlertTriangle, Loader2, Users } from "lucide-react"
import { useWorkersStore } from "@/lib/workers-store"
import type { AgentMonitorResponse, AuxiliarAlertInfo } from "@/lib/types"
import {
  processAgentMonitorData,
  groupAuxiliarAlertsByTeam,
  formatAuxiliarAlertText,
} from "@/lib/adherence-utils"

const AGENT_MONITOR_URL = "https://api-glovo-eu.deliveryherocare.com/oneview/agent-monitor/v1/agents/cursor?filter.agent.status=LUNCH%2CTRAINING%2FQA%2FMEETING%2CSHORT_BREAK%2CASSIGNED_TASK%2CBUSY%2CON_HOLD_CASE%2CON_CALL%2CUNAVAILABLE&orderBy=status&direction=asc&token=%7B%22currentPage%22%3A%22%22%2C%22nextPage%22%3A%22%22%2C%22previousPages%22%3A%5B%5D%7D&pageSize=25"

export default function AdherencePage() {
  const { workers, fetchWorkers } = useWorkersStore()
  const [loading, setLoading] = useState(false)
  const [alerts, setAlerts] = useState<AuxiliarAlertInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [tokensConfigured, setTokensConfigured] = useState(false)

  useEffect(() => {
    // Fetch workers on mount
    fetchWorkers()

    // Check if tokens are configured
    const auth = localStorage.getItem("authorization")
    const profileAuth = localStorage.getItem("profile-authorization")
    setTokensConfigured(!!auth && !!profileAuth)
  }, [fetchWorkers])

  const fetchAgentMonitorData = async () => {
    setLoading(true)
    setError(null)
    setAlerts([])

    try {
      const authorization = localStorage.getItem("authorization")
      const profileAuthorization = localStorage.getItem("profile-authorization")

      if (!authorization || !profileAuthorization) {
        throw new Error("Tokens no configurados. Por favor configure los tokens en Alerts > Token")
      }

      // Fetch all pages of agent monitor data
      let allAgents: AgentMonitorResponse["list"] = []
      let currentUrl = AGENT_MONITOR_URL

      while (currentUrl) {
        const response = await fetch(currentUrl, {
          headers: {
            authorization: authorization,
            "profile-authorization": profileAuthorization,
          },
        })

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`)
        }

        const data: AgentMonitorResponse = await response.json()
        allAgents = [...allAgents, ...data.list]

        // Check if there's a next page
        if (data.cursor?.nextPage) {
          const encodedToken = encodeURIComponent(
            JSON.stringify({
              currentPage: data.cursor.nextPage,
              nextPage: "",
              previousPages: [...data.cursor.previousPages, data.cursor.currentPage].filter(Boolean),
            })
          )
          currentUrl = `https://api-glovo-eu.deliveryherocare.com/oneview/agent-monitor/v1/agents/cursor?filter.agent.status=LUNCH%2CTRAINING%2FQA%2FMEETING%2CSHORT_BREAK%2CASSIGNED_TASK%2CBUSY%2CON_HOLD_CASE%2CON_CALL%2CUNAVAILABLE&orderBy=status&direction=asc&token=${encodedToken}&pageSize=25`
        } else {
          break
        }
      }

      // Process agents and match with workers
      const processedAlerts = processAgentMonitorData(allAgents, workers)
      setAlerts(processedAlerts)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyAlert = async (alert: AuxiliarAlertInfo) => {
    const text = formatAuxiliarAlertText(alert)
    await navigator.clipboard.writeText(text)
    setCopiedId(alert.agentEmail)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const groupedAlerts = groupAuxiliarAlertsByTeam(alerts)

  const getTeamColor = (team: string): string => {
    if (team.toLowerCase().includes("customer")) return "from-blue-500/20 to-cyan-500/20 border-blue-500/30"
    if (team.toLowerCase().includes("rider")) return "from-orange-500/20 to-amber-500/20 border-orange-500/30"
    if (team.toLowerCase().includes("vendor")) return "from-purple-500/20 to-pink-500/20 border-purple-500/30"
    return "from-slate-500/20 to-slate-400/20 border-slate-500/30"
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "LUNCH":
        return "text-amber-400"
      case "SHORT_BREAK":
        return "text-green-400"
      case "BUSY":
      case "UNAVAILABLE":
        return "text-red-400"
      case "ASSIGNED_TASK":
        return "text-blue-400"
      case "TRAINING/QA/MEETING":
        return "text-purple-400"
      case "ON_HOLD_CASE":
        return "text-cyan-400"
      default:
        return "text-slate-400"
    }
  }

  const renderAlertButtons = () => {
    if (alerts.length === 0) {
      return (
        <div className="flex items-center justify-center p-6 border border-dashed border-slate-700 rounded-lg">
          <p className="text-muted-foreground text-sm">
            No hay alertas de auxiliares con exceso de tiempo
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
                  key={alert.agentEmail}
                  variant="outline"
                  className={`h-auto py-3 px-4 justify-start text-left bg-gradient-to-br ${getTeamColor(team)} hover:opacity-90 transition-opacity`}
                  onClick={() => handleCopyAlert(alert)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="flex-shrink-0 mt-0.5">
                      {copiedId === alert.agentEmail ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate text-foreground">
                        {alert.agentName}
                      </p>
                      <p className={`text-xs ${getStatusColor(alert.statusAlias)}`}>
                        {alert.statusFormatted}: {alert.timeFormatted}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        TL: {alert.supervisor || "N/A"}
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

  return (
    <div className="relative z-10 p-8 max-w-6xl mx-auto">
      <Card className="border-cyan-500/20 bg-slate-900/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-500/20">
              <Clock className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-foreground">Adherence Monitoring</CardTitle>
              <CardDescription>
                Alertas de agentes con exceso en auxiliares no productivos
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

          {/* Fetch Button */}
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={fetchAgentMonitorData}
              disabled={loading || !tokensConfigured}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Auxiliares
            </Button>
          </div>

          {/* Thresholds info */}
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Umbrales de alerta:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <span className="text-amber-400">Lunch: {">"} 45 min</span>
              <span className="text-green-400">Short Break: {">"} 10 min</span>
              <span className="text-purple-400">Training/QA/Meeting: {">"} 25 min</span>
              <span className="text-cyan-400">On Hold Case: {">"} 1 min</span>
              <span className="text-blue-400">Assigned Task: {">"} 8h 15min</span>
              <span className="text-red-400">Busy: {">"} 1s</span>
              <span className="text-red-400">Unavailable: {">"} 1s</span>
            </div>
          </div>

          {/* Alerts Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-400" />
              Auxiliares No Productivos
            </h3>
            {error && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                <span className="ml-2 text-muted-foreground">Cargando datos...</span>
              </div>
            ) : (
              renderAlertButtons()
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

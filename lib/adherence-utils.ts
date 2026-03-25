import type { AgentMonitorAgent, AuxiliarAlertInfo } from "./types"
import type { Worker } from "./worker-types"
import { toBoldUnicode } from "./tht-utils"

// Status thresholds in seconds
export const STATUS_THRESHOLDS: Record<string, number> = {
  ON_HOLD_CASE: 60, // 1 min
  SHORT_BREAK: 600, // 10 min
  LUNCH: 2700, // 45 min
  ASSIGNED_TASK: 29700, // 8h 15min = 8*3600 + 15*60 = 29700s
  "TRAINING/QA/MEETING": 1500, // 25 min
  BUSY: 1, // 1 second
  UNAVAILABLE: 1, // 1 second
}

// Format status alias to display format (capitalize, replace underscores)
export function formatStatusAlias(status: string): string {
  return status
    .split(/[_/]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

// Format time in seconds to HH:MM:SS format
export function formatTimeInStatus(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Find worker by email
export function findWorkerByEmail(email: string, workers: Worker[]): Worker | null {
  return workers.find(w => w.api_email?.toLowerCase() === email.toLowerCase()) || null
}

// Check if agent exceeds their status threshold
export function exceedsThreshold(statusAlias: string, timeInStatus: number): boolean {
  const threshold = STATUS_THRESHOLDS[statusAlias]
  if (threshold === undefined) return false
  return timeInStatus > threshold
}

// Process agent monitor data to create auxiliar alerts
export function processAgentMonitorData(
  agents: AgentMonitorAgent[],
  workers: Worker[]
): AuxiliarAlertInfo[] {
  const alerts: AuxiliarAlertInfo[] = []

  for (const agent of agents) {
    // Check if agent exceeds threshold for their status
    if (!exceedsThreshold(agent.statusAlias, agent.timeInStatus)) {
      continue
    }

    // Find worker by email
    const worker = findWorkerByEmail(agent.email, workers)
    
    if (!worker) {
      continue
    }

    alerts.push({
      agentEmail: agent.email,
      agentName: worker.name,
      teamName: worker.team?.name || "Sin equipo",
      supervisor: worker.supervisor,
      statusAlias: agent.statusAlias,
      statusFormatted: formatStatusAlias(agent.statusAlias),
      timeInStatus: agent.timeInStatus,
      timeFormatted: formatTimeInStatus(agent.timeInStatus),
    })
  }

  return alerts
}

// Group alerts by team name
export function groupAuxiliarAlertsByTeam(alerts: AuxiliarAlertInfo[]): Record<string, AuxiliarAlertInfo[]> {
  return alerts.reduce((acc, alert) => {
    const team = alert.teamName
    if (!acc[team]) {
      acc[team] = []
    }
    acc[team].push(alert)
    return acc
  }, {} as Record<string, AuxiliarAlertInfo[]>)
}

// Format auxiliar alert text for clipboard (with Unicode bold)
export function formatAuxiliarAlertText(alert: AuxiliarAlertInfo): string {
  const agentBold = toBoldUnicode(alert.agentName)
  const statusBold = toBoldUnicode(alert.statusFormatted)
  const tlBold = toBoldUnicode("TL")
  const supervisorBold = alert.supervisor 
    ? toBoldUnicode(alert.supervisor) 
    : toBoldUnicode("Sin supervisor asignado")

  return `⚠️ ${agentBold}, presenta exceso en auxiliar no productivo.
⏰ ${statusBold} ${alert.timeFormatted} ⏰
🚨 Su apoyo con el cambio a ONLINE, evitemos afectar al adherencia. 🚨
${tlBold}: ${supervisorBold}`
}

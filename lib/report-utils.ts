import { toBoldUnicode } from "./tht-utils"
import Papa from "papaparse"
import type {
  SLABreachedAgent,
  SLABreachedSupervisor,
  THTHighAgent,
  THTHighSupervisor,
  ContactReason,
} from "./report-types"

// Get API base URL from environment
export function getReportsApiUrl(): string {
  return process.env.NEXT_PUBLIC_REPORTS_API_URL || "http://localhost:8001"
}

// Build report URL with filters
export function buildReportUrl(
  endpoint: string,
  zone: string,
  date: string,
  startInterval?: string,
  endInterval?: string
): string {
  const baseUrl = getReportsApiUrl()
  const params = new URLSearchParams({
    zone,
    date,
  })
  
  if (startInterval && endInterval) {
    params.append("start_interval", startInterval)
    params.append("end_interval", endInterval)
  }
  
  return `${baseUrl}${endpoint}?${params.toString()}`
}

// Format date for API (YYYY-MM-DD)
export function formatDateForApi(date: Date): string {
  return date.toISOString().split("T")[0]
}

// Get today's date formatted
export function getTodayFormatted(): string {
  return formatDateForApi(new Date())
}

// Format SLA Breached alert text for agents table
export function formatSLAAgentsAlertText(
  agents: SLABreachedAgent[],
  team: string,
  interval: string,
  zone: string
): string {
  const title = toBoldUnicode("Top de agentes con mayor cantidad de chats vencidos")
  const teamBold = toBoldUnicode(team)
  const intervalBold = toBoldUnicode(interval)
  const zoneBold = toBoldUnicode(zone)
  
  let text = `🚨 ${title} 🚨\n`
  text += `⚠️ ${teamBold} - ${intervalBold} - ${zoneBold}\n\n`
  
  agents.slice(0, 10).forEach((agent, index) => {
    const nameBold = toBoldUnicode(agent.name)
    text += `${index + 1}. ${nameBold} - ${agent.chat_breached} chats\n`
  })
  
  text += `\nTenemos agentes reincidentes en los tramos compartidos, alertemos a los AS ‼️ Debemos evitar afectar al SLA.`
  
  return text
}

// Format SLA Breached alert text for supervisors table
export function formatSLASupervisorsAlertText(
  supervisors: SLABreachedSupervisor[],
  team: string,
  interval: string,
  zone: string
): string {
  const title = toBoldUnicode("Top de supervisores con mayor cantidad de chats vencidos")
  const teamBold = toBoldUnicode(team)
  const intervalBold = toBoldUnicode(interval)
  const zoneBold = toBoldUnicode(zone)
  
  let text = `🚨 ${title} 🚨\n`
  text += `⚠️ ${teamBold} - ${intervalBold} - ${zoneBold}\n\n`
  
  supervisors.slice(0, 10).forEach((sup, index) => {
    const nameBold = toBoldUnicode(sup.supervisor)
    text += `${index + 1}. ${nameBold} - ${sup.chat_breached} chats\n`
  })
  
  text += `\nRevisar con los supervisores para mejorar el rendimiento del equipo.`
  
  return text
}

// Format THT High alert text for agents table
export function formatTHTAgentsAlertText(
  agents: THTHighAgent[],
  team: string,
  interval: string,
  zone: string
): string {
  const title = toBoldUnicode("Top de agentes con mayor cantidad de THT elevado")
  const teamBold = toBoldUnicode(team)
  const intervalBold = toBoldUnicode(interval)
  const zoneBold = toBoldUnicode(zone)
  
  let text = `⏰ ${title} ⏰\n`
  text += `⚠️ ${teamBold} - ${intervalBold} - ${zoneBold}\n\n`
  
  agents.slice(0, 10).forEach((agent, index) => {
    const nameBold = toBoldUnicode(agent.name)
    text += `${index + 1}. ${nameBold} - ${agent.count} casos\n`
  })
  
  text += `\nSe debe revisar el tiempo de gestion de estos agentes para evitar afectar al THT general.`
  
  return text
}

// Format THT High alert text for supervisors table
export function formatTHTSupervisorsAlertText(
  supervisors: THTHighSupervisor[],
  team: string,
  interval: string,
  zone: string
): string {
  const title = toBoldUnicode("Top de supervisores con mayor cantidad de THT elevado")
  const teamBold = toBoldUnicode(team)
  const intervalBold = toBoldUnicode(interval)
  const zoneBold = toBoldUnicode(zone)
  
  let text = `⏰ ${title} ⏰\n`
  text += `⚠️ ${teamBold} - ${intervalBold} - ${zoneBold}\n\n`
  
  supervisors.slice(0, 10).forEach((sup, index) => {
    const nameBold = toBoldUnicode(sup.supervisor)
    text += `${index + 1}. ${nameBold} - ${sup.count} casos\n`
  })
  
  text += `\nRevisar con los supervisores el tiempo de gestion de sus equipos.`
  
  return text
}

// Format Contact Reason alert text
export function formatContactReasonAlertText(
  reasons: ContactReason[],
  team: string,
  interval: string,
  zone: string,
  total: number
): string {
  const title = toBoldUnicode("Top de Contact Reasons")
  const teamBold = toBoldUnicode(team)
  const intervalBold = toBoldUnicode(interval)
  const zoneBold = toBoldUnicode(zone)
  const totalBold = toBoldUnicode(String(total))
  
  let text = `📊 ${title} 📊\n`
  text += `⚠️ ${teamBold} - ${intervalBold} - ${zoneBold}\n`
  text += `📈 Total: ${totalBold} contactos\n\n`
  
  reasons.slice(0, 10).forEach((reason, index) => {
    text += `${index + 1}. ${reason.reason} - ${reason.count}\n`
  })
  
  return text
}

// Copy image to clipboard from HTML element
export async function copyElementAsImage(element: HTMLElement): Promise<void> {
  const html2canvas = (await import("html2canvas")).default
  
  const canvas = await html2canvas(element, {
    backgroundColor: "#0f172a",
    scale: 2,
  })
  
  canvas.toBlob(async (blob) => {
    if (blob) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ])
      } catch (err) {
        console.error("Failed to copy image:", err)
        throw err
      }
    }
  }, "image/png")
}

// Process CSV for contacts-with-ccr
// export function processContactsCsv(csvText: string): string {
//   const lines = csvText.split("\n")
//   console.log(lines)
//   // Remove last row
//   if (lines.length > 1) {
//     lines.pop()
//   }
//   // Parse header to find column indices
//   const header = lines[0].split(",")
//   const countryIndex = header.findIndex(h => h.trim().toLowerCase() === "country")
//   const queueNameIndex = header.findIndex(h => h.trim().toLowerCase() === "queue_name")
  
//   // Columns to remove (C=2, D=3, E=4, F=5, Q=16, U=20) - 0-indexed
//   const columnsToRemove = [2, 3, 4, 5, 16, 20].sort((a, b) => b - a) // Sort descending to remove from end first
  
//   const validQueueNames = [
//     "VS-case-inbox-spa-ES-disputes",
//     "CS-case-inbox-spa-ES-tier2",
//     "VS-case-inbox-spa-ES-tier2",
//     "RS-case-inbox-spa-ES-tier2",
//     "RS-chat-spa-ES-tier1",
//     "VS-call-default",
//     "CS-chat-spa-ES-nonlive-order",
//     "CS-chat-spa-ES-live-order",
//     "VS-chat-spa-ES-tier1",
//   ]
  
//   const filteredLines: string[] = [lines[0]] // Keep header
//   console.log(filteredLines)
//   for (let i = 1; i < lines.length; i++) {
//     const line = lines[i]
//     if (!line.trim()) continue
    
//     const columns = line.split(",")
    
//     // Filter by country = ES
//     if (countryIndex !== -1 && columns[countryIndex]?.trim() !== "ES") {
//       continue
//     }
    
//     // Filter by valid queue_name
//     if (queueNameIndex !== -1 && !validQueueNames.includes(columns[queueNameIndex]?.trim())) {
//       continue
//     }
    
//     filteredLines.push(line)
//   }
//   console.log(filteredLines)
//   // Remove unnecessary columns
//   const processedLines = filteredLines.map(line => {
//     const columns = line.split(",")
//     for (const colIndex of columnsToRemove) {
//       if (colIndex < columns.length) {
//         columns.splice(colIndex, 1)
//       }
//     }
//     console.log(columns.length, columns)
//     return columns.join(",")
//   })
//   return processedLines.join("\n")
// }

export function processContactsCsv(csvText: string): string {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const validQueueNames = [
    "VS-case-inbox-spa-ES-disputes",
    "CS-case-inbox-spa-ES-tier2",
    "VS-case-inbox-spa-ES-tier2",
    "RS-case-inbox-spa-ES-tier2",
    "RS-chat-spa-ES-tier1",
    "VS-call-default",
    "CS-chat-spa-ES-nonlive-order",
    "CS-chat-spa-ES-live-order",
    "VS-chat-spa-ES-tier1",
  ]

  let data = parsed.data as any[]

  // 1. ❗ Eliminar última fila
  if (data.length > 0) {
    data.pop()
  }

  // 2 y 3. ✅ Filtrar country + queue_name
  data = data.filter(row =>
    row.country === "ES" &&
    validQueueNames.includes(row.queue_name)
  )

  // 4. ❗ Eliminar columnas (por nombre, NO por índice)
  const columnsToRemove = [
    parsed.meta.fields?.[2],  // C
    parsed.meta.fields?.[3],  // D
    parsed.meta.fields?.[4],  // E
    parsed.meta.fields?.[5],  // F
    parsed.meta.fields?.[16], // Q
    parsed.meta.fields?.[20], // U
  ]

  const cleanedData = data.map(row => {
    const newRow = { ...row }
    columnsToRemove.forEach(col => {
      if (col) delete newRow[col]
    })
    return newRow
  })

  // 5. ✅ Convertir nuevamente a CSV
  const csv = Papa.unparse(cleanedData)

  return csv
}

// Sort agents by count (descending)
export function sortAgentsByCount<T extends { chat_breached?: number; count?: number }>(
  agents: T[],
  field: "chat_breached" | "count"
): T[] {
  return [...agents].sort((a, b) => {
    const aVal = field === "chat_breached" ? (a as { chat_breached: number }).chat_breached : (a as { count: number }).count
    const bVal = field === "chat_breached" ? (b as { chat_breached: number }).chat_breached : (b as { count: number }).count
    return bVal - aVal
  })
}

// Sort agents by supervisor name
export function sortAgentsBySupervisor<T extends { supervisor: string }>(agents: T[]): T[] {
  return [...agents].sort((a, b) => a.supervisor.localeCompare(b.supervisor))
}

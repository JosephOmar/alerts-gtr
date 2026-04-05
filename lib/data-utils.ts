import type { QueueData, TableRow, ChannelCapacityInfo, SimpleTier1Info, Tier2BacklogInfo } from "./types"
import { toBoldUnicode } from "./tht-utils"

export function processQueueData(data: QueueData[]): TableRow[] {
  const channelMap: Record<string, TableRow> = {}

  const getChannelName = (item: QueueData): string | null => {
    const dept = item.department
    const expertise = item.expertise
    const channel = item.channel

    // Customer mappings
    if (dept === "CS" && (expertise === "live-order" || expertise === "nonlive-order" || expertise === "tier1") && channel === "chat") {
      return "Customer Tier1"
    }
    if (dept === "CS" && expertise === "tier2" && channel === "case-inbox") {
      return "Customer Tier2"
    }

    // Rider mappings
    if (dept === "RS" && expertise === "tier1" && channel === "chat") {
      return "Rider Tier1"
    }
    if (dept === "RS" && expertise === "tier2" && channel === "case-inbox") {
      return "Rider Tier2"
    }

    // Vendor mappings
    if (dept === "VS" && expertise === "tier1" && channel === "chat") {
      return "Vendor Chat"
    }
    if (dept === "VS" && (expertise === "tier2" || expertise === "disputes") && channel === "case-inbox") {
      return "Vendor Tier2"
    }

    return null
  }

  data.forEach((item) => {
    const channelName = getChannelName(item)
    if (!channelName) return

    if (!channelMap[channelName]) {
      channelMap[channelName] = {
        channel: channelName,
        backlog: 0,
        tickets: 0,
        head: 0,
      }
    }

    channelMap[channelName].backlog += item.casesBacklog
    channelMap[channelName].tickets += item.activeTicketsCount
    if (channelName == "Customer Tier1" || channelName == "Vendor Tier2") {
      channelMap[channelName].head = Math.max(item.onlineAgentCount)
    } else {
      channelMap[channelName].head += item.onlineAgentCount
    }
    
  })

  // Order the channels
  const order = [
    "Customer Tier1",
    "Rider Tier1",
    "Vendor Chat",
    "Customer Tier2",
    "Rider Tier2",
    "Vendor Tier2",
  ]

  return order
    .filter((channel) => channelMap[channel])
    .map((channel) => channelMap[channel])
}

export function getRoundedTime(): string {
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  
  const roundedMinutes = minutes < 30 ? "05" : "35"
  const formattedHours = hours.toString().padStart(2, "0")
  
  return `${formattedHours}:${roundedMinutes}`
}

export function formatTableAsText(rows: TableRow[]): string {
  const header = "Team\tBacklog\tTickets\tAgents"
  const dataRows = rows.map(
    (row) => `${row.channel}\t${row.backlog}\t${row.tickets}\t${row.head}`
  )
  const time = getRoundedTime()
  const footer = `Conexión: ${time} HPE`
  
  return [header, ...dataRows, footer].join("\n")
}

// Helper to convert seconds to "Xm Ys" format
export function secondsToMinutesSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}m ${secs}s`
}

// Calculate available agents for reinforcement
// Max concurrency is 1.5, or 1 if less than 10 agents
// Available = agents - (tickets / maxConcurrency)
// Capped at 20
export function calculateAvailableAgents(agents: number, tickets: number, name: string): number {
  if (agents === 0) return 0
  
  let maxConcurrency = 0

  name === "Customer Tier1" ? maxConcurrency = (agents < 10 ? 1 : 1.5) : maxConcurrency = (agents < 10 ? 1.5 : 2)

  const minAgentsNeeded = Math.ceil(tickets / maxConcurrency)
  const available = Math.max(0, agents - minAgentsNeeded)
  
  if (tickets/agents < 0.5) {
    return Math.min(20, Math.floor(agents/2))
  } else {
    return Math.min(available, 20)
  }
}

// Get Customer Tier1 capacity info
export function getCustomerTier1Info(data: QueueData[]): ChannelCapacityInfo {
  const nonLiveItem = data.find(
    (item) => item.queueName === "CS-chat-spa-ES-nonlive-order"
  )
  const liveItem = data.find(
    (item) => item.queueName === "CS-chat-spa-ES-live-order"
  )

  const controlAgents = nonLiveItem?.onlineAgentCount || 0
  const totalAgents = liveItem?.onlineAgentCount || 0
  const liveAgents = totalAgents - controlAgents

  const nonLiveTickets = nonLiveItem?.activeTicketsCount || 0
  const liveTickets = liveItem?.activeTicketsCount || 0
  const totalTickets = nonLiveTickets + liveTickets

  const nonLiveBacklog = nonLiveItem?.casesBacklog || 0
  const liveBacklog = liveItem?.casesBacklog || 0

  const concurrency = Math.min(totalAgents > 0 ? totalTickets / totalAgents : 0, 2)

  const thtNonLiveSeconds = nonLiveItem?.avgHandlingTime || 0
  const thtLiveSeconds = liveItem?.avgHandlingTime || 0

  return {
    name: "Customer Tier1",
    totalAgents,
    controlAgents,
    liveAgents,
    totalTickets,
    nonLiveTickets,
    liveTickets,
    nonLiveBacklog,
    liveBacklog,
    concurrency: Math.round(concurrency * 10) / 10,
    thtNonLive: secondsToMinutesSeconds(thtNonLiveSeconds),
    thtLive: secondsToMinutesSeconds(thtLiveSeconds),
    thtNonLiveSeconds,
    thtLiveSeconds,
    availableAgents: calculateAvailableAgents(totalAgents, totalTickets, "Customer Tier1"),
  }
}

// Get Rider Tier1 capacity info
export function getRiderTier1Info(data: QueueData[]): SimpleTier1Info {
  const item = data.find(
    (item) => item.queueName === "RS-chat-spa-ES-tier1"
  )

  const backlog = item?.casesBacklog || 0
  const onlineAgents = item?.onlineAgentCount || 0
  const tickets = item?.activeTicketsCount || 0
  const concurrency = Math.min(onlineAgents > 0 ? tickets / onlineAgents : 0, 3)
  const thtSeconds = item?.avgHandlingTime || 0

  return {
    name: "Rider Tier1",
    onlineAgents,
    tickets,
    backlog,
    concurrency: Math.round(concurrency * 10) / 10,
    tht: secondsToMinutesSeconds(thtSeconds),
    thtSeconds,
    availableAgents: calculateAvailableAgents(onlineAgents, tickets, "Rider Tier1"),
  }
}

// Get Vendor Tier1 capacity info
export function getVendorTier1Info(data: QueueData[]): SimpleTier1Info {
  const item = data.find(
    (item) => item.queueName === "VS-chat-spa-ES-tier1"
  )

  const backlog = item?.casesBacklog || 0
  const onlineAgents = item?.onlineAgentCount || 0
  const tickets = item?.activeTicketsCount || 0
  const concurrency = Math.min(onlineAgents > 0 ? tickets / onlineAgents : 0, 3)
  const thtSeconds = item?.avgHandlingTime || 0

  return {
    name: "Vendor Tier1",
    onlineAgents,
    tickets,
    backlog,
    concurrency: Math.round(concurrency * 10) / 10,
    tht: secondsToMinutesSeconds(thtSeconds),
    thtSeconds,
    availableAgents: calculateAvailableAgents(onlineAgents, tickets, "Vendor Tier1"),
  }
}

// Get Tier2 backlog info
export function getTier2BacklogInfo(data: QueueData[]): Tier2BacklogInfo {
  const customerItem = data.find(
    (item) => item.queueName === "CS-case-inbox-spa-ES-tier2"
  )
  const riderItem = data.find(
    (item) => item.queueName === "RS-case-inbox-spa-ES-tier2"
  )
  const vendorItem = data.find(
    (item) => item.queueName === "VS-case-inbox-spa-ES-tier2"
  )
  const disputesItem = data.find(
    (item) => item.queueName === "VS-case-inbox-spa-ES-disputes"
  )

  const calculateHoursToSLA = (longestWaitSeconds: number): number => {
    const slaHours = 24
    const waitHours = longestWaitSeconds / 3600
    const remaining = slaHours - waitHours
    // Round up to next hour
    return Math.max(0, Math.ceil(remaining))
  }

  return {
    customer: {
      cases: customerItem?.casesBacklog || 0,
      hoursToSLA: calculateHoursToSLA(customerItem?.longestWaitTime || 0),
    },
    rider: {
      cases: riderItem?.casesBacklog || 0,
      hoursToSLA: calculateHoursToSLA(riderItem?.longestWaitTime || 0),
    },
    vendor: {
      cases: vendorItem?.casesBacklog || 0,
      hoursToSLA: calculateHoursToSLA(vendorItem?.longestWaitTime || 0),
    },
    disputes: {
      cases: disputesItem?.casesBacklog || 0,
    },
  }
}

// Format Customer Tier1 text for clipboard
export function formatCustomerTier1Text(info: ChannelCapacityInfo): string {

  const isThereBacklogNonLive = info.nonLiveBacklog > 2 ? `\n\n🚨 Se tiene ${info.nonLiveBacklog} chats en espera en la bandeja de No Live 🚨` : ''
  const isThereBacklogLive = info.liveBacklog > 2 ? `\n\n🚨 Se tiene ${info.liveBacklog} chats en espera en la bandeja de Live 🚨` : ''
  const textBacklog = info.nonLiveBacklog > 2 || info.liveBacklog > 2 ? `${isThereBacklogNonLive}` + `${isThereBacklogLive}` + `\n\n🚨🚨Su apoyo agilizando los tiempos de atención, evitemos afectar el SLA🚨🚨` : ''
  const availableText = info.availableAgents > 0 
    ? `${info.availableAgents} para refuerzo`
    : "Sin agentes disponibles"

  return `${toBoldUnicode('Capacidad: Customer Tier1')}\t
\t
Total de Agentes: ${info.totalAgents} Agentes.\n
     • Agentes Control: ${info.controlAgents} Agentes.\t
     • Agentes Live: ${info.liveAgents} Agentes.\t
\t
Tickets: ${info.totalTickets} Tickets en gestión\n
     • Tickets No Live: ${info.nonLiveTickets} Contact\t
     • Tickets Live: ${info.liveTickets} Contact\t
\t
➡️ THT NON LIVE:  ${info.thtNonLive}  -  (Target: 07:03)\t
➡️ THT LIVE:  ${info.thtLive}  -  (Target: 07:03)\t
\t
Concurrencia: ${info.concurrency}\t
\t
👥 Ag. Disponibles: ${availableText} ${textBacklog}`
}

// Format Rider Tier1 text for clipboard
export function formatRiderTier1Text(info: SimpleTier1Info): string {
  const isThereBacklog = info.backlog > 2 ? `\n\n🚨 Se tiene ${info.backlog} chats en espera en la bandeja🚨\n\n🚨🚨Su apoyo agilizando los tiempos de atención, evitemos afectar el SLA🚨🚨` : ''
  const availableText = info.availableAgents > 0 
    ? `${info.availableAgents} Agentes para refuerzo`
    : "Sin agentes disponibles"

  return `${toBoldUnicode('Capacidad: Rider Tier1')}\t\t\t
\t\t\t
🎯 Agentes Online: ${info.onlineAgents} Agentes.\n
    • Tickets: ${info.tickets} Tickets en gestión\t\t\t
    • Concurrencia: ${info.concurrency}\t\t\t
\t\t\t
➡️ THT: ${info.tht}  -  (Target: 03:22)\t\t\t
\t\t\t
👥 Ag. Disponibles: ${availableText} ${isThereBacklog}`
}

// Format Vendor Tier1 text for clipboard
export function formatVendorTier1Text(info: SimpleTier1Info): string {
  const isThereBacklog = info.backlog > 2 ? `\n\n🚨 Se tiene ${info.backlog} chats en espera en la bandeja🚨\n\n🚨🚨Su apoyo agilizando los tiempos de atención, evitemos afectar el SLA🚨🚨` : ''
  const availableText = info.availableAgents > 0 
    ? `${info.availableAgents} Agentes para refuerzo`
    : "Sin agentes disponibles"

  return `${toBoldUnicode('Capacidad: Vendor Tier1')}\t\t\t
\t\t\t
🎯 Agentes Online: ${info.onlineAgents} Agentes.\n
    • Tickets: ${info.tickets} Tickets en gestión\t\t\t
    • Concurrencia: ${info.concurrency}\t\t\t
\t\t\t
➡️ THT: ${info.tht}  -  (Target: 03:22)\t\t\t
\t\t\t
👥 Ag. Disponibles: ${availableText}  ${isThereBacklog}`
}

// Format Disponibilidad text for clipboard
export function formatDisponibilidadText(
  customerInfo: ChannelCapacityInfo,
  riderInfo: SimpleTier1Info,
  vendorInfo: SimpleTier1Info
): string {
  const formatLine = (name: string, concurrency: number, available: number): string => {
    if (available === 0) {
      return `➡️ ${name} - Concurrencia: ${concurrency}. Sin agentes disponibles para refuerzos en el canal`
    }
    return `➡️ ${name} - Concurrencia: ${concurrency}. Se tiene disponibilidad para sacar ${available} agentes para refuerzos.`
  }

  return `${formatLine("Customer Tier1", customerInfo.concurrency, customerInfo.availableAgents)}
${formatLine("Rider Tier1", riderInfo.concurrency, riderInfo.availableAgents)}
${formatLine("Vendor Chat", vendorInfo.concurrency, vendorInfo.availableAgents)}
 
🚨Tener en cuenta que se debe avanzar por equipo de Supervisión y compartir la lista de los As para el control interno`
}

// Format Backlog text for clipboard
export function formatBacklogText(info: Tier2BacklogInfo): string {
  const time = getRoundedTime()
  
  const disputesText = info.disputes.cases > 10000 
    ? "+10000 casos" 
    : `${info.disputes.cases} casos`

  return `BackLog de las 3 Verticales TIER 2 - ${time} HE
↪ Customer: ${info.customer.cases} casos - con ${info.customer.hoursToSLA} Hrs para estar fuera de Objetivo en SLA
↪ Rider: ${info.rider.cases} casos - con ${info.rider.hoursToSLA} Hrs para estar fuera de Objetivo en SLA
↪ Vendor: ${info.vendor.cases} casos - con ${info.vendor.hoursToSLA} Hrs para estar fuera de Objetivo en SLA
↪ Disputes: ${disputesText}`
}

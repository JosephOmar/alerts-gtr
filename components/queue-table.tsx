"use client"

import { useRef, useCallback, useState } from "react"
import { toPng } from "html-to-image"
import { Copy, Image, RefreshCw, Check, Users, Bike, Store, ClipboardList, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"

import type { TableRow, QueueData } from "@/lib/types"
import { formatTableAsText, getCustomerTier1Info, getRiderTier1Info, formatBacklogText, getTier2BacklogInfo, getVendorTier1Info, formatCustomerTier1Text, formatDisponibilidadText, formatRiderTier1Text, formatVendorTier1Text } from "@/lib/data-utils"

interface QueueTableProps {
  data: TableRow[]
  rawData: QueueData[]
  isLoading: boolean
  onRefresh: () => void
}

type CopiedButton = "text" | "image" | "customer" | "rider" | "vendor" | "disponibilidad" | "backlog" | null

export function QueueTable({ data, rawData, isLoading, onRefresh }: QueueTableProps) {
  const tableRef = useRef<HTMLDivElement>(null)
  const [copiedButton, setCopiedButton] = useState<CopiedButton>(null)

  const handleCopy = useCallback(async (text: string, buttonId: CopiedButton) => {
    await navigator.clipboard.writeText(text)
    setCopiedButton(buttonId)
    setTimeout(() => setCopiedButton(null), 2000)
  }, [])

  const copyAsText = useCallback(async () => {
    const text = formatTableAsText(data)
    await handleCopy(text, "text")
  }, [data, handleCopy])

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
      setCopiedButton("image")
      setTimeout(() => setCopiedButton(null), 2000)
    } catch (error) {
      console.error("Error copying image:", error)
    }
  }, [])

  const copyCustomerTier1 = useCallback(async () => {
    const info = getCustomerTier1Info(rawData)
    const text = formatCustomerTier1Text(info)
    await handleCopy(text, "customer")
  }, [rawData, handleCopy])

  const copyRiderTier1 = useCallback(async () => {
    console.log(rawData)
    const info = getRiderTier1Info(rawData)
    const text = formatRiderTier1Text(info)
    await handleCopy(text, "rider")
  }, [rawData, handleCopy])

  const copyVendorTier1 = useCallback(async () => {
    const info = getVendorTier1Info(rawData)
    const text = formatVendorTier1Text(info)
    await handleCopy(text, "vendor")
  }, [rawData, handleCopy])

  const copyDisponibilidad = useCallback(async () => {
    const customerInfo = getCustomerTier1Info(rawData)
    const riderInfo = getRiderTier1Info(rawData)
    const vendorInfo = getVendorTier1Info(rawData)
    const text = formatDisponibilidadText(customerInfo, riderInfo, vendorInfo)
    await handleCopy(text, "disponibilidad")
  }, [rawData, handleCopy])

  const copyBacklog = useCallback(async () => {
    const info = getTier2BacklogInfo(rawData)
    const text = formatBacklogText(info)
    await handleCopy(text, "backlog")
  }, [rawData, handleCopy])

  const getTier2Class = (channel: string) => {
    if (channel.includes("Tier2")) {
      return "text-cyan-400 font-semibold"
    }
    return ""
  }

  const ActionButton = ({ 
    onClick, 
    buttonId, 
    icon: Icon, 
    label,
    colorClass 
  }: { 
    onClick: () => void
    buttonId: CopiedButton
    icon: React.ElementType
    label: string
    colorClass: string
  }) => {
    const isCopied = copiedButton === buttonId
    return (
      <Button
        onClick={onClick}
        disabled={rawData?.length === 0}
        variant="outline"
        className={`${colorClass} transition-all duration-300 disabled:opacity-50 text-xs px-3 py-2`}
      >
        {isCopied ? (
          <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
        ) : (
          <Icon className="w-3.5 h-3.5 mr-1.5" />
        )}
        {isCopied ? "Copied!" : label}
      </Button>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Queue Status Dashboard
        </h2>
        <Button
          onClick={onRefresh}
          disabled={isLoading}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 shadow-lg shadow-cyan-500/25 transition-all duration-300"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Loading..." : "Get Data"}
        </Button>
      </div>

      {/* Table Container */}
      <div
        ref={tableRef}
        className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-sm shadow-2xl shadow-cyan-500/10"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none" />
        
        {/* Animated border */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 opacity-50 blur-sm -z-10" />

        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cyan-500/30 bg-gradient-to-r from-cyan-900/30 to-blue-900/30">
                <th className="px-6 py-4 text-left font-bold uppercase tracking-wider text-cyan-300">
                  Team
                </th>
                <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-cyan-300">
                  Backlog
                </th>
                <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-cyan-300">
                  Tickets
                </th>
                <th className="px-6 py-4 text-center font-bold uppercase tracking-wider text-cyan-300">
                  Agents
                </th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-8 h-8 text-cyan-500/50" />
                      <span>Click &quot;Get Data&quot; to load queue information</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, index) => (
                  <tr
                    key={row.channel}
                    className={`
                      border-b border-cyan-500/10 
                      transition-all duration-300 
                      hover:bg-cyan-500/10
                      ${index % 2 === 0 ? "bg-slate-900/50" : "bg-slate-800/30"}
                    `}
                  >
                    <td className={`px-6 py-4 font-medium ${getTier2Class(row.channel)} ${!row.channel.includes("TIER2") ? "text-slate-200" : ""}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${row.channel.includes("TIER2") ? "bg-cyan-400 shadow-lg shadow-cyan-400/50" : "bg-emerald-400 shadow-lg shadow-emerald-400/50"}`} />
                        {row.channel}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-mono ${row.backlog > 0 ? "text-amber-400 font-semibold" : "text-slate-400"}`}>
                        {row.backlog.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-blue-300">
                        {row.tickets.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-emerald-400 font-semibold">
                        {row.head}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Action buttons */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <Button
          onClick={copyAsText}
          disabled={data.length === 0}
          variant="outline"
          className="border-cyan-500/50 bg-slate-900/50 hover:bg-cyan-500/20 hover:border-cyan-400 text-cyan-300 transition-all duration-300 disabled:opacity-50"
        >
          {copiedButton === "text" ? (
            <Check className="w-4 h-4 mr-2 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          {copiedButton === "text" ? "Copied!" : "Copy as Text"}
        </Button>
        <Button
          onClick={copyAsImage}
          disabled={data.length === 0}
          variant="outline"
          className="border-blue-500/50 bg-slate-900/50 hover:bg-blue-500/20 hover:border-blue-400 text-blue-300 transition-all duration-300 disabled:opacity-50"
        >
          {copiedButton === "image" ? (
            <Check className="w-4 h-4 mr-2 text-emerald-400" />
          ) : (
            <Image className="w-4 h-4 mr-2" />
          )}
          {copiedButton === "image" ? "Copied!" : "Copy as Image"}
        </Button>
      </div>

      {/* Capacity Action Buttons */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-cyan-300 mb-4 text-center">
          Capacity Reports
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <ActionButton
            onClick={copyCustomerTier1}
            buttonId="customer"
            icon={Users}
            label="Customer Tier1"
            colorClass="border-emerald-500/50 bg-slate-900/50 hover:bg-emerald-500/20 hover:border-emerald-400 text-emerald-300"
          />
          <ActionButton
            onClick={copyRiderTier1}
            buttonId="rider"
            icon={Bike}
            label="Rider Tier1"
            colorClass="border-orange-500/50 bg-slate-900/50 hover:bg-orange-500/20 hover:border-orange-400 text-orange-300"
          />
          <ActionButton
            onClick={copyVendorTier1}
            buttonId="vendor"
            icon={Store}
            label="Vendor Tier1"
            colorClass="border-purple-500/50 bg-slate-900/50 hover:bg-purple-500/20 hover:border-purple-400 text-purple-300"
          />
          <ActionButton
            onClick={copyDisponibilidad}
            buttonId="disponibilidad"
            icon={ClipboardList}
            label="Disponibilidad"
            colorClass="border-yellow-500/50 bg-slate-900/50 hover:bg-yellow-500/20 hover:border-yellow-400 text-yellow-300"
          />
          <ActionButton
            onClick={copyBacklog}
            buttonId="backlog"
            icon={Layers}
            label="Backlog"
            colorClass="border-red-500/50 bg-slate-900/50 hover:bg-red-500/20 hover:border-red-400 text-red-300"
          />
        </div>
      </div>
    </div>
  )
}

"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import html2canvas from "html2canvas-pro"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Copy, Image, Check, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { copyElementAsImage } from "@/lib/report-utils"

interface Column<T> {
  key: string
  header: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
  className?: string
}

interface ReportTableProps<T> {
  title: string
  data: T[]
  columns: Column<T>[]
  onCopyText: () => void
  copyTextLabel?: string
  emptyMessage?: string
}

type SortDirection = "asc" | "desc" | null

export function ReportTable<T extends Record<string, unknown>>({
  title,
  data,
  columns,
  onCopyText,
  copyTextLabel = "Copiar Texto",
  emptyMessage = "No hay datos para mostrar",
}: ReportTableProps<T>) {
  const tableRef = useRef<HTMLDivElement>(null)
  const [copiedText, setCopiedText] = useState(false)
  const [copiedImage, setCopiedImage] = useState(false)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const handleCopyText = async () => {
    onCopyText()
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  const handleCopyImage = async () => {
    if (!tableRef.current) return

    try {
      const canvas = await html2canvas(tableRef.current, {
        useCORS: true,
        backgroundColor: null, // útil si tienes fondos transparentes
        scale: 2, // mejora calidad
      })

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve)
      )

      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ])
      }

      setCopiedImage(true)
      setTimeout(() => setCopiedImage(false), 2000)
    } catch (err) {
      console.error("Failed to copy image:", err)
    }
  }

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "desc") {
        setSortDirection("asc")
      } else if (sortDirection === "asc") {
        setSortDirection(null)
        setSortKey(null)
      }
    } else {
      setSortKey(key)
      setSortDirection("desc")
    }
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey || !sortDirection) return 0
    
    const aVal = a[sortKey]
    const bVal = b[sortKey]
    
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "desc" ? bVal - aVal : aVal - bVal
    }
    
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDirection === "desc" 
        ? bVal.localeCompare(aVal) 
        : aVal.localeCompare(bVal)
    }
    
    return 0
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyText}
            className="border-cyan-500/30 bg-slate-800/50 hover:bg-cyan-500/20 hover:text-cyan-400"
          >
            {copiedText ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copiedText ? "Copiado!" : copyTextLabel}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyImage}
            className="border-cyan-500/30 bg-slate-800/50 hover:bg-cyan-500/20 hover:text-cyan-400"
          >
            {copiedImage ? <Check className="mr-2 h-4 w-4" /> : <Image className="mr-2 h-4 w-4" />}
            {copiedImage ? "Copiado!" : "Copiar Imagen"}
          </Button>
        </div>
      </div>

      <div ref={tableRef} className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-800/50">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "text-cyan-400",
                      col.sortable && "cursor-pointer select-none hover:text-cyan-300",
                      col.className
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && (
                        <ArrowUpDown className={cn(
                          "h-4 w-4",
                          sortKey === col.key && "text-cyan-300"
                        )} />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((item, index) => (
                <TableRow key={index} className="border-slate-700 hover:bg-slate-800/30">
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render 
                        ? col.render(item) 
                        : String(item[col.key] ?? "-")
                      }
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, FileText, Loader2, Check, AlertTriangle } from "lucide-react"
import { processContactsCsv, getReportsApiUrl } from "@/lib/report-utils"

interface CsvUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  endpoint: string
  title: string
  description: string
  processFile?: boolean // Whether to process the CSV before uploading
  onSuccess?: () => void
}

export function CsvUploadModal({
  open,
  onOpenChange,
  endpoint,
  title,
  description,
  processFile = false,
  onSuccess,
}: CsvUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setUploadStatus("idle")
      setErrorMessage(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      setFile(droppedFile)
      setUploadStatus("idle")
      setErrorMessage(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadStatus("idle")
    setErrorMessage(null)

    try {
      let fileToUpload = file
      console.log(processFile)
      const text1 = await file.text()
      // If we need to process the file (for contacts-with-ccr)
      if (processFile) {
        const text = await file.text()
        const processedCsv = processContactsCsv(text)
        fileToUpload = new File([processedCsv], file.name, { type: "text/csv" })
        console.log(fileToUpload)
      }

      const formData = new FormData()
      formData.append("files", fileToUpload)

      const baseUrl = getReportsApiUrl()
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Backend error:", errorData)
        throw new Error(JSON.stringify(errorData))
      }

      setUploadStatus("success")
      
      // Auto close and refresh after success
      setTimeout(() => {
        onOpenChange(false)
        setFile(null)
        setUploadStatus("idle")
        onSuccess?.()
      }, 1500)
    } catch (error) {
      setUploadStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Error al subir el archivo")
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      onOpenChange(false)
      setFile(null)
      setUploadStatus("idle")
      setErrorMessage(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center cursor-pointer hover:border-cyan-500/50 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-10 w-10 text-cyan-400" />
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-slate-500" />
                <p className="text-sm text-muted-foreground">
                  Arrastra un archivo CSV o haz clic para seleccionar
                </p>
              </div>
            )}
          </div>

          {/* Status messages */}
          {uploadStatus === "success" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <Check className="h-4 w-4 text-green-400" />
              <p className="text-sm text-green-200">Archivo subido exitosamente</p>
            </div>
          )}

          {uploadStatus === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <p className="text-sm text-red-200">{errorMessage}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isUploading}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

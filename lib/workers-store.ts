"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import localforage from "localforage"
import type { Worker, WorkersFilters } from "./worker-types"

// Configure localforage
localforage.config({
  name: "QueueMonitor",
  storeName: "workers",
})

// Custom storage adapter for zustand using localforage
const localForageStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await localforage.getItem<string>(name)
    return value ?? null
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await localforage.setItem(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    await localforage.removeItem(name)
  },
}

interface WorkersState {
  workers: Worker[]
  isLoading: boolean
  error: string | null
  lastFetched: number | null
  filters: WorkersFilters
  
  setWorkers: (workers: Worker[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setFilters: (filters: Partial<WorkersFilters>) => void  
  resetFilters: () => void
  fetchWorkers: () => Promise<void>
}

const defaultFilters: WorkersFilters = {
  team: "All Teams",
  status: "All",
  dateRange: "",
  searchText: "",
  timeSlot: null,
}

export const useWorkersStore = create<WorkersState>()(
  persist(
    (set, get) => ({
      workers: [],
      isLoading: false,
      error: null,
      lastFetched: null,
      filters: defaultFilters,

      setWorkers: (workers) => set({ workers, lastFetched: Date.now() }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set((state) => ({ 
        filters: { ...state.filters, ...filters } 
      })),
      resetFilters: () => set({ filters: defaultFilters }),

      fetchWorkers: async () => {
        const state = get()
        
        // If we have cached data less than 5 minutes old, don't refetch
        if (
          state.workers.length > 0 && 
          state.lastFetched && 
          Date.now() - state.lastFetched < 120 * 60 * 1000
        ) {
          return
        }

        set({ isLoading: true, error: null })

        try {
          const response = await fetch("https://etl-workers.onrender.com/workers/")
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const data = await response.json()
          set({ workers: data, lastFetched: Date.now(), isLoading: false })
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Failed to fetch workers",
            isLoading: false 
          })
        }
      },
    }),
    {
      name: "workers-storage",
      storage: createJSONStorage(() => localForageStorage),
      partialize: (state) => ({
        workers: state.workers,
        lastFetched: state.lastFetched,
      }),
    }
  )
)

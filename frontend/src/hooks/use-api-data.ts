/**
 * Thin wrapper around TanStack Query for SWCM API endpoints.
 * All data comes from the backend — no mock data fallback.
 * Components show loading/empty states when the API is unavailable.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchKPIs,
  fetchHistory,
  fetchZones,
  fetchAlerts,
  fetchDrivers,
  fetchRoutes,
  fetchWasteCategories,
  fetchRefZones,
  fetchDepots,
  fetchPuneBounds,
  patchAlert,
  type ApiKPIs,
  type ApiZone,
  type ApiAlert,
  type ApiHistoryRow,
  type RefZone,
  type Depot,
  type PuneBounds,
} from "@/lib/api";

// ---- KPIs (dashboard) ----
export function useKPIs() {
  return useQuery<ApiKPIs | null>({
    queryKey: ["kpis"],
    queryFn: async () => {
      const result = await fetchKPIs();
      return result.data;
    },
    refetchInterval: 10_000,
    retry: 2,
    staleTime: 5_000,
  });
}

// ---- History (analytics / charts) ----
export function useHistory(days = 30) {
  return useQuery<ApiHistoryRow[]>({
    queryKey: ["history", days],
    queryFn: async () => {
      const { data } = await fetchHistory(days);
      return data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

// ---- Zones (live summary) ----
export function useZones() {
  return useQuery<ApiZone[]>({
    queryKey: ["zones"],
    queryFn: async () => {
      const { data } = await fetchZones();
      return data;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

// ---- Reference zones (static, for map + zone cards) ----
export function useRefZones() {
  return useQuery<RefZone[]>({
    queryKey: ["ref:zones"],
    queryFn: async () => {
      const { data } = await fetchRefZones();
      return data;
    },
    staleTime: 5 * 60_000,   // 5 min — these rarely change
    gcTime:    10 * 60_000,
  });
}

// ---- Depots ----
export function useDepots() {
  return useQuery<Depot[]>({
    queryKey: ["ref:depots"],
    queryFn: async () => {
      const { data } = await fetchDepots();
      return data;
    },
    staleTime: 5 * 60_000,
    gcTime:    10 * 60_000,
  });
}

// ---- Pune bounds (map initialisation) ----
export function usePuneBounds() {
  return useQuery<PuneBounds>({
    queryKey: ["ref:pune-bounds"],
    queryFn: async () => {
      const { data } = await fetchPuneBounds();
      return data;
    },
    staleTime: Infinity,   // static geo data never changes
  });
}

// ---- Alerts ----
export function useAlerts(status?: string) {
  return useQuery<ApiAlert[]>({
    queryKey: ["alerts", status],
    queryFn: async () => {
      const { data } = await fetchAlerts(status);
      return data;
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

// ---- Mutate alert status ----
export function useUpdateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, resolved_by }: { id: number; status: string; resolved_by?: string }) =>
      patchAlert(id, status, resolved_by),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

// ---- Waste categories (live, today) ----
export function useWasteCategories() {
  return useQuery({
    queryKey: ["waste-categories"],
    queryFn: async () => {
      const { data } = await fetchWasteCategories();
      return data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

// ---- Drivers ----
export function useDrivers() {
  return useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const { data } = await fetchDrivers();
      return data as Record<string, unknown>[];
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

// ---- Routes ----
export function useRoutes(date?: string) {
  return useQuery({
    queryKey: ["routes", date],
    queryFn: async () => {
      const { data } = await fetchRoutes(date);
      return data as Record<string, unknown>[];
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

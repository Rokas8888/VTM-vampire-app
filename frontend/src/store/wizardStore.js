import { create } from "zustand";
import api from "../services/api";

const useWizardStore = create((set, get) => ({
  currentStep: 1,
  data: {},
  loading: false,
  error: null,

  // Load existing draft from server
  loadDraft: async () => {
    try {
      const res = await api.get("/api/characters/wizard/draft");
      set({ currentStep: res.data.current_step, data: res.data.data });
    } catch {
      // No draft yet, start fresh
    }
  },

  // Delete the server draft and reset local state to step 1 (for "New Character")
  resetDraft: async () => {
    try {
      await api.delete("/api/characters/wizard/draft");
    } catch {
      // If there was no draft, that's fine — still reset locally
    }
    set({ currentStep: 1, data: {}, error: null });
  },

  // Save step data locally and to server
  saveStep: async (step, stepData) => {
    const newData = { ...get().data, [`step${step}`]: stepData };
    set({ data: newData, error: null });

    try {
      await api.post(`/api/characters/wizard/step/${step}`, stepData);
      // Cap at 10 — step 10 is the last step; going to 11 causes a blank render
      set({ currentStep: Math.min(10, Math.max(get().currentStep, step + 1)) });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.detail || "Something went wrong" });
      return false;
    }
  },

  goToStep: (step) => set({ currentStep: step }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));

export default useWizardStore;

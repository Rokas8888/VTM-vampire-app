import { create } from "zustand";

let nextId = 1;

const useToastStore = create((set) => ({
  toasts: [],

  addToast: (message, type = "info", duration = 3500) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

export default useToastStore;

// Convenience hook — returns shorthand helpers
export function useToast() {
  const { addToast } = useToastStore();
  return {
    success: (msg) => addToast(msg, "success"),
    error:   (msg) => addToast(msg, "error"),
    info:    (msg) => addToast(msg, "info"),
  };
}

import useToastStore from "../../store/toastStore";

const ICONS = {
  success: "✓",
  error:   "✕",
  info:    "ℹ",
};

const STYLES = {
  success: "border-green-700 bg-green-950/90 text-green-200",
  error:   "border-blood-dark bg-black/95 text-red-300",
  info:    "border-void-border bg-void-light/95 text-gray-300",
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 border rounded-lg px-4 py-3 text-sm shadow-xl
            pointer-events-auto max-w-xs animate-fadeSlideIn ${STYLES[t.type]}`}
        >
          <span className="font-bold shrink-0 mt-px">{ICONS[t.type]}</span>
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="text-gray-600 hover:text-gray-300 shrink-0 mt-px leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

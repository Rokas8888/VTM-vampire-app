export default function Spinner({ text = "Awakening…" }) {
  return (
    <div className="flex items-center justify-center h-64">
      <p className="font-gothic text-gray-600 tracking-widest animate-pulse">{text}</p>
    </div>
  );
}

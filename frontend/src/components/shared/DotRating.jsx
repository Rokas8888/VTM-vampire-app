/**
 * DotRating — renders a row of filled/empty dots for V5 ratings.
 * e.g. <DotRating value={3} max={5} /> → ●●●○○
 */
export default function DotRating({ value = 0, max = 5, size = "text-lg" }) {
  return (
    <span className={`tracking-widest ${size}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < value ? "dot-filled" : "dot-empty"}>
          ●
        </span>
      ))}
    </span>
  );
}

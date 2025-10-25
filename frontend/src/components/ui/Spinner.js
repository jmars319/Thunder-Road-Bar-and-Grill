/*
  Spinner

  Purpose:
  - Small, accessible SVG spinner used as an inline loading indicator.

  Contract:
  - Props: { size?: number } — size is the spinner width/height in pixels (default: 24)

  Notes:
  - Keeps markup minimal and relies on the `animate-spin` utility class.
*/
export default function Spinner({ size = 24 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

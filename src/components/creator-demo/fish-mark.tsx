/** Small fish with a play-shaped tail: creation, motion and a friendly personal identity. */
export function FishMark() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="sv-fish-mark"
    >
      <path d="M8 24 3 15v18l5-9Z" fill="currentColor" opacity=".85" />
      <path
        d="M9 24c5-9 12-13 19-12 8 1 13 6 16 12-3 6-8 11-16 12-7 1-14-3-19-12Z"
        fill="currentColor"
      />
      <path
        d="m21 13 7-6 2 7m-9 21 7 6 2-7"
        fill="currentColor"
        opacity=".65"
      />
      <circle cx="35" cy="21" r="2.2" fill="var(--fish-cutout, var(--studio-brand, #254e62))" />
      <path
        d="M17 27c4 3 8 4 12 2"
        stroke="var(--fish-cutout, var(--studio-brand, #254e62))"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity=".55"
      />
      <circle cx="40" cy="8" r="2" fill="currentColor" opacity=".5" />
    </svg>
  );
}

interface VenmoIconProps {
  className?: string;
}

export function VenmoIcon({ className }: VenmoIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.27 1c.94 1.57 1.37 3.18 1.37 5.22 0 6.52-5.56 14.94-10.08 20.78H3.63L.5 2.8l6.1-.58 2.08 16.64C10.88 14.96 13.4 8.64 13.4 5.32c0-1.94-.44-3.28-1.12-4.34L19.27 1z" />
    </svg>
  );
}

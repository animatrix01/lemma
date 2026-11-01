interface LemmaLogoProps {
  className?: string;
}

export function LemmaLogo({ className }: LemmaLogoProps) {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <g fill="currentColor" fillRule="evenodd">
        <circle cx="100" cy="100" r="26" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="17">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <ellipse
            key={angle}
            cx="100"
            cy="52"
            rx="24"
            ry="50"
            transform={`rotate(${angle} 100 100) rotate(28 100 52)`}
          />
        ))}
      </g>
    </svg>
  );
}

export default LemmaLogo;

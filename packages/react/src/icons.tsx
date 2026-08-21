/**
 * Inline SVG, because an icon font or an icon package is a dependency the host
 * site pays for. Each one is drawn on a 16-unit grid and inherits colour.
 */
type Props = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const SparkIcon = ({ size = 14 }: Props) => (
  <svg {...base(size)} fill="currentColor" stroke="none">
    <path d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6L8 1z" />
  </svg>
);

export const ArrowUpIcon = ({ size = 14 }: Props) => (
  <svg {...base(size)} strokeWidth={2}>
    <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" />
  </svg>
);

export const ArrowOutIcon = ({ size = 12 }: Props) => (
  <svg {...base(size)} strokeWidth={2}>
    <path d="M5 11L11 5M5.5 5H11v5.5" />
  </svg>
);

export const CloseIcon = ({ size = 15 }: Props) => (
  <svg {...base(size)}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

export const StopIcon = ({ size = 11 }: Props) => (
  <svg {...base(size)} fill="currentColor" stroke="none">
    <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" />
  </svg>
);

export const ChevronIcon = ({ size = 12 }: Props) => (
  <svg {...base(size)}>
    <path d="M6 3.5L10.5 8 6 12.5" />
  </svg>
);

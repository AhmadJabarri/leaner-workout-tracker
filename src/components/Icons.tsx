// Small inline stroke icons, so the app needs no icon library and works offline.
type IconProps = { size?: number }

function Svg({ size = 22, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const HomeIcon = (props: IconProps) => (
  <Svg {...props}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></Svg>
)
export const HistoryIcon = (props: IconProps) => (
  <Svg {...props}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></Svg>
)
export const ProgressIcon = (props: IconProps) => (
  <Svg {...props}><path d="M3 20h18" /><path d="m4 15 5-5 4 4 7-8" /><path d="M15 6h5v5" /></Svg>
)
export const CoachIcon = (props: IconProps) => (
  <Svg {...props}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" /></Svg>
)
export const ProfileIcon = (props: IconProps) => (
  <Svg {...props}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>
)
export const PlusIcon = (props: IconProps) => (
  <Svg {...props}><path d="M12 5v14M5 12h14" /></Svg>
)
export const CheckIcon = (props: IconProps) => (
  <Svg {...props}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
)
export const CloseIcon = (props: IconProps) => (
  <Svg {...props}><path d="M6 6l12 12M18 6 6 18" /></Svg>
)
export const ChevronRightIcon = (props: IconProps) => (
  <Svg {...props}><path d="m9 6 6 6-6 6" /></Svg>
)
export const ChevronLeftIcon = (props: IconProps) => (
  <Svg {...props}><path d="m15 6-6 6 6 6" /></Svg>
)
export const DumbbellIcon = (props: IconProps) => (
  <Svg {...props}><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" /></Svg>
)
export const FlameIcon = (props: IconProps) => (
  <Svg {...props}><path d="M12 22c4 0 7-2.7 7-6.7 0-3.6-2.6-5.7-4-8.3-.6 2-1.6 3-3 3.5C12.6 7 11 4 8 2c.3 3.4-3 6-3 10.3C5 18.6 8 22 12 22Z" /></Svg>
)
export const SendIcon = (props: IconProps) => (
  <Svg {...props}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7Z" /></Svg>
)
export const TrashIcon = (props: IconProps) => (
  <Svg {...props}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg>
)
export const LogoutIcon = (props: IconProps) => (
  <Svg {...props}><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></Svg>
)

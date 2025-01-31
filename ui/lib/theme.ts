interface Theme {
  border: string;
  bg: string;
  borderLg: string;
  bgHover: string;
  bgActive: string;
  text: string;
  textHover: string;
  ringOffset: string;
  textLight: string;
}

export const themes = {
  indigo: {
    border: "border-indigo-300",
    bg: "bg-indigo-500",
    borderLg: "border-indigo-400",
    bgHover: "hover:bg-indigo-500/75",
    bgActive: "bg-indigo-600",
    text: "text-indigo-200",
    textHover: "hover:text-white",
    ringOffset: "focus:ring-offset-indigo-600",
    textLight: "text-indigo-300",
  },
  blue: {
    border: "border-blue-300",
    bg: "bg-blue-500",
    borderLg: "border-blue-400",
    bgHover: "hover:bg-blue-500/75",
    bgActive: "bg-blue-600",
    text: "text-blue-200",
    textHover: "hover:text-white",
    ringOffset: "focus:ring-offset-blue-600",
    textLight: "text-blue-300",
  },
  red: {
    border: "border-red-300",
    bg: "bg-red-500",
    borderLg: "border-red-400",
    bgHover: "hover:bg-red-500/75",
    bgActive: "bg-red-600",
    text: "text-red-200",
    textHover: "hover:text-white",
    ringOffset: "focus:ring-offset-red-600",
    textLight: "text-red-300",
  },
  amber: {
    border: "border-amber-300",
    bg: "bg-amber-500",
    borderLg: "border-amber-400",
    bgHover: "hover:bg-amber-500/75",
    bgActive: "bg-amber-600",
    text: "text-amber-200",
    textHover: "hover:text-white",
    ringOffset: "focus:ring-offset-amber-600",
    textLight: "text-amber-300",
  },
} as const;

export type ThemeColor = keyof typeof themes;

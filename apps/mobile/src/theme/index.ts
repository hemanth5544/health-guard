export const theme = {
  colors: {
    bg: "#080C14",
    bgCard: "#0F1623",
    bgElevated: "#151E2E",
    border: "#1E2D45",
    accent: "#00D4FF",
    accentGlow: "#00D4FF33",
    success: "#00E5A0",
    warning: "#FFB800",
    danger: "#FF3D6B",
    textPrimary: "#EEF2FF",
    textSecondary: "#6B7FA3",
    textMuted: "#3D4F6B",
    gradientA: ["#00D4FF", "#0066FF"] as const,
    gradientB: ["#FF3D6B", "#FF6B00"] as const,
    gradientC: ["#00E5A0", "#00D4FF"] as const
  },
  radius: { sm: 8, md: 14, lg: 20, xl: 28 } as const,
  shadow: {
    glow: { shadowColor: "#00D4FF", shadowOpacity: 0.4, shadowRadius: 16 },
    card: { shadowColor: "#000000", shadowOpacity: 0.5, shadowRadius: 12 }
  }
};


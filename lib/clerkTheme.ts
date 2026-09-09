import { THEMES, type ThemeId } from "@/lib/theme";

interface ClerkPalette {
  colorBackground: string;
  colorInput: string;
  colorForeground: string;
  colorMutedForeground: string;
  colorMuted: string;
  colorBorder: string;
  colorNeutral: string;
  colorModalBackdrop: string;
}

function getClerkPalette(themeId: ThemeId): ClerkPalette {
  const { tokens, category } = THEMES[themeId];
  const isDark = category === "dark";

  return {
    colorBackground: tokens.bg,
    colorInput: tokens.surface,
    colorForeground: tokens.text,
    colorMutedForeground: tokens.textMuted,
    colorMuted: tokens.surface,
    colorBorder: tokens.border,
    colorNeutral: tokens.text,
    colorModalBackdrop: isDark ? "rgba(0, 0, 0, 0.72)" : "rgba(0, 0, 0, 0.45)",
  };
}

const hidden = { display: "none" } as const;

const clerkOptions = {
  animations: false,
  socialButtonsPlacement: "top" as const,
  socialButtonsVariant: "blockButton" as const,
  showOptionalFields: false,
  privacyPageUrl: "/privacy",
  termsPageUrl: "/terms",
};

interface BuildClerkAppearanceOptions {
  hideHeader?: boolean;
}

export function buildClerkAppearance(
  themeId: ThemeId,
  { hideHeader = false }: BuildClerkAppearanceOptions = {}
) {
  const theme = THEMES[themeId];
  const palette = getClerkPalette(themeId);
  const { tokens } = theme;
  const pageCardPadding = hideHeader ? "2rem 1.75rem" : "1.75rem 1.5rem";

  return {
    variables: {
      colorPrimary: tokens.accent,
      colorPrimaryForeground: "#ffffff",
      colorForeground: palette.colorForeground,
      colorMutedForeground: palette.colorMutedForeground,
      colorBackground: palette.colorBackground,
      colorInput: palette.colorInput,
      colorInputForeground: palette.colorForeground,
      colorBorder: palette.colorBorder,
      colorMuted: palette.colorMuted,
      colorNeutral: palette.colorNeutral,
      colorRing: tokens.accent,
      colorModalBackdrop: palette.colorModalBackdrop,
      colorDanger: "#cf222e",
      colorSuccess: tokens.accent,
      colorWarning: "#9a6700",
      fontFamily: "var(--font-mono), ui-monospace, monospace",
      fontFamilyButtons: "var(--font-mono), ui-monospace, monospace",
      borderRadius: "0px",
      spacing: "1.25rem",
      fontSize: {
        xs: "12px",
        sm: "13px",
        md: "14px",
        lg: "16px",
        xl: "18px",
      },
    },
    elements: {
      rootBox: { width: "100%" },
      cardBox: {
        width: "100%",
        border: `1px solid ${tokens.border}`,
        boxShadow: "none",
        backgroundColor: tokens.bg,
      },
      card: {
        width: "100%",
        backgroundColor: tokens.bg,
        border: `1px solid ${tokens.border}`,
        boxShadow: "none",
        padding: pageCardPadding,
      },
      main: {
        gap: hideHeader ? "1.75rem" : "1.5rem",
      },
      form: {
        gap: hideHeader ? "1.375rem" : "1.125rem",
      },
      formFieldRow: {
        gap: "0.5rem",
      },
      formFieldLabel: {
        fontSize: "12px",
        fontFamily: "var(--font-mono), ui-monospace, monospace",
        marginBottom: "0.125rem",
      },
      modalContent: {
        backgroundColor: tokens.bg,
        border: `1px solid ${tokens.border}`,
        boxShadow: "none",
        padding: pageCardPadding,
      },
      socialButtonsBlockButton: {
        borderRadius: "0px",
        border: `1px solid ${tokens.border}`,
        backgroundColor: tokens.surface,
        color: tokens.text,
        minHeight: "2.75rem",
        padding: "0.75rem 1rem",
        fontSize: "13px",
        fontFamily: "var(--font-mono), ui-monospace, monospace",
        "&:hover": {
          backgroundColor: tokens.surface,
          borderColor: tokens.textMuted,
        },
      },
      socialButtons: {
        gap: "0.75rem",
      },
      formFieldInput: {
        borderRadius: "0px",
        border: `1px solid ${tokens.border}`,
        backgroundColor: tokens.surface,
        color: tokens.text,
        minHeight: "2.75rem",
        padding: "0.75rem 1rem",
        fontSize: "14px",
        fontFamily: "var(--font-mono), ui-monospace, monospace",
      },
      formButtonPrimary: {
        borderRadius: "0px",
        fontWeight: 500,
        fontSize: "13px",
        fontFamily: "var(--font-mono), ui-monospace, monospace",
        minHeight: "2.875rem",
        padding: "0.8rem 1.25rem",
        marginTop: hideHeader ? "0.25rem" : undefined,
      },
      dividerRow: {
        margin: hideHeader ? "0.25rem 0" : undefined,
      },
      footer: {
        background: "transparent",
        borderTop: `1px solid ${tokens.border}`,
        paddingTop: "1rem",
        marginTop: "0.25rem",
      },
      footerAction: {
        padding: "0.625rem 0",
      },
      footerPages: {
        background: "transparent",
        gap: "0.75rem",
        fontSize: "12px",
        fontFamily: "var(--font-mono), ui-monospace, monospace",
      },
      footerActionLink: {
        color: tokens.accent,
        "&:hover": {
          color: tokens.accentHover,
        },
      },
      formFieldAction: {
        color: tokens.accent,
      },
      ...(hideHeader
        ? {
            header: hidden,
            headerTitle: hidden,
            headerSubtitle: hidden,
            logoBox: hidden,
            logoImage: hidden,
          }
        : {}),
    },
    options: clerkOptions,
  };
}

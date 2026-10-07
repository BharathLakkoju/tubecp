import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * Evergreen type scale (`--text-*` in app/globals.css). Registering these as font sizes keeps
 * `text-body-sm` and `text-foreground` from being treated as the same (color) group, which
 * would silently drop one of them. Likewise the shadow scale.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "headline", "title", "title-sm", "body", "body-sm", "label", "caption"] },
      ],
      shadow: [{ shadow: ["1", "2", "3"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

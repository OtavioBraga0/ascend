export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = "ascend-theme";

/**
 * Script inline executado antes da pintura: aplica a classe `dark` conforme a
 * preferência salva (ou a do sistema) e acompanha mudanças do sistema.
 * Expõe `window.__setTheme` para o seletor de tema.
 */
export const themeScript = `(() => {
  const key = ${JSON.stringify(THEME_STORAGE_KEY)};
  const media = matchMedia("(prefers-color-scheme: dark)");
  const stored = () => { try { return localStorage.getItem(key) || "system"; } catch { return "system"; } };
  const apply = (theme) => {
    const dark = theme === "dark" || (theme === "system" && media.matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  };
  window.__setTheme = (theme) => {
    try { localStorage.setItem(key, theme); } catch {}
    apply(theme);
  };
  media.addEventListener("change", () => apply(stored()));
  apply(stored());
})();`;

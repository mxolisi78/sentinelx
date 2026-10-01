import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="p-2 rounded-md border border-slate-300 dark:border-slate-700 hover:border-sky-500 text-slate-600 dark:text-slate-400 transition-colors"
    >
      <Icon size={16} />
    </button>
  );
}

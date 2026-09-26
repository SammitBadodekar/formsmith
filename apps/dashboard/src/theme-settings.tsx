import { defaultTheme, type FormDefinition } from "@formsmith/core";
import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import { useEffect, useId, useState } from "react";

type Theme = FormDefinition["theme"];
export function ThemeSettings({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (change: Partial<Theme>) => void;
}) {
  const color = (label: string, key: keyof Theme, fallback: string) => (
    <ColorField
      key={key}
      alpha={String(key).startsWith("input")}
      label={label}
      value={String(theme[key] ?? fallback)}
      onChange={(value) => onChange({ [key]: value, mode: "custom" })}
    />
  );
  const number = (label: string, key: keyof Theme, fallback: number, min = 0, max = 1200) => (
    <NumberField
      key={key}
      label={label}
      value={Number(theme[key] ?? fallback)}
      min={min}
      max={max}
      unit={key === "coverHeight" && theme.coverHeightUnit !== "px" ? "%" : "px"}
      onChange={(value) => onChange({ [key]: value })}
    />
  );
  return (
    <div className="theme-settings">
      <label className="theme-field">
        Theme
        <select
          value={theme.mode ?? (theme.background === "#ffffff" ? "light" : "custom")}
          onChange={(e) => {
            const mode = e.target.value as "light" | "dark" | "custom";
            if (mode === "custom") return onChange({ mode });
            const dark = mode === "dark";
            onChange({
              mode,
              background: dark ? "#1f1f1f" : defaultTheme.background,
              text: dark ? "#cfcfcf" : defaultTheme.text,
              button: dark ? "#cfcfcf" : defaultTheme.button,
              buttonText: dark ? "#1f1f1f" : defaultTheme.buttonText,
              accent: defaultTheme.accent,
              inputBackground: dark ? "#1f1f1f" : "#ffffff",
              inputBorder: dark ? "#565656" : "#3d3b3529",
              inputPlaceholder: dark ? "#9b9b9b" : "#bbbab8",
            });
          }}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      <label className="theme-field">
        Font
        <select
          value={theme.font ?? "Inter"}
          onChange={(e) => onChange({ font: e.target.value as Theme["font"] })}
        >
          {["Inter", "System", "Georgia", "Monospace"].map((font) => (
            <option key={font}>{font}</option>
          ))}
        </select>
      </label>
      <div className="theme-grid">
        {color("Background", "background", "#ffffff")}
        {color("Text", "text", "#37352f")}
        {color("Button background", "button", "#000000")}
        {color("Button text", "buttonText", "#ffffff")}
      </div>
      {color("Accent", "accent", "#0070d7")}
      <h3 className="theme-advanced">Advanced</h3>
      <fieldset>
        <legend>Layout</legend>
        <div className="theme-grid">
          {number("Page width", "width", 700, 400)}
          {number("Base font size", "fontSize", 16, 14, 24)}
        </div>
        <div className="theme-grid three">
          {number("Logo width", "logoWidth", 100, 24, 400)}
          {number("Logo height", "logoHeight", 100, 24, 400)}
          {number("Logo radius", "logoRadius", 50, 0, 200)}
        </div>
        <div className="theme-grid">
          {number("Cover height", "coverHeight", 25, 0, theme.coverHeightUnit === "px" ? 800 : 100)}
          <label className="theme-field">
            Cover unit
            <select
              value={theme.coverHeightUnit ?? "vh"}
              onChange={(e) =>
                onChange({
                  coverHeightUnit: e.target.value as "px" | "vh",
                  coverHeight: e.target.value === "px" ? 200 : 25,
                })
              }
            >
              <option value="vh">% of screen</option>
              <option value="px">Pixels</option>
            </select>
          </label>
        </div>
        <label className="theme-field">
          Cover position
          <input
            aria-label="Cover position"
            type="range"
            min={0}
            max={100}
            value={theme.coverPosition ?? 50}
            onChange={(e) => onChange({ coverPosition: Number(e.target.value) })}
          />
        </label>
      </fieldset>
      <fieldset>
        <legend>Inputs</legend>
        <div className="theme-grid">
          <label className="theme-field">
            Width
            <select
              value={theme.inputWidthMode ?? "fixed"}
              onChange={(e) => onChange({ inputWidthMode: e.target.value as "fixed" | "full" })}
            >
              <option value="fixed">Fixed width</option>
              <option value="full">Full width</option>
            </select>
          </label>
          {number("Height", "inputHeight", 36, 28, 120)}
        </div>
        {theme.inputWidthMode !== "full" && number("Input width", "inputWidth", 320, 80)}
        <div className="theme-grid">
          {color("Background", "inputBackground", theme.background)}
          {color("Placeholder", "inputPlaceholder", "#bbbab8")}
        </div>
        <div className="theme-grid three">
          {color("Border", "inputBorder", "#3d3b3529")}
          {number("Border width", "inputBorderWidth", 1, 0, 8)}
          {number("Radius", "inputRadius", theme.radius, 0, 60)}
        </div>
        <div className="theme-grid">
          {number("Margin bottom", "inputMargin", 10, 0, 100)}
          {number("Horizontal padding", "inputPadding", 10, 0, 60)}
        </div>
      </fieldset>
      <fieldset>
        <legend>Buttons</legend>
        <div className="theme-grid">
          <label className="theme-field">
            Width
            <select
              value={theme.buttonWidthMode ?? "auto"}
              onChange={(e) =>
                onChange({ buttonWidthMode: e.target.value as Theme["buttonWidthMode"] })
              }
            >
              <option value="auto">Auto</option>
              <option value="fixed">Fixed width</option>
              <option value="full">Full width</option>
            </select>
          </label>
          {number("Height", "buttonHeight", 36, 28, 120)}
        </div>
        {theme.buttonWidthMode === "fixed" && number("Button width", "buttonWidth", 120, 60)}
        <div className="theme-grid three">
          <div className="theme-field">
            Alignment
            <div className="segmented-control">
              {(
                [
                  ["left", AlignLeft],
                  ["center", AlignCenter],
                  ["right", AlignRight],
                ] as const
              ).map(([align, Icon]) => (
                <button
                  type="button"
                  key={align}
                  aria-label={`Align button ${align}`}
                  aria-pressed={(theme.buttonAlign ?? "left") === align}
                  onClick={() => onChange({ buttonAlign: align })}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>
          {number("Font size", "buttonFontSize", 15, 12, 40)}
          {number("Corner radius", "buttonRadius", theme.radius, 0, 60)}
        </div>
        <div className="theme-grid">
          {color("Background", "button", "#000000")}
          {color("Text", "buttonText", "#ffffff")}
          {number("Vertical margin", "buttonMargin", 10, 0, 100)}
          {number("Horizontal padding", "buttonPadding", 14, 0, 80)}
        </div>
      </fieldset>
    </div>
  );
}
function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  unit = "px",
}: {
  unit?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <label className="theme-field">
      {label}
      <span className="number-control">
        <input
          type="number"
          min={min}
          max={max}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(n) && n >= min && n <= max) onChange(n);
          }}
          onBlur={() => setDraft(String(value))}
        />
        <span aria-hidden="true">{unit}</span>
      </span>
    </label>
  );
}
function ColorField({
  alpha = false,
  label,
  value,
  onChange,
}: {
  alpha?: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="theme-field">
      <label htmlFor={id}>{label}</label>
      <div className="color-control">
        <input
          type="color"
          aria-label={`Pick ${label.toLowerCase()} color`}
          value={value.slice(0, 7)}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          id={id}
          value={draft}
          spellCheck={false}
          maxLength={alpha ? 9 : 7}
          onChange={(e) => {
            setDraft(e.target.value);
            if ((alpha ? /^#[0-9a-f]{6}([0-9a-f]{2})?$/i : /^#[0-9a-f]{6}$/i).test(e.target.value))
              onChange(e.target.value);
          }}
          onBlur={() => setDraft(value)}
        />
      </div>
    </div>
  );
}

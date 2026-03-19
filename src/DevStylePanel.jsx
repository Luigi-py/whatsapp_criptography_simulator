import { useState, useEffect, useCallback, useRef } from "react";

/* ── CSS Variable groups to control ──────────────────── */

const FONT_OPTIONS = [
  "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  "'Inter', system-ui, sans-serif",
  "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  "Georgia, 'Times New Roman', serif",
  "'Courier New', Courier, monospace",
];

const MONO_FONT_OPTIONS = [
  "ui-monospace, 'Cascadia Code', 'Fira Code', Consolas, monospace",
  "'JetBrains Mono', 'Fira Code', monospace",
  "'Courier New', Courier, monospace",
  "'SF Mono', Monaco, 'Cascadia Code', monospace",
];

const SECTIONS = [
  {
    id: "global",
    label: "Global / Fundo",
    vars: [
      { key: "--color-background-primary", label: "Fundo primario", type: "color" },
      { key: "--color-background-secondary", label: "Fundo secundario", type: "color" },
      { key: "--color-text-primary", label: "Texto primario", type: "color" },
      { key: "--color-text-secondary", label: "Texto secundario", type: "color" },
      { key: "--color-text-tertiary", label: "Texto terciario", type: "color" },
      { key: "--color-border-secondary", label: "Borda secundaria", type: "color" },
      { key: "--color-border-tertiary", label: "Borda terciaria", type: "color" },
    ],
  },
  {
    id: "semantic",
    label: "Cores Semanticas",
    vars: [
      { key: "--color-text-info", label: "Info (texto)", type: "color" },
      { key: "--color-text-danger", label: "Danger (texto)", type: "color" },
      { key: "--color-text-success", label: "Success (texto)", type: "color" },
      { key: "--color-text-warning", label: "Warning (texto)", type: "color" },
      { key: "--color-background-info", label: "Info (fundo)", type: "color" },
      { key: "--color-background-danger", label: "Danger (fundo)", type: "color" },
      { key: "--color-background-success", label: "Success (fundo)", type: "color" },
      { key: "--color-background-warning", label: "Warning (fundo)", type: "color" },
      { key: "--color-border-info", label: "Info (borda)", type: "color" },
    ],
  },
  {
    id: "chat",
    label: "Alice & Bob / Chat",
    vars: [
      { key: "--color-text-alice", label: "Alice (cor)", type: "color" },
      { key: "--color-background-alice", label: "Alice (fundo)", type: "color" },
      { key: "--color-text-bob", label: "Bob (cor)", type: "color" },
      { key: "--color-background-bob", label: "Bob (fundo)", type: "color" },
      { key: "--color-background-chat-sent", label: "Balao enviado (Alice)", type: "color" },
      { key: "--color-background-chat-received", label: "Balao recebido (Bob)", type: "color" },
      { key: "--color-background-ratchet-event", label: "Evento ratchet", type: "color" },
    ],
  },
  {
    id: "fonts",
    label: "Fontes & Tamanhos",
    vars: [
      { key: "__fontBody", label: "Fonte corpo", type: "fontFamily" },
      { key: "__fontMono", label: "Fonte mono", type: "monoFamily" },
      { key: "__baseFontSize", label: "Tamanho base (px)", type: "range", min: 12, max: 32, step: 1 },
      { key: "__titleFontSize", label: "Titulo (px)", type: "range", min: 16, max: 48, step: 1 },
      { key: "__labelFontSize", label: "Labels (px)", type: "range", min: 11, max: 28, step: 1 },
      { key: "__monoFontSize", label: "Mono/codigo (px)", type: "range", min: 12, max: 32, step: 1 },
      { key: "__smallFontSize", label: "Texto pequeno (px)", type: "range", min: 10, max: 24, step: 1 },
    ],
  },
  {
    id: "spacing",
    label: "Espacamento & Layout",
    vars: [
      { key: "--border-radius-md", label: "Border radius md", type: "px", min: 0, max: 32 },
      { key: "--border-radius-lg", label: "Border radius lg", type: "px", min: 0, max: 40 },
      { key: "__containerPadding", label: "Padding container (px)", type: "range", min: 12, max: 64, step: 2 },
      { key: "__cardPadding", label: "Padding cards (px)", type: "range", min: 8, max: 48, step: 2 },
    ],
  },
  {
    id: "caesar",
    label: "Cifra de Cesar",
    vars: [
      { key: "__caesarBoxSize", label: "Caixa letra (px)", type: "range", min: 32, max: 96, step: 2 },
      { key: "__caesarLetterSize", label: "Letra na caixa (px)", type: "range", min: 14, max: 40, step: 1 },
      { key: "__caesarAlphabetSize", label: "Alfabeto (px)", type: "range", min: 11, max: 28, step: 1 },
      { key: "__caesarAlphabetCellWidth", label: "Celula alfabeto (px)", type: "range", min: 20, max: 56, step: 1 },
    ],
  },
  {
    id: "xor",
    label: "XOR ao Vivo",
    vars: [
      { key: "__xorCharSize", label: "Char header (px)", type: "range", min: 16, max: 40, step: 1 },
      { key: "__xorBitSize", label: "Bit font (px)", type: "range", min: 12, max: 32, step: 1 },
      { key: "__xorLabelSize", label: "Label (px)", type: "range", min: 12, max: 28, step: 1 },
    ],
  },
  {
    id: "e2e",
    label: "WhatsApp E2E",
    vars: [
      { key: "__e2ePhaseTabSize", label: "Tab fase (px)", type: "range", min: 12, max: 28, step: 1 },
      { key: "__e2eDescSize", label: "Descricao (px)", type: "range", min: 13, max: 28, step: 1 },
      { key: "__e2eHexSize", label: "Hex values (px)", type: "range", min: 13, max: 30, step: 1 },
      { key: "__e2eChatMsgSize", label: "Chat msg (px)", type: "range", min: 13, max: 30, step: 1 },
      { key: "__e2eChatMetaSize", label: "Chat meta (px)", type: "range", min: 10, max: 22, step: 1 },
      { key: "__e2eKeyPanelSize", label: "Key panel (px)", type: "range", min: 12, max: 24, step: 1 },
    ],
  },
];

/* ── Build type lookup ─────────────────────────────────── */

const VAR_TYPES = {};
SECTIONS.forEach((sec) =>
  sec.vars.forEach((v) => {
    VAR_TYPES[v.key] = v.type;
  })
);

/* Helper: read current computed CSS variable value */
function getCurrentValue(key) {
  return getComputedStyle(document.documentElement).getPropertyValue(key).trim();
}

/* Helper: convert any CSS color to hex for color input */
function colorToHex(color) {
  if (!color) return "#000000";
  const s = color.trim();
  if (s.startsWith("#")) {
    if (s.length === 4) return "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return s.slice(0, 7);
  }
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    return (
      "#" +
      [m[1], m[2], m[3]]
        .map((x) => (+x).toString(16).padStart(2, "0"))
        .join("")
    );
  }
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fillStyle = s;
  const v = ctx.fillStyle;
  if (v.startsWith("#")) return v.slice(0, 7);
  return "#000000";
}

/* Defaults for custom (non-CSS-var) size keys */
const SIZE_DEFAULTS = {
  __baseFontSize: 17,
  __titleFontSize: 22,
  __labelFontSize: 15,
  __monoFontSize: 16,
  __smallFontSize: 14,
  __containerPadding: 32,
  __cardPadding: 16,
  __caesarBoxSize: 50,
  __caesarLetterSize: 20,
  __caesarAlphabetSize: 15,
  __caesarAlphabetCellWidth: 30,
  __xorCharSize: 22,
  __xorBitSize: 16,
  __xorLabelSize: 15,
  __e2ePhaseTabSize: 15,
  __e2eDescSize: 17,
  __e2eHexSize: 16,
  __e2eChatMsgSize: 16,
  __e2eChatMetaSize: 13,
  __e2eKeyPanelSize: 14,
  __fontBody: FONT_OPTIONS[0],
  __fontMono: MONO_FONT_OPTIONS[0],
};

export const DevStyleContext = {
  _values: { ...SIZE_DEFAULTS },
  _listeners: new Set(),
  get(key) {
    return this._values[key] ?? SIZE_DEFAULTS[key];
  },
  set(key, val) {
    this._values[key] = val;
    this._listeners.forEach((fn) => fn());
  },
  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  },
};

export function useDevStyle(key) {
  const [val, setVal] = useState(() => DevStyleContext.get(key));
  useEffect(() => {
    return DevStyleContext.subscribe(() => {
      setVal(DevStyleContext.get(key));
    });
  }, [key]);
  return val;
}

export function useDevStyles(...keys) {
  const [vals, setVals] = useState(() =>
    Object.fromEntries(keys.map((k) => [k, DevStyleContext.get(k)]))
  );
  useEffect(() => {
    return DevStyleContext.subscribe(() => {
      setVals(Object.fromEntries(keys.map((k) => [k, DevStyleContext.get(k)])));
    });
  }, [keys.join(",")]);
  return vals;
}

/* ── Helpers: apply / clear / read ─────────────────────── */

function applyValueToDOM(key, val) {
  if (key.startsWith("__")) {
    if (key === "__fontBody") {
      document.documentElement.style.fontFamily = val;
    } else if (key === "__fontMono") {
      document.documentElement.style.setProperty("--font-mono", val);
    } else {
      DevStyleContext.set(key, val);
    }
  } else if (VAR_TYPES[key] === "px") {
    document.documentElement.style.setProperty(key, val + "px");
  } else {
    document.documentElement.style.setProperty(key, val);
  }
}

function clearAllOverridesFromDOM() {
  SECTIONS.forEach((sec) =>
    sec.vars.forEach((v) => {
      if (!v.key.startsWith("__")) {
        document.documentElement.style.removeProperty(v.key);
      }
    })
  );
  document.documentElement.style.fontFamily = "";
  document.documentElement.style.removeProperty("--font-mono");
  Object.entries(SIZE_DEFAULTS).forEach(([k, v]) => {
    DevStyleContext.set(k, v);
  });
}

function readCurrentDefaults() {
  const defaults = {};
  SECTIONS.forEach((sec) =>
    sec.vars.forEach((v) => {
      if (v.key.startsWith("__")) {
        defaults[v.key] = SIZE_DEFAULTS[v.key];
      } else if (v.type === "color") {
        defaults[v.key] = colorToHex(getCurrentValue(v.key));
      } else if (v.type === "px") {
        defaults[v.key] = parseInt(getCurrentValue(v.key)) || 8;
      }
    })
  );
  return defaults;
}

/* ── Panel Component ─────────────────────────────────── */

const panelStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: 320,
  maxWidth: "85vw",
  height: "100vh",
  overflowY: "auto",
  background: "#1a1a2e",
  color: "#e0e0e0",
  fontSize: 12,
  zIndex: 99999,
  boxShadow: "4px 0 20px rgba(0,0,0,0.5)",
  padding: "10px 12px",
  fontFamily: "system-ui, sans-serif",
};

const toggleBtnStyle = {
  position: "fixed",
  top: 10,
  left: 10,
  zIndex: 100000,
  background: "#e63946",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
};

export default function DevStylePanel() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [, forceUpdate] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  /* ── Theme-aware state ──────────────────────────────── */
  const [currentTheme, setCurrentTheme] = useState(
    () => document.documentElement.getAttribute("data-theme") || "light"
  );

  // Per-theme overrides: only stores what the user explicitly changed
  const themeOverridesRef = useRef({ light: {}, dark: {} });

  // Display values = theme defaults merged with overrides
  const [values, setValues] = useState({});

  // Suppress re-apply during theme switch
  const switchingRef = useRef(false);

  /* ── Watch for theme changes via MutationObserver ──── */
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const t =
        document.documentElement.getAttribute("data-theme") || "light";
      setCurrentTheme((prev) => {
        if (prev !== t) return t;
        return prev;
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  /* ── Initialize / react to theme changes ───────────── */
  useEffect(() => {
    switchingRef.current = true;

    // 1. Clear all inline overrides so CSS theme defaults take effect
    clearAllOverridesFromDOM();

    // 2. Wait one frame for computed styles to settle after clear
    requestAnimationFrame(() => {
      // 3. Read true CSS defaults for this theme
      const defaults = readCurrentDefaults();

      // 4. Merge with any saved overrides for this theme
      const overrides = themeOverridesRef.current[currentTheme] || {};
      const merged = { ...defaults, ...overrides };

      // 5. Apply saved overrides to DOM
      Object.entries(overrides).forEach(([key, val]) =>
        applyValueToDOM(key, val)
      );

      // 6. Update display
      setValues(merged);
      forceUpdate((n) => n + 1);
      switchingRef.current = false;
    });
  }, [currentTheme]);

  /* ── Update a single value ─────────────────────────── */
  const update = useCallback(
    (key, val) => {
      if (switchingRef.current) return;

      // Update display values
      setValues((prev) => ({ ...prev, [key]: val }));

      // Store as override for current theme
      themeOverridesRef.current[currentTheme] = {
        ...themeOverridesRef.current[currentTheme],
        [key]: val,
      };

      // Apply to DOM
      applyValueToDOM(key, val);

      forceUpdate((n) => n + 1);
    },
    [currentTheme]
  );

  const toggleSection = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /* ── Export CSS (current theme only) ────────────────── */
  const exportCSS = () => {
    const theme = currentTheme;
    let css =
      theme === "dark"
        ? '/* Tema: ESCURO */\nhtml[data-theme="dark"] {\n'
        : "/* Tema: CLARO */\n:root {\n";
    SECTIONS.forEach((sec) => {
      sec.vars.forEach((v) => {
        if (!v.key.startsWith("__") && values[v.key] !== undefined) {
          const val = values[v.key];
          if (v.type === "px") {
            css += `  ${v.key}: ${val}px;\n`;
          } else {
            css += `  ${v.key}: ${val};\n`;
          }
        }
      });
    });
    css += "}\n\n/* Custom sizes (apply in JSX inline styles) */\n";
    css += `/* theme: ${theme} */\n`;
    SECTIONS.forEach((sec) => {
      sec.vars.forEach((v) => {
        if (v.key.startsWith("__") && values[v.key] !== undefined) {
          css += `/* ${v.label}: ${values[v.key]}${v.type === "range" ? "px" : ""} */\n`;
        }
      });
    });
    navigator.clipboard.writeText(css).then(() =>
      alert(`CSS do tema ${theme === "dark" ? "ESCURO" : "CLARO"} copiado!`)
    );
  };

  /* ── Import CSS ──────────────────────────────────────── */
  const importCSS = () => {
    const input = importText.trim();
    if (!input) return;

    const labelMap = {};
    SECTIONS.forEach((sec) =>
      sec.vars.forEach((v) => {
        labelMap[v.label] = v;
      })
    );
    const keyMap = {};
    SECTIONS.forEach((sec) =>
      sec.vars.forEach((v) => {
        keyMap[v.key] = v;
      })
    );

    // Parse CSS variables
    const cssVarRegex = /\s*(--[\w-]+)\s*:\s*([^;]+);/g;
    let match;
    while ((match = cssVarRegex.exec(input)) !== null) {
      const key = match[1].trim();
      const rawVal = match[2].trim();
      if (keyMap[key]) {
        if (keyMap[key].type === "px") {
          update(key, parseInt(rawVal) || 0);
        } else {
          update(key, rawVal);
        }
      }
    }

    // Parse comment values
    const commentRegex = /\/\*\s*(.+?)\s*:\s*(.+?)\s*\*\//g;
    while ((match = commentRegex.exec(input)) !== null) {
      const label = match[1].trim();
      const rawVal = match[2].trim();
      const entry = labelMap[label];
      if (!entry) continue;

      if (entry.type === "range") {
        const num = parseInt(rawVal);
        if (!isNaN(num)) update(entry.key, num);
      } else if (entry.type === "fontFamily" || entry.type === "monoFamily") {
        update(entry.key, rawVal);
      }
    }

    setShowImport(false);
    setImportText("");
    alert(
      `CSS importado para o tema ${currentTheme === "dark" ? "ESCURO" : "CLARO"}!`
    );
  };

  /* ── Reset (current theme only) ─────────────────────── */
  const resetAll = () => {
    // Clear overrides for current theme
    themeOverridesRef.current[currentTheme] = {};

    // Remove all inline styles
    clearAllOverridesFromDOM();

    // Re-read defaults
    requestAnimationFrame(() => {
      const defaults = readCurrentDefaults();
      setValues(defaults);
      forceUpdate((n) => n + 1);
    });
  };

  /* ── Numeric value for range/px inputs ─────────────── */
  const numericVal = (key) => {
    const v = values[key];
    if (v === undefined || v === null) return 0;
    if (typeof v === "number") return v;
    return parseInt(v) || 0;
  };

  /* ── Render ─────────────────────────────────────────── */

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={toggleBtnStyle}>
        DEV STYLE
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(false)}
        style={{ ...toggleBtnStyle, left: "min(332px, calc(85vw + 12px))" }}
      >
        X
      </button>
      <div style={panelStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: "#e63946" }}>
            DEV STYLE PANEL
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={exportCSS}
              style={{
                background: "#2a9d8f",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "4px 8px",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Exportar
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              style={{
                background: showImport ? "#e6b800" : "#4895ef",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "4px 8px",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {showImport ? "Cancelar" : "Importar"}
            </button>
            <button
              onClick={resetAll}
              style={{
                background: "#555",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "4px 8px",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* ── Theme indicator ──────────────────────────── */}
        <div
          style={{
            marginBottom: 10,
            padding: "6px 10px",
            borderRadius: 6,
            background:
              currentTheme === "dark"
                ? "rgba(255,255,255,0.08)"
                : "rgba(255,255,255,0.15)",
            border: `1.5px solid ${currentTheme === "dark" ? "#b197fc" : "#fbbf24"}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background:
                currentTheme === "dark" ? "#b197fc" : "#fbbf24",
            }}
          />
          <span>
            Editando tema:{" "}
            <strong style={{ color: currentTheme === "dark" ? "#b197fc" : "#fbbf24" }}>
              {currentTheme === "dark" ? "ESCURO" : "CLARO"}
            </strong>
          </span>
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#888" }}>
            Cada tema tem sua própria config
          </span>
        </div>

        {showImport && (
          <div
            style={{
              marginBottom: 10,
              background: "#16162b",
              borderRadius: 4,
              padding: 8,
            }}
          >
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 6 }}>
              Cole o CSS exportado abaixo e clique Aplicar (aplica no tema{" "}
              <strong>
                {currentTheme === "dark" ? "escuro" : "claro"}
              </strong>
              ):
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Cole o CSS exportado aqui..."
              style={{
                width: "100%",
                height: 120,
                fontSize: 10,
                fontFamily: "monospace",
                background: "#0d0d1a",
                color: "#ddd",
                border: "1px solid #444",
                borderRadius: 3,
                padding: 6,
                resize: "vertical",
              }}
            />
            <button
              onClick={importCSS}
              disabled={!importText.trim()}
              style={{
                marginTop: 6,
                width: "100%",
                background: "#2a9d8f",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "6px 10px",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 600,
                opacity: importText.trim() ? 1 : 0.4,
              }}
            >
              Aplicar CSS
            </button>
          </div>
        )}

        {SECTIONS.map((sec) => (
          <div key={sec.id} style={{ marginBottom: 6 }}>
            <button
              onClick={() => toggleSection(sec.id)}
              style={{
                width: "100%",
                textAlign: "left",
                background: expanded[sec.id] ? "#2a2a4a" : "#222244",
                color: "#e0e0e0",
                border: "1px solid #333",
                borderRadius: 4,
                padding: "7px 10px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>{sec.label}</span>
              <span>{expanded[sec.id] ? "v" : ">"}</span>
            </button>

            {expanded[sec.id] && (
              <div
                style={{
                  padding: "8px 6px",
                  background: "#16162b",
                  borderRadius: "0 0 4px 4px",
                }}
              >
                {sec.vars.map((v) => (
                  <div
                    key={v.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 7,
                      flexWrap: "wrap",
                    }}
                  >
                    <label
                      style={{ flex: "1 1 120px", fontSize: 11, color: "#aaa" }}
                    >
                      {v.label}
                    </label>

                    {v.type === "color" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <input
                          type="color"
                          value={colorToHex(values[v.key]) || "#000000"}
                          onChange={(e) => update(v.key, e.target.value)}
                          style={{
                            width: 28,
                            height: 22,
                            border: "none",
                            cursor: "pointer",
                            background: "transparent",
                          }}
                        />
                        <input
                          type="text"
                          value={values[v.key] || ""}
                          onChange={(e) => update(v.key, e.target.value)}
                          style={{
                            width: 72,
                            fontSize: 10,
                            padding: "2px 4px",
                            background: "#222",
                            color: "#ddd",
                            border: "1px solid #444",
                            borderRadius: 3,
                            fontFamily: "monospace",
                          }}
                        />
                      </div>
                    )}

                    {(v.type === "range" || v.type === "px") && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <input
                          type="range"
                          min={v.min || 0}
                          max={v.max || 48}
                          step={v.step || 1}
                          value={numericVal(v.key)}
                          onChange={(e) => update(v.key, +e.target.value)}
                          style={{ width: 80, accentColor: "#e63946" }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            fontFamily: "monospace",
                            minWidth: 28,
                          }}
                        >
                          {numericVal(v.key)}px
                        </span>
                      </div>
                    )}

                    {v.type === "fontFamily" && (
                      <select
                        value={values[v.key] || FONT_OPTIONS[0]}
                        onChange={(e) => update(v.key, e.target.value)}
                        style={{
                          flex: "1 1 140px",
                          fontSize: 10,
                          padding: "3px 4px",
                          background: "#222",
                          color: "#ddd",
                          border: "1px solid #444",
                          borderRadius: 3,
                        }}
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option key={f} value={f}>
                            {f.split(",")[0].replace(/'/g, "")}
                          </option>
                        ))}
                      </select>
                    )}

                    {v.type === "monoFamily" && (
                      <select
                        value={values[v.key] || MONO_FONT_OPTIONS[0]}
                        onChange={(e) => update(v.key, e.target.value)}
                        style={{
                          flex: "1 1 140px",
                          fontSize: 10,
                          padding: "3px 4px",
                          background: "#222",
                          color: "#ddd",
                          border: "1px solid #444",
                          borderRadius: 3,
                        }}
                      >
                        {MONO_FONT_OPTIONS.map((f) => (
                          <option key={f} value={f}>
                            {f.split(",")[0].replace(/'/g, "")}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div
          style={{
            marginTop: 10,
            padding: 8,
            background: "#222244",
            borderRadius: 4,
            fontSize: 11,
            color: "#888",
          }}
        >
          Ajuste ao vivo. Tema claro e escuro possuem configs separadas.
          &quot;Exportar&quot; copia CSS do tema atual. &quot;Reset&quot; restaura
          apenas o tema atual.
        </div>
      </div>
    </>
  );
}

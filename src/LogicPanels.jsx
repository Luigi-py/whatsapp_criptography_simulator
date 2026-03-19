import { useState } from "react";

/* ── Truth Table Definitions ─────────────────────────── */

const OPERATORS = {
  NOT: {
    symbol: "¬",
    label: "NOT (Negação)",
    vars: 1,
    fn: (p) => (p ? 0 : 1),
    headers: ["p", "¬p"],
    rows: [[1], [0]],
  },
  AND: {
    symbol: "∧",
    label: "AND (Conjunção)",
    vars: 2,
    fn: (p, q) => (p && q ? 1 : 0),
    headers: ["p", "q", "p ∧ q"],
    rows: [[1, 1], [1, 0], [0, 1], [0, 0]],
  },
  OR: {
    symbol: "∨",
    label: "OR (Disjunção)",
    vars: 2,
    fn: (p, q) => (p || q ? 1 : 0),
    headers: ["p", "q", "p ∨ q"],
    rows: [[1, 1], [1, 0], [0, 1], [0, 0]],
  },
  IMPLIES: {
    symbol: "→",
    label: "IF-THEN (Implicação)",
    vars: 2,
    fn: (p, q) => (!p || q ? 1 : 0),
    headers: ["p", "q", "p → q"],
    rows: [[1, 1], [1, 0], [0, 1], [0, 0]],
  },
  IFF: {
    symbol: "↔",
    label: "IFF (Bicondicional)",
    vars: 2,
    fn: (p, q) => (p === q ? 1 : 0),
    headers: ["p", "q", "p ↔ q"],
    rows: [[1, 1], [1, 0], [0, 1], [0, 0]],
  },
  XOR: {
    symbol: "⊕",
    label: "XOR (Ou-Exclusivo)",
    vars: 2,
    fn: (p, q) => (p !== q ? 1 : 0),
    headers: ["p", "q", "p ⊕ q"],
    rows: [[1, 1], [1, 0], [0, 1], [0, 0]],
  },
};

/* ── TruthTable Component ────────────────────────────── */

export function TruthTable({ operator = "XOR", highlight = [], compact = false, showTitle = true }) {
  const op = OPERATORS[operator];
  if (!op) return null;

  const cellBase = {
    padding: compact ? "4px 10px" : "8px 16px",
    textAlign: "center",
    fontFamily: "var(--font-mono)",
    fontWeight: 700,
    fontSize: compact ? 13 : 15,
    borderBottom: "1.5px solid var(--color-border-tertiary)",
  };

  return (
    <div style={{ display: "inline-block" }}>
      {showTitle && (
        <div style={{
          fontSize: compact ? 12 : 14, fontWeight: 800,
          color: "var(--color-text-tertiary)", marginBottom: 6,
          textTransform: "uppercase", letterSpacing: 1,
        }}>
          {op.label}
        </div>
      )}
      <table style={{
        borderCollapse: "collapse",
        borderRadius: "var(--border-radius-md)",
        overflow: "hidden",
        border: "2px solid var(--color-border-tertiary)",
        width: compact ? "auto" : "100%",
      }}>
        <thead>
          <tr>
            {op.headers.map((h, i) => (
              <th key={i} style={{
                ...cellBase,
                background: "var(--color-background-secondary)",
                color: "var(--color-text-primary)",
                fontSize: compact ? 12 : 14,
                borderBottom: "2.5px solid var(--color-border-secondary)",
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {op.rows.map((row, ri) => {
            const result = op.vars === 1 ? op.fn(row[0]) : op.fn(row[0], row[1]);
            const isHighlighted = highlight.includes(ri);
            const vals = [...row, result];
            return (
              <tr key={ri} style={{
                background: isHighlighted
                  ? "var(--color-background-info)"
                  : "var(--color-background-primary)",
                transition: "background 0.3s",
              }}>
                {vals.map((v, ci) => {
                  const isResult = ci === vals.length - 1;
                  return (
                    <td key={ci} style={{
                      ...cellBase,
                      color: v
                        ? "var(--color-text-success)"
                        : "var(--color-text-danger)",
                      fontWeight: isResult ? 800 : 700,
                      background: isResult && isHighlighted
                        ? (v ? "var(--color-background-success)" : "var(--color-background-danger)")
                        : "transparent",
                    }}>
                      {v ? "V" : "F"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── LogicProof Component ────────────────────────────── */

export function LogicProof({ steps, title }) {
  return (
    <div style={{
      background: "var(--color-background-secondary)",
      borderRadius: "var(--border-radius-md)",
      padding: "14px 18px",
      border: "1.5px solid var(--color-border-tertiary)",
    }}>
      {title && (
        <div style={{
          fontSize: 14, fontWeight: 800, color: "var(--color-text-info)",
          marginBottom: 12, textTransform: "uppercase", letterSpacing: 1,
        }}>
          {title}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((step, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "baseline", gap: 12,
            padding: "6px 10px",
            background: i % 2 === 0 ? "var(--color-background-primary)" : "transparent",
            borderRadius: 6,
          }}>
            <span style={{
              fontSize: 12, fontWeight: 800, color: "var(--color-text-tertiary)",
              minWidth: 24, textAlign: "right",
            }}>
              {i + 1}.
            </span>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
              color: "var(--color-text-primary)",
            }}>
              {step.formula}
            </span>
            {step.result && (
              <>
                <span style={{ color: "var(--color-text-warning)", fontWeight: 800, fontSize: 16 }}>→</span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800,
                  color: "var(--color-text-info)",
                  background: "var(--color-background-info)",
                  padding: "2px 8px", borderRadius: 4,
                }}>
                  {step.result}
                </span>
              </>
            )}
            {step.explanation && (
              <span style={{
                fontSize: 13, color: "var(--color-text-secondary)",
                fontWeight: 600, marginLeft: "auto", fontStyle: "italic",
              }}>
                {step.explanation}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── FormalNotation Component ─────────────────────────── */

const CONNECTIVE_COLORS = {
  "∧": "info", "∨": "info", "¬": "danger", "⊕": "warning",
  "→": "tertiary", "↔": "info", "□": "info", "◇": "success",
  "∀": "info", "∃": "info",
};

export function FormalNotation({ formula, label }) {
  const parts = formula.split(/([∧∨¬⊕→↔□◇∀∃])/g);

  return (
    <div style={{
      display: "inline-flex", alignItems: "baseline", gap: 4,
      flexWrap: "wrap",
    }}>
      {label && (
        <span style={{
          fontSize: 12, fontWeight: 700, color: "var(--color-text-tertiary)",
          marginRight: 8, textTransform: "uppercase", letterSpacing: 0.5,
        }}>
          {label}:
        </span>
      )}
      <code style={{
        fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
        color: "var(--color-text-primary)",
        background: "var(--color-background-secondary)",
        padding: "4px 10px", borderRadius: 6,
        border: "1.5px solid var(--color-border-tertiary)",
      }}>
        {parts.map((part, i) => {
          const colorKey = CONNECTIVE_COLORS[part];
          if (colorKey) {
            return (
              <span key={i} style={{
                color: `var(--color-text-${colorKey})`,
                fontWeight: 800, padding: "0 2px",
              }}>
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </code>
    </div>
  );
}

/* ── LogicCallout Component ──────────────────────────── */

export function LogicCallout({ children, source, collapsed: initialCollapsed = true, type = "info" }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  return (
    <div className="logic-panel" style={{
      marginTop: 16, marginBottom: 16,
      borderRadius: "var(--border-radius-md)",
      border: "2px dashed var(--color-border-info)",
      background: "var(--color-background-info)",
      overflow: "hidden",
    }}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px",
          background: "transparent", border: "none",
          cursor: "pointer", color: "var(--color-text-info)",
          fontWeight: 800, fontSize: 14, textAlign: "left",
        }}
      >
        <span style={{ fontSize: 18 }}>&#x1D6F4;</span>
        <span>Lógica Matemática</span>
        <span style={{
          marginLeft: "auto", fontSize: 18, fontWeight: 400,
          transition: "transform 0.2s",
          transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
        }}>
          ▾
        </span>
      </button>
      {!collapsed && (
        <div style={{ padding: "0 16px 14px 16px" }}>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--color-text-primary)" }}>
            {children}
          </div>
          {source && (
            <div style={{
              marginTop: 10, fontSize: 12, fontWeight: 600,
              color: "var(--color-text-tertiary)", fontStyle: "italic",
              borderTop: "1px solid var(--color-border-info)",
              paddingTop: 8,
            }}>
              Fonte: {source}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── BinaryConverter Component ───────────────────────── */

export function BinaryConverter({ text: initialText = "OI", editable = true }) {
  const [text, setText] = useState(initialText);

  const chars = text.split("").map((c) => {
    const code = c.charCodeAt(0);
    const bin = code.toString(2).padStart(8, "0");
    return { char: c, code, bin };
  });

  return (
    <div>
      {editable && (
        <div style={{ marginBottom: 14 }}>
          <label style={{
            fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)",
            display: "block", marginBottom: 6,
          }}>
            Texto para converter:
          </label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 8))}
            style={{
              fontFamily: "var(--font-mono)", fontSize: 16,
              letterSpacing: 3, fontWeight: 700, padding: "10px 14px",
              width: "100%",
            }}
            placeholder="Digite aqui..."
          />
        </div>
      )}

      <div style={{
        display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center",
      }}>
        {chars.map((ch, i) => (
          <div key={i} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            background: "var(--color-background-secondary)",
            borderRadius: "var(--border-radius-md)", padding: "12px 14px",
            border: "1.5px solid var(--color-border-tertiary)",
            minWidth: 100,
          }}>
            {/* Character */}
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800,
              color: "var(--color-text-info)",
              background: "var(--color-background-info)",
              width: 40, height: 40, display: "flex",
              alignItems: "center", justifyContent: "center",
              borderRadius: 8, border: "2px solid var(--color-text-info)",
            }}>
              {ch.char}
            </span>

            {/* Arrow + label */}
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-tertiary)" }}>
              ASCII
            </span>

            {/* Decimal */}
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 800,
              color: "var(--color-text-warning)",
            }}>
              {ch.code}
            </span>

            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-tertiary)" }}>
              BINÁRIO
            </span>

            {/* Binary bits */}
            <div style={{ display: "flex", gap: 3 }}>
              {ch.bin.split("").map((b, j) => (
                <span key={j} style={{
                  width: 22, height: 24, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800,
                  borderRadius: 4,
                  color: b === "1" ? "#fff" : "var(--color-text-success)",
                  background: b === "1"
                    ? "var(--color-text-info)"
                    : "var(--color-background-success)",
                  border: b === "1"
                    ? "1.5px solid var(--color-text-info)"
                    : "1.5px solid var(--color-text-success)",
                }}>
                  {b}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Exports ─────────────────────────────────────────── */

export { OPERATORS };

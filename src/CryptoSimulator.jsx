import { useState, useEffect } from "react";
import WhatsAppE2E from "./WhatsAppE2E";
import { useDevStyles } from "./DevStylePanel";
import { TruthTable, LogicProof, FormalNotation, LogicCallout, BinaryConverter, REFERENCE_URLS } from "./LogicPanels";

const TABS = ["Lógica", "Cifra de César", "XOR ao vivo", "WhatsApp E2E"];

/* ── SectionToggle: Collapsible section wrapper ────── */

function SectionToggle({ number, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 32 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          fontSize: 18, fontWeight: 800, color: "var(--color-text-primary)",
          marginBottom: open ? 12 : 0, display: "flex", alignItems: "center", gap: 8,
          cursor: "pointer", userSelect: "none",
        }}
      >
        <span style={{
          background: "var(--color-background-info)", color: "var(--color-text-info)",
          padding: "2px 10px", borderRadius: 6, fontSize: 14,
        }}>{number}</span>
        {title}
        <span style={{
          marginLeft: "auto", fontSize: 18, fontWeight: 400,
          transition: "transform 0.2s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
        }}>&#x25BE;</span>
      </div>
      {open && children}
    </div>
  );
}

/* ── LogicTab: Playground de Fundamentos ─────────────── */

function LogicTab() {
  const [selectedOp, setSelectedOp] = useState("XOR");
  const [selectedRow, setSelectedRow] = useState(null);
  const [propositions, setPropositions] = useState([
    { text: '"A mensagem está criptografada"', type: "prop", answer: null,
      reason: "É uma sentença declarativa sobre um fato — pode ser verdadeira ou falsa." },
    { text: '"Criptografe isso!"', type: "not-prop", answer: null,
      reason: "É uma ordem (imperativa). Ordens não podem ser verdadeiras nem falsas." },
    { text: '"2 + 2 = 4"', type: "prop", answer: null,
      reason: "É uma sentença declarativa sobre um fato matemático — é verdadeira." },
    { text: '"Que horas são?"', type: "not-prop", answer: null,
      reason: "É uma pergunta (interrogativa). Perguntas não afirmam nada, então não têm valor lógico." },
    { text: '"A chave tem 256 bits"', type: "prop", answer: null,
      reason: "É uma sentença declarativa sobre uma propriedade técnica — pode ser verdadeira ou falsa." },
    { text: '"Olá, mundo!"', type: "not-prop", answer: null,
      reason: "É uma exclamação/saudação. Exclamações não fazem declarações que possam ser julgadas verdadeiras ou falsas." },
  ]);

  const operators = ["NOT", "AND", "OR", "IMPLIES", "IFF", "XOR"];

  const opDescriptions = {
    NOT: { formal: "¬p", analogy: "Se ESTÁ criptografada, NÃO é legível.", circuit: "Inversor" },
    AND: { formal: "p ∧ q", analogy: "Precisa da chave (p) E do algoritmo (q) para decifrar.", circuit: "Circuito em série" },
    OR: { formal: "p ∨ q", analogy: "Se o servidor OU o hacker interceptam, privacidade comprometida.", circuit: "Circuito em paralelo" },
    IMPLIES: { formal: "p → q", analogy: "Se tenho a chave (p), ENTÃO posso decifrar (q). Cifrar é fácil (p→q), decifrar sem chave é difícil.", circuit: "Função unidirecional" },
    IFF: { formal: "p ↔ q", analogy: "Verdadeiro quando ambos iguais. Se a chave confere (p) SE E SOMENTE SE o hash bate (q).", circuit: "Comparador" },
    XOR: { formal: "p ⊕ q", analogy: "O operador SECRETO da criptografia. Diferente = 1, igual = 0. Auto-inversão: (p ⊕ k) ⊕ k = p.", circuit: "Embaralhador reversível" },
  };

  const handlePropClick = (idx, answer) => {
    setPropositions(prev => prev.map((p, i) => i === idx ? { ...p, answer } : p));
  };

  return (
    <div>
      {/* ── Section 1: What is a Proposition? ── */}
      <SectionToggle number="1" title="O Que É Uma Proposição?">
        <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginBottom: 14, fontWeight: 500 }}>
          Uma proposição é uma sentença declarativa que pode ser <strong style={{ color: "var(--color-text-success)" }}>Verdadeira (V)</strong> ou{" "}
          <strong style={{ color: "var(--color-text-danger)" }}>Falsa (F)</strong>. Clique para classificar:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {propositions.map((p, i) => {
            const correct = p.answer !== null && (
              (p.answer === "prop" && p.type === "prop") ||
              (p.answer === "not-prop" && p.type === "not-prop")
            );
            const wrong = p.answer !== null && !correct;
            return (
              <div key={i}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                  padding: "10px 14px", borderRadius: "var(--border-radius-md)",
                  background: p.answer === null ? "var(--color-background-secondary)"
                    : correct ? "var(--color-background-success)"
                    : "var(--color-background-danger)",
                  border: `1.5px solid ${p.answer === null ? "var(--color-border-tertiary)"
                    : correct ? "var(--color-text-success)" : "var(--color-text-danger)"}`,
                  transition: "all 0.3s",
                }}>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600,
                    color: "var(--color-text-primary)", flex: 1,
                  }}>
                    {p.text}
                  </span>
                  <button onClick={() => handlePropClick(i, "prop")} style={{
                    padding: "4px 12px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0,
                    background: p.answer === "prop" ? "var(--color-text-success)" : "var(--color-background-success)",
                    color: p.answer === "prop" ? "#fff" : "var(--color-text-success)",
                    border: "1.5px solid var(--color-text-success)",
                  }}>
                    Proposição
                  </button>
                  <button onClick={() => handlePropClick(i, "not-prop")} style={{
                    padding: "4px 12px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0,
                    background: p.answer === "not-prop" ? "var(--color-text-danger)" : "var(--color-background-danger)",
                    color: p.answer === "not-prop" ? "#fff" : "var(--color-text-danger)",
                    border: "1.5px solid var(--color-text-danger)",
                  }}>
                    Não é
                  </button>
                  {correct && <span style={{ color: "var(--color-text-success)", fontWeight: 800 }}>&#x2713;</span>}
                  {wrong && <span style={{ color: "var(--color-text-danger)", fontWeight: 800 }}>&#x2717;</span>}
                </div>
                {p.answer !== null && (
                  <div style={{
                    fontSize: 13, color: correct ? "var(--color-text-success)" : "var(--color-text-danger)",
                    fontWeight: 600, marginTop: 6, paddingLeft: 4, lineHeight: 1.5,
                    fontStyle: "italic",
                  }}>
                    {p.type === "prop" ? "\u2713 Proposição: " : "\u2717 Não é proposição: "}
                    {p.reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <LogicCallout source="LEVADA, A. Lógica Matemática, 2025, Def. 2" collapsed={false}>
          <strong>Definição:</strong> Uma proposição é uma sentença declarativa à qual se pode atribuir
          um e apenas um dos valores lógicos: <strong style={{ color: "var(--color-text-success)" }}>Verdadeiro (V)</strong> ou{" "}
          <strong style={{ color: "var(--color-text-danger)" }}>Falso (F)</strong>.
          <br /><br />
          <strong>Tipos de sentenças que NÃO são proposições:</strong>
          <ul style={{ margin: "6px 0 0 0", paddingLeft: 18, lineHeight: 1.8 }}>
            <li><strong>Interrogativas</strong> (perguntas): &quot;Que horas são?&quot; — não afirmam nada.</li>
            <li><strong>Imperativas</strong> (ordens/pedidos): &quot;Criptografe isso!&quot; — expressam comandos.</li>
            <li><strong>Exclamativas</strong> (exclamações): &quot;Olá, mundo!&quot; — expressam emoções ou saudações.</li>
            <li><strong>Paradoxos de auto-referência</strong>: &quot;Esta frase é falsa&quot; — geram contradição lógica.</li>
          </ul>
          <br />
          Somente sentenças declarativas que afirmam algo sobre o mundo podem ser classificadas como verdadeiras ou falsas.
        </LogicCallout>
      </SectionToggle>

      {/* ── Section 2: Interactive Truth Table ── */}
      <SectionToggle number="2" title="Tabela Verdade Interativa">
        <div style={{
          display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap",
        }}>
          {operators.map(op => (
            <button key={op} onClick={() => { setSelectedOp(op); setSelectedRow(null); }}
              style={{
                padding: "8px 16px", fontSize: 14, fontWeight: 700,
                background: selectedOp === op ? "var(--color-text-info)" : "var(--color-background-secondary)",
                color: selectedOp === op ? "#fff" : "var(--color-text-primary)",
                border: selectedOp === op ? "2px solid var(--color-text-info)" : "2px solid var(--color-border-tertiary)",
              }}>
              {op === "IMPLIES" ? "\u2192" : op === "IFF" ? "\u2194" : op}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div onClick={(e) => {
            const row = e.target.closest("tr");
            if (row && row.parentElement.tagName === "TBODY") {
              setSelectedRow(row.rowIndex - 1);
            }
          }} style={{ cursor: "pointer" }}>
            <TruthTable operator={selectedOp} highlight={selectedRow !== null ? [selectedRow] : []} />
            <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 6, fontStyle: "italic" }}>
              Clique em uma linha para destacar
            </p>
          </div>

          <div style={{
            flex: "1 1 200px", minWidth: 0, padding: "14px 18px",
            background: "var(--color-background-secondary)",
            borderRadius: "var(--border-radius-md)",
            border: "1.5px solid var(--color-border-tertiary)",
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-info)", marginBottom: 8 }}>
              {selectedOp === "IMPLIES" ? "IF-THEN (\u2192)" : selectedOp === "IFF" ? "IFF (\u2194)" : selectedOp}
            </div>
            <FormalNotation formula={opDescriptions[selectedOp].formal} label="Fórmula" />
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 10, fontWeight: 600, lineHeight: 1.5 }}>
              {opDescriptions[selectedOp].analogy}
            </p>
            <div style={{
              fontSize: 13, color: "var(--color-text-tertiary)", marginTop: 8,
              fontFamily: "var(--font-mono)", fontWeight: 600,
            }}>
              Circuito: {opDescriptions[selectedOp].circuit}
            </div>
            {selectedOp === "XOR" && (
              <div style={{
                marginTop: 12, padding: "10px 14px",
                background: "var(--color-background-warning)",
                borderRadius: "var(--border-radius-md)",
                border: "1.5px solid var(--color-text-warning)",
              }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-warning)", marginBottom: 4 }}>
                  PROPRIEDADE ESPECIAL
                </div>
                <FormalNotation formula="(p ⊕ k) ⊕ k = p" label="Auto-inversão" />
              </div>
            )}
          </div>
        </div>

        <LogicCallout source="LEVADA, A. Lógica Matemática, 2025, Sec. 2.3" collapsed={false}>
          A tabela verdade enumera <strong>todas</strong> as combinações possíveis de valores de entrada
          e o resultado do conectivo. Com <em>n</em> variáveis, temos <strong>2<sup>n</sup></strong> linhas.
        </LogicCallout>
      </SectionToggle>

      {/* ── Section 3: Binary/ASCII Converter ── */}
      <SectionToggle number="3" title="Conversor Binário / ASCII">
        <BinaryConverter text="OI" />

        <div style={{
          marginTop: 16, padding: "12px 18px",
          background: "var(--color-background-warning)",
          borderRadius: "var(--border-radius-md)",
          borderLeft: "4px solid var(--color-text-warning)",
          fontSize: 14, fontWeight: 700, color: "var(--color-text-warning)",
        }}>
          Agora veja o XOR operando nestes bits na próxima aba →
        </div>
      </SectionToggle>

      {/* ── Section 4: XOR Tautology Proof ── */}
      <SectionToggle number="4" title="Prova de Tautologia do XOR">
        <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginBottom: 14, fontWeight: 500 }}>
          Provaremos que <code style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>(p &#x2295; k) &#x2295; k = p</code> é{" "}
          <strong>sempre verdadeira</strong> para todos os valores de p e k:
        </p>

        <LogicProof
          title="Prova por exaustão — todas as 4 combinações"
          steps={[
            { formula: "p=0, k=0:", result: "0⊕0=0, 0⊕0=0 \u2713", explanation: "Mantém o 0" },
            { formula: "p=0, k=1:", result: "0⊕1=1, 1⊕1=0 \u2713", explanation: "Inverte e volta" },
            { formula: "p=1, k=0:", result: "1⊕0=1, 1⊕0=1 \u2713", explanation: "Mantém o 1" },
            { formula: "p=1, k=1:", result: "1⊕1=0, 0⊕1=1 \u2713", explanation: "Inverte e volta" },
          ]}
        />

        <div style={{
          marginTop: 16, padding: "16px 20px",
          background: "var(--color-background-success)",
          borderRadius: "var(--border-radius-md)",
          border: "2px solid var(--color-text-success)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-success)", marginBottom: 6 }}>
            TAUTOLOGIA — sempre verdadeira
          </div>
          <div style={{ fontSize: 14, color: "var(--color-text-success)", fontWeight: 600 }}>
            Esta propriedade é a BASE da criptografia simétrica com XOR.
          </div>
        </div>

        <LogicCallout source="LEVADA, A. Lógica Matemática, 2025, Sec. 3.1" collapsed={false}>
          Uma <strong>tautologia</strong> é uma proposição composta que é verdadeira para TODAS as combinações
          de valores das suas variáveis. A reversibilidade do XOR é uma tautologia — funciona sempre,
          sem exceção.
        </LogicCallout>
      </SectionToggle>
    </div>
  );
}

/* ── CaesarTab ───────────────────────────────────────── */

function CaesarTab() {
  const [text, setText] = useState("LOGICA");
  const [shift, setShift] = useState(3);
  const ds = useDevStyles(
    "__baseFontSize", "__labelFontSize", "__monoFontSize", "__smallFontSize",
    "__caesarBoxSize", "__caesarLetterSize", "__caesarAlphabetSize", "__caesarAlphabetCellWidth"
  );
  const encrypt = (t, s) =>
    t.toUpperCase().split("").map((c) => {
      if (c >= "A" && c <= "Z") {
        return String.fromCharCode(((c.charCodeAt(0) - 65 + s) % 26) + 65);
      }
      return c;
    }).join("");
  const result = encrypt(text, shift);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const cellW = ds.__caesarAlphabetCellWidth || 32;
  const gap = 3;

  return (
    <div>
      <p style={{ color: "var(--color-text-secondary)", fontSize: ds.__baseFontSize + 1, marginBottom: 22, fontWeight: 500 }}>
        Cada letra é deslocada por uma quantidade fixa no alfabeto. Simples, mas fácil de quebrar.
      </p>

      {/* Shift control */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap",
        background: "var(--color-background-secondary)", padding: "18px 22px",
        borderRadius: "var(--border-radius-lg)"
      }}>
        <label style={{ fontSize: ds.__labelFontSize + 2, fontWeight: 700, color: "var(--color-text-primary)" }}>
          Deslocamento
        </label>
        <input type="range" min="1" max="25" value={shift} onChange={(e) => setShift(+e.target.value)}
          style={{ flex: "1 1 120px", height: 8, minWidth: 80 }} />
        <span style={{
          fontWeight: 800, minWidth: 52, fontFamily: "var(--font-mono)", fontSize: ds.__monoFontSize + 8,
          color: "var(--color-text-info)", textAlign: "center",
          background: "var(--color-background-info)", padding: "6px 14px",
          borderRadius: "var(--border-radius-md)"
        }}>{shift}</span>
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, marginBottom: 26 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value.toUpperCase().replace(/[^A-Z ]/g, ""))}
          placeholder="Digite aqui..."
          style={{
            flex: 1, fontFamily: "var(--font-mono)", fontSize: ds.__monoFontSize + 4,
            letterSpacing: 4, fontWeight: 600, padding: "14px 18px"
          }}
        />
      </div>

      {/* Character-by-character transformation */}
      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
        marginBottom: 28, padding: "22px 14px",
        background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)"
      }}>
        {text.split("").map((c, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            {/* Original letter */}
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: ds.__caesarBoxSize + 6, height: ds.__caesarBoxSize + 6,
              borderRadius: "var(--border-radius-md)",
              background: "var(--color-background-info)", color: "var(--color-text-info)",
              fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: ds.__caesarLetterSize + 2,
              border: "2.5px solid var(--color-text-info)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
            }}>{c}</span>
            {/* Arrow with shift indicator */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
              <span style={{ fontSize: ds.__smallFontSize + 1, fontWeight: 800, color: "var(--color-text-warning)" }}>+{shift}</span>
              <svg width="18" height="28"><path d="M9 2L9 22L4 17M9 22L14 17" fill="none" stroke="var(--color-text-warning)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            {/* Encrypted letter */}
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: ds.__caesarBoxSize + 6, height: ds.__caesarBoxSize + 6,
              borderRadius: "var(--border-radius-md)",
              background: "var(--color-background-danger)", color: "var(--color-text-danger)",
              fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: ds.__caesarLetterSize + 2,
              border: "2.5px solid var(--color-text-danger)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
            }}>{c === " " ? " " : result[i]}</span>
          </div>
        ))}
      </div>

      {/* ── Two-bar alphabet with smooth sliding animation ── */}
      <div style={{
        background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)",
        padding: "22px 20px", overflowX: "auto"
      }}>
       <div style={{ minWidth: "fit-content" }}>
        {/* Original alphabet label + bar */}
        <div style={{
          fontSize: ds.__smallFontSize + 1, fontWeight: 800, color: "var(--color-text-info)",
          marginBottom: 10, textTransform: "uppercase", letterSpacing: 2
        }}>
          ALFABETO ORIGINAL
        </div>
        <div style={{
          display: "flex", gap: gap, fontFamily: "var(--font-mono)",
          background: "var(--color-background-info)", borderRadius: "var(--border-radius-md)",
          padding: "10px 6px", marginBottom: 8
        }}>
          {alphabet.split("").map((c, i) => (
            <span key={i} style={{
              width: cellW, minWidth: cellW, flexShrink: 0, textAlign: "center", fontSize: ds.__caesarAlphabetSize + 2,
              color: text.includes(c) ? "var(--color-text-info)" : "var(--color-text-tertiary)",
              fontWeight: text.includes(c) ? 800 : 500,
              transition: "all 0.3s"
            }}>{c}</span>
          ))}
        </div>

        {/* Shifted alphabet label + animated bar */}
        <div style={{
          fontSize: ds.__smallFontSize + 1, fontWeight: 800, color: "var(--color-text-danger)",
          marginBottom: 10, textTransform: "uppercase", letterSpacing: 2
        }}>
          ALFABETO CIFRADO (+{shift})
        </div>
        <div style={{
          overflow: "hidden",
          borderRadius: "var(--border-radius-md)",
          background: "var(--color-background-secondary)",
          padding: "10px 6px",
          width: `${26 * cellW + 25 * gap}px`
        }}>
          <div style={{
            display: "flex", gap: gap, fontFamily: "var(--font-mono)",
            transform: `translateX(${-shift * (cellW + gap)}px)`,
            transition: "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            width: `${52 * (cellW + gap)}px`
          }}>
            {(alphabet + alphabet).split("").map((c, i) => {
              const visualPos = i - shift;
              const isOriginalLetter = text.includes(c);
              const isEncryptedPos = visualPos >= 0 && visualPos < 26 && text.includes(alphabet[visualPos]);
              return (
                <span key={i} style={{
                  width: cellW, minWidth: cellW, textAlign: "center",
                  fontSize: ds.__caesarAlphabetSize + 2,
                  color: isOriginalLetter ? "var(--color-text-success)"
                    : isEncryptedPos ? "var(--color-text-primary)"
                    : "var(--color-text-tertiary)",
                  fontWeight: (isOriginalLetter || isEncryptedPos) ? 800 : 500,
                  flexShrink: 0,
                  transition: "all 0.3s",
                  ...(isEncryptedPos ? {
                    border: "2.5px solid var(--color-text-danger)",
                    borderRadius: 6,
                    background: "var(--color-background-danger)",
                  } : {})
                }}>{c}</span>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{
          display: "flex", gap: 18, marginTop: 10, paddingLeft: 4, flexWrap: "wrap",
          fontSize: ds.__smallFontSize + 1, color: "var(--color-text-secondary)", alignItems: "center"
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              display: "inline-block", width: 14, height: 14, borderRadius: 4,
              background: "var(--color-text-success)", opacity: 0.8
            }} />
            <strong style={{ color: "var(--color-text-success)" }}>Letra original</strong> (deslocada)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              display: "inline-block", width: 14, height: 14, borderRadius: 4,
              border: "2.5px solid var(--color-text-danger)",
              background: "var(--color-background-danger)"
            }} />
            <strong style={{ color: "var(--color-text-danger)" }}>Posição original</strong> (antes de cifrar)
          </span>
        </div>
       </div>
      </div>

      <div style={{
        fontSize: ds.__labelFontSize + 1, color: "var(--color-text-warning)", marginTop: 16,
        textAlign: "center", fontWeight: 700,
        background: "var(--color-background-warning)", padding: "10px 16px",
        borderRadius: "var(--border-radius-md)", borderLeft: "4px solid var(--color-text-warning)"
      }}>
        Vulnerável: basta testar 25 deslocamentos para quebrar!
      </div>

      {/* ── Logic Panel: A Lógica por Trás de César ── */}
      <LogicCallout source="LEVADA, A. Lógica Matemática, 2025" collapsed={true}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 1. Function as Implication */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-info)", marginBottom: 8 }}>
              Função como Implicação
            </div>
            <FormalNotation formula="E(x, k) = (x + k) mod 26" label="Cifração" />
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 8, marginBottom: 0, fontWeight: 500 }}>
              Se shift={shift}, ENTÃO {text[0] || "A"} → {result[0] || "D"}.
              Cada substituição é uma implicação: <code style={{ fontFamily: "var(--font-mono)" }}>p → q</code> é V quando shift={shift}.
            </p>
          </div>

          {/* 2. Vulnerability as Exhaustive Search */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-danger)", marginBottom: 8 }}>
              Vulnerabilidade como Busca Exaustiva
            </div>
            <FormalNotation formula="∃k ∈ {1..25}: D(c, k) produz texto legível" />
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 8, marginBottom: 0, fontWeight: 500 }}>
              O atacante testa TODAS as 25 proposições até achar uma verdadeira.
            </p>
            <div style={{
              marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 13,
              color: "var(--color-text-tertiary)", fontWeight: 600,
            }}>
              César: 25 chaves | XOR 8-bit: 256 | XOR 256-bit: 2<sup>256</sup> (mais que átomos no universo)
            </div>
          </div>

          {/* 3. Modular Arithmetic */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-warning)", marginBottom: 8 }}>
              Aritmética Modular como Lógica Circular
            </div>
            <div style={{
              display: "flex", gap: 6, flexWrap: "wrap", fontFamily: "var(--font-mono)",
              fontSize: 13, fontWeight: 600, justifyContent: "center",
              padding: "10px 14px", background: "var(--color-background-primary)",
              borderRadius: "var(--border-radius-md)", border: "1.5px solid var(--color-border-tertiary)",
            }}>
              {alphabet.split("").map((c, i) => (
                <span key={i} style={{
                  color: i === 25 ? "var(--color-text-warning)" : "var(--color-text-tertiary)",
                  fontWeight: i === 25 ? 800 : 500,
                }}>
                  {c}={i}{i < 25 ? " " : ""}
                </span>
              ))}
              <span style={{ color: "var(--color-text-warning)", fontWeight: 800 }}>→ Z+1 = A (mod 26)</span>
            </div>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 6, marginBottom: 0, fontWeight: 500 }}>
              O módulo garante que Z+1 = A — o alfabeto é cíclico.
            </p>
          </div>
        </div>
      </LogicCallout>
    </div>
  );
}

/* ── XorTab ──────────────────────────────────────────── */

const ASCII_CTRL = {
  0:'NUL',1:'SOH',2:'STX',3:'ETX',4:'EOT',5:'ENQ',6:'ACK',7:'BEL',
  8:'BS',9:'TAB',10:'LF',11:'VT',12:'FF',13:'CR',14:'SO',15:'SI',
  16:'DLE',17:'DC1',18:'DC2',19:'DC3',20:'DC4',21:'NAK',22:'SYN',23:'ETB',
  24:'CAN',25:'EM',26:'SUB',27:'ESC',28:'FS',29:'GS',30:'RS',31:'US',
  127:'DEL'
};

function asciiDisplay(code) {
  if (code >= 33 && code < 127) return `'${String.fromCharCode(code)}'`;
  if (code === 32) return "'SP'";
  return ASCII_CTRL[code] || `[${code}]`;
}

function XorTab() {
  const [text, setText] = useState("OI");
  const [key, setKey] = useState(42);
  const [showDecrypt, setShowDecrypt] = useState(false);
  const ds = useDevStyles(
    "__baseFontSize", "__labelFontSize", "__monoFontSize",
    "__xorCharSize", "__xorBitSize", "__xorLabelSize"
  );

  const toBin = (n) => n.toString(2).padStart(8, "0");
  const chars = text.split("").map((c) => {
    const code = c.charCodeAt(0);
    const encrypted = code ^ key;
    const decrypted = encrypted ^ key;
    return { original: c, code, encrypted, decrypted, bin: toBin(code), keyBin: toBin(key), encBin: toBin(encrypted), decBin: toBin(decrypted) };
  });

  return (
    <div>
      {/* Intro callout */}
      <div style={{
        color: "var(--color-text-info)", fontSize: ds.__baseFontSize + 1, marginBottom: 22, fontWeight: 600,
        background: "var(--color-background-info)", padding: "14px 20px",
        borderRadius: "var(--border-radius-md)", borderLeft: "4px solid var(--color-text-info)"
      }}>
        XOR é <strong>reversível</strong>: aplique a mesma chave duas vezes e volta ao original.
      </div>

      {/* Inputs */}
      <div style={{
        display: "flex", gap: 16, marginBottom: 26, flexWrap: "wrap",
        background: "var(--color-background-secondary)", padding: "20px 22px",
        borderRadius: "var(--border-radius-lg)"
      }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ fontSize: ds.__labelFontSize + 1, fontWeight: 700, color: "var(--color-text-primary)", display: "block", marginBottom: 8 }}>
            Mensagem
          </label>
          <input value={text} onChange={(e) => setText(e.target.value.slice(0, 6))}
            style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: ds.__monoFontSize + 4, letterSpacing: 2, fontWeight: 600, padding: "12px 16px" }} />
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label style={{ fontSize: ds.__labelFontSize + 1, fontWeight: 700, color: "var(--color-text-primary)", display: "block", marginBottom: 8 }}>
            Chave (0–255)
          </label>
          <input type="number" min="0" max="255" value={key}
            onChange={(e) => setKey(Math.min(255, Math.max(0, +e.target.value)))}
            style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: ds.__monoFontSize + 4, fontWeight: 600, padding: "12px 16px" }} />
        </div>
      </div>

      {/* Per-character XOR visualization */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {chars.map((ch, i) => {
          return (
            <div key={i} style={{
              background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)",
              padding: "22px 24px", border: "2px solid var(--color-border-secondary)"
            }}>
              {/* Step label */}
              <div style={{
                fontSize: ds.__xorLabelSize + 1, fontWeight: 800, color: "var(--color-text-tertiary)",
                marginBottom: 14, textTransform: "uppercase", letterSpacing: 1.5
              }}>
                Caractere {i + 1}
              </div>

              {/* Bit grid with inline char/ascii/hex columns — CSS Grid for alignment */}
              <div style={{
                overflowX: "auto",
                fontFamily: "var(--font-mono)", fontSize: ds.__xorBitSize + 2,
                padding: "16px 18px",
                background: "var(--color-background-primary)", borderRadius: "var(--border-radius-md)",
                border: "1.5px solid var(--color-border-tertiary)"
              }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "90px repeat(8, 34px) 2px 50px 44px 36px",
                  gap: "6px",
                  alignItems: "center",
                  minWidth: 500,
                  overflowWrap: "normal", whiteSpace: "nowrap"
                }}>

                  {/* ── Header row ── */}
                  <span />
                  {Array.from({ length: 8 }, (_, j) => <span key={j} />)}
                  <span />
                  <span style={{
                    textAlign: "center", fontSize: ds.__xorBitSize - 1, fontWeight: 700,
                    color: "var(--color-text-tertiary)", textTransform: "uppercase"
                  }}>Char</span>
                  <span style={{
                    textAlign: "center", fontSize: ds.__xorBitSize - 1, fontWeight: 700,
                    color: "var(--color-text-tertiary)", textTransform: "uppercase"
                  }}>ASCII</span>
                  <span style={{
                    textAlign: "center", fontSize: ds.__xorBitSize - 1, fontWeight: 700,
                    color: "var(--color-text-tertiary)", textTransform: "uppercase"
                  }}>Hex</span>

                  {/* ── TEXTO row ── */}
                  <span style={{
                    color: "var(--color-text-info)", fontWeight: 800,
                    fontSize: ds.__xorBitSize + 1
                  }}>TEXTO</span>
                  {ch.bin.split("").map((b, j) => (
                    <span key={j} style={{
                      height: 34, textAlign: "center", lineHeight: "34px",
                      color: "var(--color-text-info)", fontWeight: 700,
                      background: "var(--color-background-info)",
                      borderRadius: 6, fontSize: ds.__xorBitSize + 2
                    }}>{b}</span>
                  ))}
                  <span style={{ borderLeft: "2px solid var(--color-border-secondary)", height: 28, justifySelf: "center" }} />
                  <span style={{
                    textAlign: "center", fontWeight: 800,
                    fontSize: ds.__xorBitSize + 2, color: "var(--color-text-info)"
                  }}>{asciiDisplay(ch.code)}</span>
                  <span style={{
                    textAlign: "center", fontWeight: 600,
                    fontSize: ds.__xorBitSize, color: "var(--color-text-info)", opacity: 0.75
                  }}>{ch.code}</span>
                  <span style={{
                    textAlign: "center", fontWeight: 600,
                    fontSize: ds.__xorBitSize, color: "var(--color-text-info)", opacity: 0.75
                  }}>{ch.code.toString(16).toUpperCase().padStart(2,'0')}</span>

                  {/* ── XOR symbols row ── */}
                  <span style={{
                    fontSize: ds.__xorBitSize, fontWeight: 800,
                    color: "var(--color-text-warning)"
                  }}>XOR</span>
                  {ch.keyBin.split("").map((kb, j) => (
                    <span key={j} style={{
                      textAlign: "center",
                      fontSize: ds.__xorBitSize + 2, fontWeight: 800,
                      color: kb === "1" ? "var(--color-text-danger)" : "var(--color-text-success)"
                    }}>&#x2295;</span>
                  ))}
                  <span /><span /><span /><span />

                  {/* ── CHAVE row ── */}
                  <span style={{
                    color: "var(--color-text-warning)", fontWeight: 800,
                    fontSize: ds.__xorBitSize + 1
                  }}>CHAVE</span>
                  {ch.keyBin.split("").map((b, j) => (
                    <span key={j} style={{
                      height: 34, textAlign: "center", lineHeight: "34px",
                      color: "var(--color-text-warning)", fontWeight: 600,
                      background: "var(--color-background-warning)",
                      borderRadius: 6, fontSize: ds.__xorBitSize + 2
                    }}>{b}</span>
                  ))}
                  <span style={{ borderLeft: "2px solid var(--color-border-secondary)", height: 28, justifySelf: "center" }} />
                  <span style={{
                    textAlign: "center", fontWeight: 800,
                    fontSize: ds.__xorBitSize + 2, color: "var(--color-text-warning)"
                  }}>{asciiDisplay(key)}</span>
                  <span style={{
                    textAlign: "center", fontWeight: 600,
                    fontSize: ds.__xorBitSize, color: "var(--color-text-warning)", opacity: 0.75
                  }}>{key}</span>
                  <span style={{
                    textAlign: "center", fontWeight: 600,
                    fontSize: ds.__xorBitSize, color: "var(--color-text-warning)", opacity: 0.75
                  }}>{key.toString(16).toUpperCase().padStart(2,'0')}</span>

                  {/* ── Separator ── */}
                  <div style={{
                    gridColumn: "1 / -1",
                    borderTop: "3px solid var(--color-border-secondary)",
                    margin: "2px 0"
                  }} />

                  {/* ── RESULTADO row ── */}
                  <span style={{
                    color: "var(--color-text-danger)", fontWeight: 800,
                    fontSize: ds.__xorBitSize + 1
                  }}>RESULTADO</span>
                  {ch.encBin.split("").map((b, j) => {
                    const diff = ch.bin[j] !== b;
                    return (
                      <span key={j} style={{
                        height: 34, textAlign: "center", lineHeight: "34px",
                        color: diff ? "#ffffff" : "var(--color-text-success)",
                        fontWeight: 800,
                        background: diff ? "var(--color-text-danger)" : "var(--color-background-success)",
                        borderRadius: 6, fontSize: ds.__xorBitSize + 2,
                        transition: "all 0.3s"
                      }}>{b}</span>
                    );
                  })}
                  <span style={{ borderLeft: "2px solid var(--color-border-secondary)", height: 28, justifySelf: "center" }} />
                  <span style={{
                    textAlign: "center", fontWeight: 800,
                    fontSize: ds.__xorBitSize + 2, color: "var(--color-text-danger)"
                  }}>{asciiDisplay(ch.encrypted)}</span>
                  <span style={{
                    textAlign: "center", fontWeight: 600,
                    fontSize: ds.__xorBitSize, color: "var(--color-text-danger)", opacity: 0.75
                  }}>{ch.encrypted}</span>
                  <span style={{
                    textAlign: "center", fontWeight: 600,
                    fontSize: ds.__xorBitSize, color: "var(--color-text-danger)", opacity: 0.75
                  }}>{ch.encrypted.toString(16).toUpperCase().padStart(2,'0')}</span>

                </div>

                {/* Legend */}
                <div style={{
                  marginTop: 12, fontSize: ds.__xorBitSize + 1, color: "var(--color-text-secondary)",
                  display: "flex", gap: 20, alignItems: "center", paddingLeft: 0, flexWrap: "wrap",
                  whiteSpace: "normal"
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      display: "inline-block", width: 14, height: 14, borderRadius: 4,
                      background: "var(--color-text-danger)"
                    }} />
                    <strong style={{ color: "var(--color-text-danger)" }}>Bit alterado</strong>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      display: "inline-block", width: 14, height: 14, borderRadius: 4,
                      background: "var(--color-background-success)", border: "1.5px solid var(--color-text-success)"
                    }} />
                    <strong style={{ color: "var(--color-text-success)" }}>Bit mantido</strong>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Decryption toggle */}
      <button onClick={() => setShowDecrypt(!showDecrypt)} style={{
        marginTop: 20, width: "100%", padding: "16px 20px",
        fontSize: ds.__baseFontSize + 2, fontWeight: 800,
        background: showDecrypt ? "var(--color-text-success)" : "var(--color-background-info)",
        color: showDecrypt ? "#fff" : "var(--color-text-info)",
        border: showDecrypt ? "2px solid var(--color-text-success)" : "2px solid var(--color-text-info)",
        borderRadius: "var(--border-radius-md)"
      }}>
        {showDecrypt ? "Ocultar" : "Mostrar"} descriptografia (aplicar XOR novamente)
      </button>

      {showDecrypt && (
        <div style={{
          marginTop: 18, background: "var(--color-background-success)",
          borderRadius: "var(--border-radius-lg)", padding: "22px 24px",
          textAlign: "center", border: "2px solid var(--color-text-success)"
        }}>
          <div style={{
            fontSize: ds.__baseFontSize + 1, fontWeight: 800, color: "var(--color-text-success)",
            marginBottom: 14, textTransform: "uppercase", letterSpacing: 1
          }}>
            Prova da reversibilidade
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: ds.__xorCharSize, fontWeight: 800,
              color: "var(--color-text-danger)", background: "var(--color-background-danger)",
              padding: "8px 16px", borderRadius: "var(--border-radius-md)",
              border: "2px solid var(--color-text-danger)"
            }}>
              {chars.map(ch => ch.encrypted).join(", ")}
            </span>
            <span style={{ fontSize: ds.__baseFontSize + 2, fontWeight: 800, color: "var(--color-text-warning)" }}>
              XOR {key}
            </span>
            <svg width="28" height="18" style={{ flexShrink: 0 }}>
              <path d="M2 9H22M18 4L23 9L18 14" fill="none" stroke="var(--color-text-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: ds.__xorCharSize + 4, fontWeight: 800,
              color: "var(--color-text-success)",
              padding: "8px 16px", borderRadius: "var(--border-radius-md)",
              background: "var(--color-background-success)", border: "2px solid var(--color-text-success)"
            }}>
              &quot;{chars.map((ch) => String.fromCharCode(ch.decrypted)).join("")}&quot;
            </span>
          </div>
          <div style={{
            fontSize: ds.__baseFontSize + 1, color: "var(--color-text-success)", marginTop: 14, fontWeight: 700
          }}>
            Mensagem original recuperada!
          </div>

          {/* ── Formal Reversibility Proof ── */}
          <div style={{ marginTop: 18, textAlign: "left" }}>
            <LogicProof
              title="Prova formal de reversibilidade"
              steps={[
                { formula: "c = p ⊕ k", result: `${chars[0]?.code || "p"} ⊕ ${key} = ${chars[0]?.encrypted || "c"}`, explanation: "Criptografia" },
                { formula: "resultado = c ⊕ k = (p ⊕ k) ⊕ k", result: `${chars[0]?.encrypted || "c"} ⊕ ${key}`, explanation: "Descriptografia" },
                { formula: "(p ⊕ k) ⊕ k = p ⊕ (k ⊕ k) = p ⊕ 0 = p", result: `${chars[0]?.code || "p"}`, explanation: "Assoc. + Auto-inversão" },
              ]}
            />
          </div>

          <div style={{
            marginTop: 14, padding: "12px 18px",
            background: "var(--color-background-info)",
            borderRadius: "var(--border-radius-md)",
            border: "1.5px solid var(--color-text-info)",
            textAlign: "left",
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-info)", marginBottom: 6 }}>
              TAUTOLOGIA: (p &#x2295; k) &#x2295; k &#x2261; p para TODOS os valores de p e k
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 600 }}>
              <span>Auto-inversão: k &#x2295; k = 0 <a href={REFERENCE_URLS.LEVADA} target="_blank" rel="noopener noreferrer" className="ref-link" style={{ color: "var(--color-text-tertiary)", fontStyle: "italic" }}>(LEVADA, A. Lógica Matemática, 2025, Sec. 4.3)</a></span>
              <span>Associatividade: (a &#x2295; b) &#x2295; c = a &#x2295; (b &#x2295; c) <a href={REFERENCE_URLS.LEVADA} target="_blank" rel="noopener noreferrer" className="ref-link" style={{ color: "var(--color-text-tertiary)", fontStyle: "italic" }}>(LEVADA, A. Lógica Matemática, 2025)</a></span>
              <span>Elemento neutro: p &#x2295; 0 = p</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Logic Panel: XOR as Logic Composition ── */}
      <LogicCallout source="LEVADA, A. Lógica Matemática, 2025, Sec. 4.3" collapsed={true}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-info)", marginBottom: 10 }}>
          XOR como Composição Lógica
        </div>
        <FormalNotation formula="p &#x2295; q &#x2261; (p &#x2228; q) &#x2227; &#xAC;(p &#x2227; q)" />
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 10, marginBottom: 12, fontWeight: 500, lineHeight: 1.5 }}>
          XOR pode ser construído a partir de OR, AND e NOT — os conectivos fundamentais da lógica proposicional.
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <TruthTable operator="XOR" compact />
          <div style={{ display: "flex", alignItems: "center", fontSize: 20, fontWeight: 800, color: "var(--color-text-warning)" }}>&#x2261;</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
              (p &#x2228; q) &#x2227; &#xAC;(p &#x2227; q)
            </div>
            <table style={{
              borderCollapse: "collapse", border: "2px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)", overflow: "hidden",
            }}>
              <thead>
                <tr>
                  {["p", "q", "p\u2228q", "p\u2227q", "\u00AC(p\u2227q)", "resultado"].map((h, i) => (
                    <th key={i} style={{
                      padding: "4px 8px", fontSize: 11, fontWeight: 800, fontFamily: "var(--font-mono)",
                      background: "var(--color-background-secondary)", color: "var(--color-text-primary)",
                      borderBottom: "2.5px solid var(--color-border-secondary)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[[1,1],[1,0],[0,1],[0,0]].map(([p,q], ri) => {
                  const or = p || q ? 1 : 0;
                  const and = p && q ? 1 : 0;
                  const nand = and ? 0 : 1;
                  const res = or && nand ? 1 : 0;
                  return (
                    <tr key={ri}>
                      {[p, q, or, and, nand, res].map((v, ci) => (
                        <td key={ci} style={{
                          padding: "4px 8px", textAlign: "center",
                          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                          color: v ? "var(--color-text-success)" : "var(--color-text-danger)",
                          borderBottom: "1px solid var(--color-border-tertiary)",
                          fontWeight: ci === 5 ? 800 : 700,
                          background: ci === 5 ? (v ? "var(--color-background-success)" : "var(--color-background-danger)") : "transparent",
                        }}>
                          {v ? "V" : "F"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </LogicCallout>
    </div>
  );
}


export function Card({ title, color, children }) {
  const ds = useDevStyles("__baseFontSize", "__cardPadding");
  return (
    <div style={{
      flex: "1 1 200px", minWidth: 0, background: "var(--color-background-primary)",
      border: "2px solid var(--color-border-tertiary)",
      borderRadius: "var(--border-radius-lg)", padding: `${ds.__cardPadding + 2}px ${ds.__cardPadding + 4}px`
    }}>
      <div style={{
        fontSize: ds.__baseFontSize + 1, fontWeight: 700, marginBottom: 14,
        color: `var(--color-text-${color})`,
        display: "flex", alignItems: "center", gap: 8
      }}>
        <span style={{
          width: 12, height: 12, borderRadius: "50%",
          background: `var(--color-text-${color})`, opacity: 0.8
        }} />
        {title}
      </div>
      {children}
    </div>
  );
}

export function KV({ label, value, color, hidden, highlight, small }) {
  const ds = useDevStyles("__labelFontSize", "__baseFontSize", "__smallFontSize");
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "5px 0", fontSize: small ? ds.__smallFontSize + 1 : ds.__labelFontSize + 1,
      ...(highlight ? {
        background: "var(--color-background-success)", margin: "4px -8px",
        padding: "8px 10px", borderRadius: "var(--border-radius-md)"
      } : {})
    }}>
      <span style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>{label}</span>
      <span style={{
        fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: small ? ds.__smallFontSize + 1 : ds.__baseFontSize,
        color: color ? `var(--color-text-${color})` : "var(--color-text-primary)"
      }}>
        {hidden ? "***" : value}
      </span>
    </div>
  );
}

export function Arrow({ dir, label }) {
  const ds = useDevStyles("__labelFontSize");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {dir === "left" && <span style={{ color: "var(--color-text-tertiary)", fontSize: 18 }}>&#x2190;</span>}
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: ds.__labelFontSize + 1, fontWeight: 700,
        background: "var(--color-background-secondary)", padding: "4px 10px",
        borderRadius: "var(--border-radius-md)", color: "var(--color-text-primary)"
      }}>{label}</span>
      {dir === "right" && <span style={{ color: "var(--color-text-tertiary)", fontSize: 18 }}>&#x2192;</span>}
    </div>
  );
}

export function MsgBox({ label, text, type, sub }) {
  const ds = useDevStyles("__baseFontSize", "__smallFontSize");
  return (
    <div style={{
      background: `var(--color-background-${type})`,
      borderRadius: "var(--border-radius-md)", padding: "12px 16px",
      borderLeft: `4px solid var(--color-text-${type})`
    }}>
      <div style={{ fontSize: ds.__smallFontSize + 1, color: `var(--color-text-${type})`, marginBottom: 6, fontWeight: 700 }}>{label}</div>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: ds.__baseFontSize + 1, fontWeight: 700,
        color: `var(--color-text-${type})`, wordBreak: "break-all"
      }}>{text}</div>
      {sub && <div style={{ fontSize: ds.__smallFontSize + 1, color: `var(--color-text-${type})`, opacity: 0.8, marginTop: 6, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

export default function CryptoSimulator() {
  const [activeTab, setActiveTab] = useState(0);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('crypto-sim-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const ds = useDevStyles("__titleFontSize", "__baseFontSize", "__smallFontSize", "__labelFontSize");
  const [showMobilePopup, setShowMobilePopup] = useState(() => {
    return window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('crypto-sim-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <div style={{ maxWidth: 940, margin: "0 auto" }}>
      {showMobilePopup && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.6)", zIndex: 10000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20,
        }}>
          <div style={{
            background: "var(--color-background-primary)",
            borderRadius: "var(--border-radius-lg)",
            padding: "28px 24px",
            maxWidth: 340, width: "100%",
            textAlign: "center",
            position: "relative",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}>
            <button onClick={() => setShowMobilePopup(false)} style={{
              position: "absolute", top: 10, right: 10,
              background: "transparent", border: "none",
              fontSize: 22, cursor: "pointer", color: "var(--color-text-tertiary)",
              padding: "4px 8px", fontWeight: 700, lineHeight: 1,
            }}>
              {"\u00D7"}
            </button>
            <div style={{ marginBottom: 16 }}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ display: "block", margin: "0 auto" }}>
                <rect x="14" y="8" width="36" height="48" rx="6" stroke="var(--color-text-info)" strokeWidth="3" fill="none" />
                <path d="M50 36 L58 32 L50 28" stroke="var(--color-text-warning)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M50 32 Q56 32 56 38 Q56 52 42 52 L22 52 Q8 52 8 38 L8 32" stroke="var(--color-text-warning)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <p style={{
              fontSize: 16, color: "var(--color-text-primary)",
              fontWeight: 600, lineHeight: 1.6, margin: 0,
            }}>
              Para melhor experiencia, gire o celular para <strong style={{ color: "var(--color-text-info)" }}>modo paisagem</strong>
            </p>
            <button onClick={() => setShowMobilePopup(false)} style={{
              marginTop: 16, padding: "10px 24px",
              background: "var(--color-text-info)", color: "#fff",
              border: "none", borderRadius: "var(--border-radius-md)",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
            }}>
              Entendi
            </button>
          </div>
        </div>
      )}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 28, flexWrap: "wrap"
      }}>
        <span style={{
          fontSize: ds.__smallFontSize + 1, fontWeight: 800, color: "var(--color-text-info)",
          background: "var(--color-background-info)",
          padding: "4px 12px", borderRadius: "var(--border-radius-md)", letterSpacing: 2
        }}>SIMULADOR</span>
        <span style={{ fontSize: ds.__titleFontSize + 2, fontWeight: 700, color: "var(--color-text-primary)" }}>A lógica da criptografia</span>
        <button
          onClick={toggleTheme}
          style={{
            marginLeft: "auto",
            padding: "8px 16px",
            fontSize: ds.__smallFontSize + 1,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--color-background-secondary)",
            border: "2px solid var(--color-border-secondary)",
            borderRadius: "var(--border-radius-md)",
            color: "var(--color-text-primary)",
          }}
        >
          {theme === 'dark' ? '\u2600 Claro' : '\u263E Escuro'}
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)}
            style={{
              flex: "1 1 120px", padding: "12px 8px", fontSize: ds.__labelFontSize + 2, whiteSpace: "nowrap",
              background: activeTab === i ? "var(--color-background-info)" : "transparent",
              color: activeTab === i ? "var(--color-text-info)" : "var(--color-text-tertiary)",
              border: activeTab === i ? "2px solid var(--color-text-info)" : "2px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)", fontWeight: activeTab === i ? 800 : 500,
              minWidth: 70,
            }}>
            {t}
          </button>
        ))}
      </div>
      {activeTab === 0 && <LogicTab />}
      {activeTab === 1 && <CaesarTab />}
      {activeTab === 2 && <XorTab />}
      {activeTab === 3 && <WhatsAppE2E />}
    </div>
  );
}

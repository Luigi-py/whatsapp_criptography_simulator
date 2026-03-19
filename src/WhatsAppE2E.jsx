import { useState, useReducer, useRef, useEffect } from "react";
import { Card, KV } from "./CryptoSimulator";
import { useDevStyles } from "./DevStylePanel";
import { TruthTable, LogicProof, FormalNotation, LogicCallout } from "./LogicPanels";

/* ── Crypto Engine ─────────────────────────────────────── */

const P = 9973;
const G = 5;

function modPow(base, exp, mod) {
  let r = 1;
  base = ((base % mod) + mod) % mod;
  while (exp > 0) {
    if (exp & 1) r = (r * base) % mod;
    exp >>= 1;
    base = (base * base) % mod;
  }
  return r;
}

function simpleHash(input) {
  let h = 0x811c9dc5;
  const s = String(input);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function toHex(n, len = 4) {
  return (n >>> 0).toString(16).padStart(len, "0");
}

function makeKeyPair(seed) {
  const priv = ((seed * 7 + 13) % (P - 2)) + 2;
  const pub = modPow(G, priv, P);
  return { priv, pub };
}

function dhCalc(myPriv, theirPub) {
  return modPow(theirPub, myPriv, P);
}

function advanceChain(ck) {
  const s = String(ck);
  return {
    chainKey: parseInt(simpleHash(s + ":ck"), 16) % 65536,
    messageKey: parseInt(simpleHash(s + ":mk"), 16) % 256,
  };
}

function ratchetStep(rk, dhOut) {
  const c = rk + ":" + dhOut;
  return {
    rootKey: parseInt(simpleHash(c + ":rk"), 16) % 65536,
    chainKey: parseInt(simpleHash(c + ":ck"), 16) % 65536,
  };
}

function xorEncrypt(text, key) {
  return text
    .split("")
    .map((c) => (c.charCodeAt(0) ^ (key & 0xff)).toString(16).padStart(2, "0"))
    .join(" ");
}

/* ── State & Reducer ───────────────────────────────────── */

const SEEDS = {
  alice: { ik: 137, spk: 251, opk: 389 },
  bob: { ik: 173, spk: 293, opk: 431 },
};

const initial = {
  phase: 0,
  alice: { ik: null, spk: null, opk: null, ek: null, registered: false },
  bob: { ik: null, spk: null, opk: null, registered: false },
  server: { alice: null, bob: null },
  x3dh: {
    bundle: false,
    dh1: null,
    dh2: null,
    dh3: null,
    dh4: null,
    sk: null,
    step: 0,
  },
  ratchet: {
    rootKey: null,
    sendCK: null,
    dhGen: 0,
    senderIsAlice: true,
    aliceEph: null,
    bobEph: null,
  },
  messages: [],
  compromised: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "GEN_KEYS": {
      const w = action.who;
      const s = SEEDS[w];
      return {
        ...state,
        [w]: {
          ...state[w],
          ik: makeKeyPair(s.ik),
          spk: makeKeyPair(s.spk),
          opk: makeKeyPair(s.opk),
          registered: false,
        },
      };
    }
    case "REGISTER": {
      const w = action.who;
      const p = state[w];
      return {
        ...state,
        [w]: { ...p, registered: true },
        server: {
          ...state.server,
          [w]: { ikPub: p.ik.pub, spkPub: p.spk.pub, opkPub: p.opk.pub },
        },
      };
    }
    case "SET_PHASE":
      return { ...state, phase: action.phase };

    case "FETCH_BUNDLE":
      return {
        ...state,
        x3dh: { ...state.x3dh, bundle: true, step: 1 },
        alice: { ...state.alice, ek: makeKeyPair(547) },
      };

    case "COMPUTE_DH": {
      const n = action.n;
      const a = state.alice;
      const b = state.server.bob;
      const vals = {
        1: dhCalc(a.ik.priv, b.spkPub),
        2: dhCalc(a.ek.priv, b.ikPub),
        3: dhCalc(a.ek.priv, b.spkPub),
        4: dhCalc(a.ek.priv, b.opkPub),
      };
      return {
        ...state,
        x3dh: { ...state.x3dh, [`dh${n}`]: vals[n], step: n + 1 },
      };
    }

    case "DERIVE_SK": {
      const x = state.x3dh;
      const sk =
        parseInt(simpleHash(`${x.dh1}:${x.dh2}:${x.dh3}:${x.dh4}`), 16) %
        65536;
      const aE = makeKeyPair(601);
      const bE = makeKeyPair(701);
      const { rootKey, chainKey } = ratchetStep(sk, dhCalc(aE.priv, bE.pub));
      return {
        ...state,
        x3dh: { ...x, sk, step: 6 },
        ratchet: {
          rootKey,
          sendCK: chainKey,
          dhGen: 1,
          senderIsAlice: true,
          aliceEph: aE,
          bobEph: bE,
        },
      };
    }

    case "SEND_MSG": {
      const r = state.ratchet;
      const { chainKey, messageKey } = advanceChain(r.sendCK);
      return {
        ...state,
        ratchet: { ...r, sendCK: chainKey },
        messages: [
          ...state.messages,
          {
            sender: r.senderIsAlice ? "Alice" : "Bob",
            plain: action.text,
            cipher: xorEncrypt(action.text, messageKey),
            mk: messageKey,
            ckBefore: r.sendCK,
            ckAfter: chainKey,
            dhGen: r.dhGen,
            idx: state.messages.length,
          },
        ],
      };
    }

    case "SWITCH_SENDER": {
      const r = state.ratchet;
      const isAlice = !r.senderIsAlice;
      const eph = makeKeyPair(601 + (r.dhGen + 1) * 53);
      const other = isAlice ? r.bobEph : r.aliceEph;
      const dhOut = dhCalc(eph.priv, other.pub);
      const { rootKey, chainKey } = ratchetStep(r.rootKey, dhOut);
      return {
        ...state,
        ratchet: {
          ...r,
          rootKey,
          sendCK: chainKey,
          dhGen: r.dhGen + 1,
          senderIsAlice: isAlice,
          ...(isAlice ? { aliceEph: eph } : { bobEph: eph }),
        },
        messages: [
          ...state.messages,
          {
            type: "ratchet",
            newSender: isAlice ? "Alice" : "Bob",
            dhGen: r.dhGen + 1,
            idx: state.messages.length,
          },
        ],
      };
    }

    case "COMPROMISE":
      return { ...state, compromised: action.index };

    case "RESET":
      return initial;

    default:
      return state;
  }
}

/* ── Helper Components ─────────────────────────────────── */

function Hex({ n, color }) {
  const ds = useDevStyles("__e2eHexSize");
  return (
    <span style={{
      fontFamily: "var(--font-mono)",
      fontWeight: 700,
      color: color ? `var(--color-text-${color})` : "inherit",
      fontSize: ds.__e2eHexSize + 1,
    }}>
      Dec: {n} | Hex: 0x{toHex(n)}
    </span>
  );
}

function Callout({ children, type = "info" }) {
  const ds = useDevStyles("__baseFontSize");
  return (
    <div
      style={{
        background: `var(--color-background-${type})`,
        borderRadius: "var(--border-radius-md)",
        padding: "14px 18px",
        fontSize: ds.__baseFontSize,
        color: `var(--color-text-${type})`,
        marginBottom: 16,
        borderLeft: `4px solid var(--color-text-${type})`,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function Btn({ onClick, disabled, children, primary, style: extraStyle }) {
  const ds = useDevStyles("__baseFontSize");
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...(primary
          ? {
              background: "var(--color-text-info)",
              color: "#fff",
              borderColor: "var(--color-text-info)",
            }
          : {}),
        fontSize: ds.__baseFontSize,
        padding: "10px 18px",
        fontWeight: 700,
        ...extraStyle,
      }}
    >
      {children}
    </button>
  );
}

function StepBadge({ n, done }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 32, height: 32, borderRadius: "50%", fontWeight: 800,
      fontSize: 15, flexShrink: 0,
      background: done ? "var(--color-text-success)" : "var(--color-text-info)",
      color: "#fff",
    }}>
      {done ? "✓" : n}
    </span>
  );
}

function FlowArrow({ label, direction = "right" }) {
  const isDown = direction === "down";
  return (
    <div style={{
      display: "flex", flexDirection: isDown ? "column" : "row",
      alignItems: "center", gap: 4, padding: isDown ? "6px 0" : "0 4px"
    }}>
      {label && (
        <span style={{
          fontSize: 13, fontWeight: 700, color: "var(--color-text-warning)",
          background: "var(--color-background-warning)", padding: "3px 8px",
          borderRadius: 6
        }}>{label}</span>
      )}
      <span style={{ color: "var(--color-text-warning)", fontSize: 22, fontWeight: 700 }}>
        {isDown ? "↓" : "→"}
      </span>
    </div>
  );
}

/* ── "Por que p = 9973?" explainer toggle ──────────────── */

function ParamExplainer({ ds }) {
  const [open, setOpen] = useState(false);
  const fs = ds.__labelFontSize;
  return (
    <div style={{
      background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)",
      border: "1.5px solid var(--color-border-tertiary)", overflow: "hidden"
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, padding: "10px 16px", cursor: "pointer",
          background: "transparent", border: "none",
          fontSize: fs, color: "var(--color-text-tertiary)", fontWeight: 500,
          fontStyle: "italic", fontFamily: "inherit"
        }}
      >
        <span>Na realidade: chaves de 256 bits (Curve25519). Aqui usamos p={P} para visualização.</span>
        <span style={{
          fontSize: fs - 1, fontWeight: 700, fontStyle: "normal",
          color: "var(--color-text-tertiary)", opacity: 0.8,
          transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)"
        }}>&#x25BC;</span>
      </button>

      {open && (
        <div style={{
          padding: "0 18px 16px", fontSize: fs, color: "var(--color-text-tertiary)",
          lineHeight: 1.7, borderTop: "1.5px solid var(--color-border-tertiary)"
        }}>
          <div style={{ fontWeight: 800, marginTop: 14, marginBottom: 10, fontSize: fs + 1 }}>
            Por que p = {P} e g = {G}?
          </div>

          <div style={{ marginBottom: 10 }}>
            <strong style={{ color: "var(--color-text-primary)" }}>1. p deve ser primo</strong> — requisito
            obrigatório para Diffie-Hellman. A operação g<sup>a</sup> mod p só gera um grupo cíclico
            seguro se p for primo. 9973 é primo.
          </div>

          <div style={{ marginBottom: 10 }}>
            <strong style={{ color: "var(--color-text-primary)" }}>2. g = {G} é um bom gerador</strong> — significa
            que 5<sup>a</sup> mod 9973 produz uma boa distribuição de valores (não colapsa em poucos resultados
            repetidos), cobrindo grande parte do grupo Z*<sub>p</sub>.
          </div>

          <div style={{ marginBottom: 10 }}>
            <strong style={{ color: "var(--color-text-primary)" }}>3. Tamanho didático</strong> — é o sweet spot
            para um simulador educacional:
          </div>

          <div style={{
            fontFamily: "var(--font-mono)", fontSize: fs - 1,
            background: "var(--color-background-primary)",
            borderRadius: 8, padding: "12px 16px", marginBottom: 10,
            border: "1.5px solid var(--color-border-tertiary)",
            display: "flex", flexDirection: "column", gap: 4
          }}>
            <span>Chaves privadas: 2 a 9971 {"→"} 1-4 dígitos</span>
            <span>Chaves públicas:  5<sup>priv</sup> mod 9973 {"→"} 1-4 dígitos</span>
            <span>Hex:              0x0001 a 0x26FC {"→"} 4 caracteres</span>
          </div>

          <div style={{ marginBottom: 10 }}>
            Se fosse <strong>menor</strong> (ex: p = 97), as chaves teriam 1-2 dígitos — trivial demais,
            um aluno poderia adivinhar a chave privada de cabeça.
            Se fosse <strong>maior</strong> (ex: p = 99991), os números de 5 dígitos poluiriam a interface.
          </div>

          <div style={{ fontStyle: "italic" }}>
            Resumo: 9973 é grande o suficiente para mostrar que os cálculos são não-triviais,
            mas pequeno o suficiente para você conferir na calculadora
            que 5<sup>priv</sup> mod 9973 realmente funciona.
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Phase 1: Installation ─────────────────────────────── */

function Phase1({ state, dispatch }) {
  const ds = useDevStyles("__e2eDescSize", "__baseFontSize", "__smallFontSize", "__e2eHexSize", "__labelFontSize");
  const renderPhone = (who, label, color) => {
    const p = state[who];
    const hasKeys = p.ik !== null;
    return (
      <Card title={`${label}`} color={color}>
        {!hasKeys ? (
          <Btn onClick={() => dispatch({ type: "GEN_KEYS", who })} primary>
            Gerar Chaves
          </Btn>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Public keys section */}
            <div>
              <div style={{ fontSize: ds.__smallFontSize, fontWeight: 800, color: "var(--color-text-info)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                CHAVES PÚBLICAS
              </div>
              {[
                { name: "Chave de Identidade (IK)", val: p.ik.pub },
                { name: "Chave Pré-Assinada (SPK)", val: p.spk.pub },
                { name: "Chave Descartável (OPK)", val: p.opk.pub },
              ].map((k, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: ds.__smallFontSize + 1, fontWeight: 700, color: "var(--color-text-primary)" }}>{k.name}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: ds.__smallFontSize + 1, color: "var(--color-text-secondary)", display: "flex", gap: 12 }}>
                    <span>Dec: {k.val}</span>
                    <span>Hex: 0x{k.val.toString(16).toUpperCase().padStart(4, '0')}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Private keys section */}
            <div>
              <div style={{ fontSize: ds.__smallFontSize, fontWeight: 800, color: "var(--color-text-danger)", marginBottom: 8, marginTop: 12, textTransform: "uppercase", letterSpacing: 1 }}>
                CHAVES PRIVADAS (nunca saem do dispositivo)
              </div>
              {[
                { name: "IK privada", val: p.ik.priv },
                { name: "SPK privada", val: p.spk.priv },
                { name: "OPK privada", val: p.opk.priv },
              ].map((k, i) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: ds.__smallFontSize + 1, color: "var(--color-text-danger)", display: "flex", gap: 12 }}>
                    <span>{k.name}:</span>
                    <span>Dec: {k.val}</span>
                    <span>Hex: 0x{k.val.toString(16).toUpperCase().padStart(4, '0')}</span>
                  </div>
                </div>
              ))}
            </div>

            {!p.registered && (
              <Btn onClick={() => dispatch({ type: "REGISTER", who })} primary style={{ marginTop: 8 }}>
                Enviar ao Servidor →
              </Btn>
            )}
            {p.registered && (
              <div style={{
                fontSize: ds.__labelFontSize + 1, color: "var(--color-text-success)", marginTop: 6,
                fontWeight: 700, background: "var(--color-background-success)",
                padding: "8px 12px", borderRadius: "var(--border-radius-md)",
                display: "flex", alignItems: "center", gap: 8
              }}>
                <span style={{ fontSize: 18 }}>✓</span> Registrado no servidor
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  const serverA = state.server.alice;
  const serverB = state.server.bob;
  const bothRegistered = state.alice.registered && state.bob.registered;

  return (
    <div>
      <Callout type="info">
        <strong>Fase 1:</strong> Cada pessoa gera <strong>3 pares de chaves</strong> e envia as <strong>públicas</strong> ao servidor.
      </Callout>
      <Callout type="danger">
        Chaves privadas <strong>NUNCA</strong> saem do celular!
      </Callout>

      <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap", alignItems: "stretch" }}>
        {renderPhone("alice", "Alice", "alice")}

        {/* Server column */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "center",
          alignItems: "center", minWidth: 80, gap: 10, flex: "0 0 auto",
        }}>
          <div style={{
            fontSize: ds.__baseFontSize, fontWeight: 800,
            color: "var(--color-text-primary)",
            background: "var(--color-background-secondary)",
            padding: "10px 16px", borderRadius: "var(--border-radius-md)",
            border: "2px solid var(--color-border-secondary)",
            textAlign: "center"
          }}>
            SERVIDOR
          </div>
          <div style={{
            background: "var(--color-background-secondary)",
            borderRadius: "var(--border-radius-md)", padding: 14,
            fontSize: ds.__labelFontSize, fontFamily: "var(--font-mono)",
            textAlign: "center", color: "var(--color-text-secondary)",
            minWidth: 100, fontWeight: 600, border: "1.5px solid var(--color-border-tertiary)"
          }}>
            {serverA && <div style={{ color: "var(--color-text-alice)", marginBottom: 4 }}>Alice: 3 pub ✓</div>}
            {serverB && <div style={{ color: "var(--color-text-bob)" }}>Bob: 3 pub ✓</div>}
            {!serverA && !serverB && <div style={{ fontStyle: "italic" }}>vazio</div>}
          </div>

          {state.alice.registered && (
            <div style={{ fontSize: ds.__labelFontSize, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--color-text-alice)" }}>{state.alice.ik.pub}</span>
              <span style={{ color: "var(--color-text-warning)", fontSize: 18 }}>→</span>
            </div>
          )}
          {state.bob.registered && (
            <div style={{ fontSize: ds.__labelFontSize, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--color-text-warning)", fontSize: 18 }}>←</span>
              <span style={{ color: "var(--color-text-bob)" }}>{state.bob.ik.pub}</span>
            </div>
          )}

          {bothRegistered && (
            <Btn onClick={() => dispatch({ type: "SET_PHASE", phase: 1 })} primary style={{ marginTop: 6 }}>
              Próximo →
            </Btn>
          )}
        </div>

        {renderPhone("bob", "Bob", "bob")}
      </div>

      <ParamExplainer ds={ds} />

      {/* ── Logic Panel: Preconditions ── */}
      <LogicCallout source="LEVADA, A. Lógica Matemática, 2025, Sec. 2.3.4" collapsed={true}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Propositions */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-info)", marginBottom: 10 }}>
              Precondições Lógicas do Registro
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 10, fontWeight: 500 }}>
              Para que Alice possa se registrar no servidor, ela precisa ter gerado todas as três chaves necessárias.
            </p>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 10, fontWeight: 600 }}>
              Em linguagem natural: "Alice gerou a Chave de Identidade (IK) E Alice gerou a Chave Pré-Assinada (SPK) E Alice gerou a Chave Descartável (OPK), ENTÃO Alice pode se registrar."
            </p>
            {[
              { label: "p₁: \"Alice gerou Chave de Identidade (IK)\"", value: state.alice.ik !== null },
              { label: "p₂: \"Alice gerou Chave Pré-Assinada (SPK)\"", value: state.alice.spk !== null },
              { label: "p₃: \"Alice gerou Chave Descartável (OPK)\"", value: state.alice.opk !== null },
            ].map((prop, i) => (
              <div key={i} className={`proposition-card ${prop.value ? "true" : "false"}`}
                style={{ marginBottom: 6 }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
                  color: prop.value ? "var(--color-text-success)" : "var(--color-text-danger)",
                }}>
                  {prop.value ? "V" : "F"}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  {prop.label}
                </span>
              </div>
            ))}
            <div style={{
              marginTop: 8, padding: "8px 14px",
              background: (state.alice.ik && state.alice.spk && state.alice.opk)
                ? "var(--color-background-success)" : "var(--color-background-danger)",
              borderRadius: "var(--border-radius-md)",
              border: `1.5px solid ${(state.alice.ik && state.alice.spk && state.alice.opk)
                ? "var(--color-text-success)" : "var(--color-text-danger)"}`,
            }}>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4, fontWeight: 500 }}>
                (Em notação lógica: p₁ ∧ p₂ ∧ p₃ → "Alice pode registrar" = {(state.alice.ik && state.alice.spk && state.alice.opk) ? "V" : "F"})
              </p>
              <FormalNotation
                formula={`p₁ ∧ p₂ ∧ p₃ → "Alice pode registrar" = ${(state.alice.ik && state.alice.spk && state.alice.opk) ? "V" : "F"}`}
              />
            </div>
          </div>

          {/* One-way function */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-warning)", marginBottom: 8 }}>
              Função Unidirecional
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 10, fontWeight: 500 }}>
              Na criptografia, é fácil calcular a chave pública a partir da privada (basta fazer g^a mod p), mas é praticamente impossível fazer o inverso (descobrir a chave privada a partir da pública). Isso é chamado de logaritmo discreto.
            </p>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 10, fontWeight: 500 }}>
              Em notação lógica, essa relação é uma implicação que não funciona ao contrário: se p implica q (p → q), isso NÃO garante que q implica p.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <FormalNotation formula="privada → pública é fácil (g^a mod p)" label="Fácil" />
              <FormalNotation formula="pública → privada é DIFÍCIL (log discreto)" label="Difícil" />
            </div>
          </div>
        </div>
      </LogicCallout>
    </div>
  );
}

/* ── Phase 2: X3DH Handshake ──────────────────────────── */

const DH_INFO = [
  {
    keys: ["IK.pub (Alice)", "SPK.pub (Bob)"],
    label: "Autenticação mútua",
    desc: "Prova que Alice realmente possui sua Chave de Identidade (IK) — garante que ninguém está se passando por ela",
  },
  {
    keys: ["EK.pub (Alice)", "IK.pub (Bob)"],
    label: "Cálculo offline de Bob",
    desc: "Permite que Bob calcule o mesmo segredo quando ficar online, usando sua Chave de Identidade (IK) privada",
  },
  {
    keys: ["EK.pub (Alice)", "SPK.pub (Bob)"],
    label: "Sigilo futuro (Forward Secrecy)",
    desc: "A Chave Efêmera (EK) de Alice garante que sessões passadas permanecem seguras mesmo se chaves permanentes forem comprometidas",
  },
  {
    keys: ["EK.pub (Alice)", "OPK.pub (Bob)"],
    label: "Proteção única",
    desc: "A Chave Descartável (OPK) de Bob impede que um atacante replique uma sessão anterior (usada uma única vez e depois apagada)",
  },
];

function Phase2({ state, dispatch }) {
  const x = state.x3dh;
  const step = x.step;
  const dhValues = [x.dh1, x.dh2, x.dh3, x.dh4];
  const ds = useDevStyles("__e2eDescSize", "__baseFontSize", "__smallFontSize", "__labelFontSize");

  const dhKeyValues = state.alice.ek ? [
    { privLabel: "IK de Alice (priv)", privVal: state.alice.ik.priv, pubLabel: "SPK de Bob (pub)", pubVal: state.server.bob.spkPub },
    { privLabel: "EK de Alice (priv)", privVal: state.alice.ek.priv, pubLabel: "IK de Bob (pub)", pubVal: state.server.bob.ikPub },
    { privLabel: "EK de Alice (priv)", privVal: state.alice.ek.priv, pubLabel: "SPK de Bob (pub)", pubVal: state.server.bob.spkPub },
    { privLabel: "EK de Alice (priv)", privVal: state.alice.ek.priv, pubLabel: "OPK de Bob (pub)", pubVal: state.server.bob.opkPub },
  ] : [];

  return (
    <div>
      <Callout type="info">
        <strong>Fase 2:</strong> Alice quer enviar mensagem a Bob. Executa o <strong>X3DH</strong> (Extended Triple Diffie-Hellman) para derivar um Segredo Compartilhado (SK).
      </Callout>
      <Callout type="warning">
        Bob pode estar <strong>OFFLINE</strong>! Alice usa apenas chaves públicas do servidor.
      </Callout>

      {/* Context: keys from Phase 1 */}
      <div style={{
        marginBottom: 16, padding: "14px 18px",
        background: "var(--color-background-secondary)",
        borderRadius: "var(--border-radius-md)",
        border: "1.5px solid var(--color-border-tertiary)",
        fontSize: ds.__smallFontSize + 1,
      }}>
        <div style={{ fontWeight: 800, color: "var(--color-text-tertiary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1, fontSize: ds.__smallFontSize }}>
          Chaves da Fase 1 (usadas nos cálculos abaixo)
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontFamily: "var(--font-mono)", fontSize: ds.__smallFontSize + 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ color: "var(--color-text-alice)", fontWeight: 700 }}>Alice:</span>
            <span>IK.pub  → Dec: {state.alice.ik.pub}  |  Hex: 0x{toHex(state.alice.ik.pub)}</span>
            <span>SPK.pub → Dec: {state.alice.spk.pub}  |  Hex: 0x{toHex(state.alice.spk.pub)}</span>
            {state.alice.ek && <span style={{ color: "var(--color-text-warning)" }}>EK.pub  → Dec: {state.alice.ek.pub}  |  Hex: 0x{toHex(state.alice.ek.pub)} (efêmera)</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ color: "var(--color-text-bob)", fontWeight: 700 }}>Bob (do servidor):</span>
            <span>IK.pub  → Dec: {state.server.bob.ikPub}  |  Hex: 0x{toHex(state.server.bob.ikPub)}</span>
            <span>SPK.pub → Dec: {state.server.bob.spkPub}  |  Hex: 0x{toHex(state.server.bob.spkPub)}</span>
            <span>OPK.pub → Dec: {state.server.bob.opkPub}  |  Hex: 0x{toHex(state.server.bob.opkPub)}</span>
          </div>
        </div>
      </div>

      {/* Step 0: Fetch bundle */}
      <div style={{
        marginBottom: 18, padding: "16px 20px",
        background: step >= 1 ? "var(--color-background-success)" : "var(--color-background-info)",
        borderRadius: "var(--border-radius-md)",
        border: `2px solid ${step >= 1 ? "var(--color-text-success)" : "var(--color-text-info)"}`,
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap"
      }}>
        <StepBadge n={1} done={step >= 1} />
        <Btn
          onClick={() => dispatch({ type: "FETCH_BUNDLE" })}
          disabled={step >= 1}
          primary={step === 0}
        >
          Buscar Bundle de Bob
        </Btn>
        {step >= 1 && (
          <span style={{
            fontSize: ds.__labelFontSize + 1, color: "var(--color-text-success)", fontWeight: 700,
            fontFamily: "var(--font-mono)"
          }}>
            Bundle recebido + Chave Efêmera (EK) gerada: Dec: {state.alice.ek.pub} | Hex: 0x{toHex(state.alice.ek.pub)}
          </span>
        )}
      </div>

      {step >= 1 && <FlowArrow direction="down" label="4 cálculos DH" />}

      {/* DH computations */}
      {DH_INFO.map((info, i) => {
        const n = i + 1;
        const done = dhValues[i] !== null;
        const active = step === n;
        return (
          <div key={n}>
            <div style={{
              marginBottom: 6, padding: "16px 20px",
              borderRadius: "var(--border-radius-md)",
              background: done
                ? "var(--color-background-success)"
                : active
                  ? "var(--color-background-info)"
                  : "var(--color-background-secondary)",
              border: done
                ? "2px solid var(--color-text-success)"
                : active
                  ? "2px solid var(--color-text-info)"
                  : "2px solid var(--color-border-tertiary)",
              opacity: step < n ? 0.35 : 1,
              transition: "all 0.3s",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
              }}>
                <StepBadge n={n + 1} done={done} />
                <Btn
                  onClick={() => dispatch({ type: "COMPUTE_DH", n })}
                  disabled={step !== n}
                  primary={active}
                >
                  DH{n}
                </Btn>
                <span style={{
                  fontSize: ds.__baseFontSize, fontFamily: "var(--font-mono)", fontWeight: 700,
                  color: "var(--color-text-primary)"
                }}>
                  {info.keys[0]} × {info.keys[1]}
                </span>
                {dhKeyValues[i] && (active || done) && (
                  <span style={{
                    fontSize: ds.__smallFontSize + 1, fontFamily: "var(--font-mono)",
                    color: "var(--color-text-tertiary)", fontWeight: 600,
                    background: "var(--color-background-secondary)", padding: "3px 8px",
                    borderRadius: 6
                  }}>
                    (Dec: {dhKeyValues[i].privVal} × Dec: {dhKeyValues[i].pubVal} | Hex: 0x{toHex(dhKeyValues[i].pubVal)})
                  </span>
                )}
                {done && (
                  <span style={{
                    marginLeft: "auto", fontSize: ds.__baseFontSize,
                    color: "var(--color-text-success)", fontFamily: "var(--font-mono)", fontWeight: 700
                  }}>
                    = <Hex n={dhValues[i]} color="success" />
                  </span>
                )}
              </div>
              <div style={{
                fontSize: ds.__labelFontSize + 1,
                color: done ? "var(--color-text-success)" : "var(--color-text-secondary)",
                marginTop: 8, fontWeight: 600, paddingLeft: 44,
              }}>
                <strong>{info.label}</strong> — {info.desc}
              </div>
            </div>
            {i < 3 && step > n && <FlowArrow direction="down" />}
          </div>
        );
      })}

      {step >= 5 && <FlowArrow direction="down" label="Hash de tudo" />}

      {/* Derive SK */}
      <div style={{ marginTop: 14 }}>
        <div style={{
          padding: "16px 20px",
          background: x.sk !== null ? "var(--color-background-success)" : "var(--color-background-secondary)",
          borderRadius: "var(--border-radius-md)",
          border: `2px solid ${x.sk !== null ? "var(--color-text-success)" : step === 5 ? "var(--color-text-info)" : "var(--color-border-tertiary)"}`,
          opacity: step < 5 ? 0.35 : 1,
          transition: "all 0.3s",
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap"
        }}>
          <StepBadge n={6} done={x.sk !== null} />
          <Btn
            onClick={() => dispatch({ type: "DERIVE_SK" })}
            disabled={step !== 5}
            primary={step === 5}
          >
            Derivar Segredo Compartilhado (SK)
          </Btn>
        </div>

        {x.sk !== null && (
          <div style={{
            marginTop: 14, padding: "20px 24px",
            borderRadius: "var(--border-radius-lg)",
            background: "var(--color-background-success)",
            border: "2px solid var(--color-text-success)",
            textAlign: "center",
          }}>
            <div style={{
              fontSize: ds.__baseFontSize + 2, color: "var(--color-text-success)", fontWeight: 800,
              fontFamily: "var(--font-mono)"
            }}>
              SK = Hash(DH1 || DH2 || DH3 || DH4) = <Hex n={x.sk} color="success" />
            </div>
            <div style={{
              fontSize: ds.__smallFontSize + 1, color: "var(--color-text-tertiary)",
              fontFamily: "var(--font-mono)", marginTop: 8,
              background: "var(--color-background-secondary)", padding: "8px 12px",
              borderRadius: 6, textAlign: "left", display: "inline-block"
            }}>
              Hash(0x{toHex(x.dh1)} || 0x{toHex(x.dh2)} || 0x{toHex(x.dh3)} || 0x{toHex(x.dh4)}) = 0x{toHex(x.sk)}
            </div>
            <div style={{
              fontSize: ds.__baseFontSize, color: "var(--color-text-success)",
              marginTop: 10, fontWeight: 700
            }}>
              Ambos chegam no mesmo segredo sem transmiti-lo!
            </div>
            <div style={{
              fontSize: ds.__labelFontSize, color: "var(--color-text-secondary)",
              marginTop: 8, fontStyle: "italic"
            }}>
              Quando Bob ficar online, calcula os mesmos DHs com suas chaves privadas e chega no mesmo SK.
            </div>
            <Btn onClick={() => dispatch({ type: "SET_PHASE", phase: 2 })} primary style={{ marginTop: 14, fontSize: ds.__baseFontSize + 1 }}>
              Iniciar Conversa →
            </Btn>
          </div>
        )}
      </div>

      {/* ── Logic Panel: X3DH Logic ── */}
      <LogicCallout source="MENEZES, A. Handbook of Applied Cryptography, 1996" collapsed={true}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 4 DH as Conjunction */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-info)", marginBottom: 10 }}>
              4 DH como Conjunção (AND)
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 10, fontWeight: 500 }}>
              Os 4 cálculos Diffie-Hellman precisam TODOS ser completados para que o Segredo Compartilhado (SK) exista. Isso é como uma conjunção lógica (AND): se qualquer um falhar, o resultado é falso.
            </p>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 8, fontWeight: 600 }}>
              (Notação: DH1 ∧ DH2 ∧ DH3 ∧ DH4 → SK)
            </p>
            <FormalNotation formula="DH1 ∧ DH2 ∧ DH3 ∧ DH4 → SK" />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {[1,2,3,4].map(n => (
                <div key={n} className={`proposition-card ${dhValues[n-1] !== null ? "true" : "false"}`}>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
                    color: dhValues[n-1] !== null ? "var(--color-text-success)" : "var(--color-text-danger)",
                  }}>
                    {dhValues[n-1] !== null ? "V" : "F"}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>DH{n}</span>
                </div>
              ))}
              <div className={`proposition-card ${x.sk !== null ? "true" : "false"}`}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800,
                  color: x.sk !== null ? "var(--color-text-success)" : "var(--color-text-danger)",
                }}>
                  {x.sk !== null ? "V" : "F"}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800 }}>→ SK</span>
              </div>
            </div>
          </div>

          {/* Security Properties as Implications */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-warning)", marginBottom: 8 }}>
              Propriedades de Segurança como Implicações
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 8, fontWeight: 500 }}>
              Em linguagem natural: "Se os dois primeiros cálculos DH foram completados, então temos autenticação mútua. Se os dois últimos foram completados, então temos sigilo futuro."
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <FormalNotation formula="(Em notação lógica: DH1 ∧ DH2 → Autenticação mútua)" />
              <FormalNotation formula="(Em notação lógica: DH3 ∧ DH4 → Forward secrecy)" />
            </div>
          </div>

          {/* Hash as One-Way Implication */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-danger)", marginBottom: 8 }}>
              Derivação como Função Hash (Implicação Unidirecional)
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 8, fontWeight: 500 }}>
              Em linguagem natural: "A partir dos 4 resultados DH, é fácil calcular o segredo compartilhado. Porém, conhecendo apenas o segredo, é impossível descobrir os valores DH originais."
            </p>
            <FormalNotation formula="(Em notação lógica: (DH1||DH2||DH3||DH4) → SK é fácil; SK → (DHs) é impossível)" />
          </div>
        </div>
      </LogicCallout>
    </div>
  );
}

/* ── Phase 3: Double Ratchet Chat ──────────────────────── */

function Phase3({ state, dispatch }) {
  const [text, setText] = useState("");
  const r = state.ratchet;
  const chatRef = useRef(null);
  const ds = useDevStyles(
    "__e2eChatMsgSize", "__e2eChatMetaSize", "__e2eKeyPanelSize",
    "__baseFontSize", "__labelFontSize", "__smallFontSize"
  );

  useEffect(() => {
    if (chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [state.messages.length]);

  const send = () => {
    if (!text.trim()) return;
    dispatch({ type: "SEND_MSG", text: text.trim() });
    setText("");
  };

  const currentSender = r.senderIsAlice ? "Alice" : "Bob";
  const msgKeys = state.messages
    .filter((m) => !m.type)
    .map((m) => ({ mk: m.mk, sender: m.sender, dhGen: m.dhGen, idx: m.idx }));

  return (
    <div>
      <Callout type="info">
        <strong>Fase 3:</strong> Troque mensagens criptografadas usando o <strong>Double Ratchet</strong>. Cada mensagem usa uma chave diferente!
      </Callout>

      {/* Term definitions */}
      <div style={{
        marginBottom: 16, padding: "14px 18px",
        background: "var(--color-background-secondary)",
        borderRadius: "var(--border-radius-md)",
        border: "1.5px solid var(--color-border-tertiary)",
      }}>
        <div style={{ fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 10, fontSize: ds.__baseFontSize }}>
          Glossário — Termos usados nesta fase
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: ds.__smallFontSize + 2 }}>
          <div><strong style={{ color: "var(--color-text-danger)" }}>Root Key (RK)</strong> — Chave raiz derivada do Segredo Compartilhado (SK). Gera novas cadeias de chaves quando o remetente troca.</div>
          <div><strong style={{ color: "var(--color-text-info)" }}>Chain Key (CK)</strong> — Chave de cadeia que gera as chaves de cada mensagem. Cada mensagem enviada avança a CK, gerando uma nova CK e uma Message Key. É como uma esteira: só anda para frente.</div>
          <div><strong style={{ color: "var(--color-text-success)" }}>Message Key (MK)</strong> — Chave única usada para criptografar UMA mensagem. Descartada após uso.</div>
          <div><strong style={{ color: "var(--color-text-warning)" }}>DH Ratchet</strong> — Quando o remetente troca (Alice → Bob ou vice-versa), um novo cálculo Diffie-Hellman gera novas RK e CK, renovando toda a cadeia.</div>
          <div><strong>Ratchet Simétrico</strong> — Dentro de uma mesma cadeia, cada mensagem avança a CK para gerar a próxima MK. Processo irreversível (não se pode voltar atrás).</div>
        </div>
      </div>

      {/* Derivation chain context */}
      <div style={{
        marginBottom: 16, padding: "14px 18px",
        background: "var(--color-background-secondary)",
        borderRadius: "var(--border-radius-md)",
        border: "1.5px solid var(--color-border-tertiary)",
        fontSize: ds.__smallFontSize + 1,
      }}>
        <div style={{ fontWeight: 800, color: "var(--color-text-tertiary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1, fontSize: ds.__smallFontSize }}>
          Cadeia de derivação (de onde vem cada chave)
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          fontFamily: "var(--font-mono)", fontSize: ds.__smallFontSize + 2
        }}>
          <span style={{
            background: "var(--color-background-warning)", padding: "4px 10px",
            borderRadius: 6, fontWeight: 700, color: "var(--color-text-warning)",
            border: "1.5px solid var(--color-text-warning)"
          }}>
            SK (Fase 2): 0x{toHex(state.x3dh.sk)}
          </span>
          <span style={{ color: "var(--color-text-warning)", fontWeight: 800 }}>→</span>
          <span style={{
            background: "var(--color-background-danger)", padding: "4px 10px",
            borderRadius: 6, fontWeight: 700, color: "var(--color-text-danger)",
            border: "1.5px solid var(--color-text-danger)"
          }}>
            Root Key (RK): 0x{toHex(r.rootKey)}
          </span>
          <span style={{ color: "var(--color-text-warning)", fontWeight: 800 }}>→</span>
          <span style={{
            background: "var(--color-background-info)", padding: "4px 10px",
            borderRadius: 6, fontWeight: 700,
            color: r.senderIsAlice ? "var(--color-text-alice)" : "var(--color-text-bob)",
            border: r.senderIsAlice ? "1.5px solid var(--color-text-alice)" : "1.5px solid var(--color-text-bob)"
          }}>
            Chain Key (CK): 0x{toHex(r.sendCK)}
          </span>
          <span style={{ color: "var(--color-text-warning)", fontWeight: 800 }}>→</span>
          <span style={{
            background: "var(--color-background-success)", padding: "4px 10px",
            borderRadius: 6, fontWeight: 700, color: "var(--color-text-success)",
            border: "1.5px solid var(--color-text-success)"
          }}>
            Message Key (MK) (por msg)
          </span>
        </div>
        <div style={{
          marginTop: 8, fontSize: ds.__smallFontSize, color: "var(--color-text-tertiary)", fontWeight: 500
        }}>
          Cada mensagem avança a Chain Key (CK) e gera uma Message Key (MK) única. Trocar remetente renova tudo via novo DH.
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* Chat area */}
        <div style={{ flex: "3 1 280px", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{
            fontSize: ds.__baseFontSize + 1, color: "var(--color-text-secondary)",
            marginBottom: 12, display: "flex", alignItems: "center", gap: 12,
            background: "var(--color-background-secondary)", padding: "12px 16px",
            borderRadius: "var(--border-radius-md)", flexWrap: "wrap"
          }}>
            <span style={{ fontWeight: 700 }}>
              Enviando como:{" "}
              <strong style={{
                color: r.senderIsAlice ? "var(--color-text-alice)" : "var(--color-text-bob)",
                fontSize: ds.__baseFontSize + 2
              }}>
                {currentSender}
              </strong>
            </span>
            <button
              onClick={() => dispatch({ type: "SWITCH_SENDER" })}
              style={{
                fontSize: ds.__labelFontSize, padding: "6px 14px", fontWeight: 700,
                background: "var(--color-background-warning)", color: "var(--color-text-warning)",
                border: "2px solid var(--color-text-warning)"
              }}
            >
              Trocar Remetente {"\u27F3"}
            </button>
          </div>

          <div
            ref={chatRef}
            style={{
              flex: 1, minHeight: 280, maxHeight: 440, overflowY: "auto",
              background: "var(--color-background-secondary)",
              borderRadius: "var(--border-radius-lg)", padding: 16,
              display: "flex", flexDirection: "column", gap: 10,
              border: "2px solid var(--color-border-tertiary)"
            }}
          >
            {state.messages.length === 0 && (
              <div style={{
                textAlign: "center", color: "var(--color-text-tertiary)",
                fontSize: ds.__baseFontSize + 1, padding: 28, fontWeight: 500
              }}>
                Digite uma mensagem para começar
              </div>
            )}

            {state.messages.map((m, i) => {
              if (m.type === "ratchet") {
                return (
                  <div key={i} style={{
                    textAlign: "center", padding: "10px 14px",
                    fontSize: ds.__labelFontSize, background: "var(--color-background-ratchet-event)",
                    borderRadius: "var(--border-radius-md)",
                    color: "var(--color-text-warning)", fontWeight: 800,
                    border: "1.5px solid var(--color-text-warning)"
                  }}>
                    ⟳ DH Ratchet! (geração {m.dhGen}) — {m.newSender} agora envia
                  </div>
                );
              }
              const isAlice = m.sender === "Alice";
              return (
                <div key={i} style={{
                  alignSelf: isAlice ? "flex-end" : "flex-start", maxWidth: "80%",
                }}>
                  <div style={{
                    background: isAlice
                      ? "var(--color-background-chat-sent)"
                      : "var(--color-background-chat-received)",
                    borderRadius: "var(--border-radius-lg)", padding: "10px 14px",
                    border: `1.5px solid ${isAlice ? "var(--color-text-alice)" : "var(--color-border-secondary)"}`,
                    borderBottomRightRadius: isAlice ? 4 : "var(--border-radius-lg)",
                    borderBottomLeftRadius: isAlice ? "var(--border-radius-lg)" : 4,
                  }}>
                    <div style={{
                      fontSize: ds.__e2eChatMetaSize + 2, fontWeight: 800,
                      color: isAlice ? "var(--color-text-alice)" : "var(--color-text-bob)",
                      marginBottom: 4,
                    }}>
                      {m.sender}
                    </div>
                    <div style={{ fontSize: ds.__e2eChatMsgSize + 1, color: "var(--color-text-primary)", fontWeight: 500 }}>
                      {m.plain}
                    </div>
                    <div style={{
                      fontSize: ds.__e2eChatMetaSize + 1, color: "var(--color-text-tertiary)",
                      marginTop: 4, fontFamily: "var(--font-mono)", fontWeight: 600
                    }}>
                      CK 0x{toHex(m.ckBefore)} → MK: 0x{toHex(m.mk, 2)} | {m.cipher.slice(0, 14)}...
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={`${currentSender} digita...`}
              style={{ flex: 1, minWidth: 0, fontSize: ds.__baseFontSize + 1, padding: "12px 16px" }}
            />
            <Btn onClick={send} disabled={!text.trim()} primary style={{ flexShrink: 0 }}>
              Enviar
            </Btn>
          </div>
        </div>

        {/* Key state panel */}
        <div style={{ flex: "2 1 280px", fontSize: ds.__e2eKeyPanelSize + 1 }}>
          <div style={{
            background: "var(--color-background-secondary)",
            borderRadius: "var(--border-radius-lg)", padding: "16px 18px",
            border: "2px solid var(--color-border-tertiary)"
          }}>
            <div style={{
              fontWeight: 800, marginBottom: 14, color: "var(--color-text-primary)",
              fontSize: ds.__baseFontSize + 1, textTransform: "uppercase", letterSpacing: 1
            }}>
              Estado das Chaves
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{
                background: "var(--color-background-danger)", padding: "10px 14px",
                borderRadius: "var(--border-radius-md)", borderLeft: "4px solid var(--color-text-danger)"
              }}>
                <span style={{ color: "var(--color-text-danger)", fontWeight: 700, fontSize: ds.__e2eKeyPanelSize + 1 }}>Root Key (RK): </span>
                <span style={{
                  fontFamily: "var(--font-mono)", color: "var(--color-text-danger)", fontWeight: 800
                }}>
                  0x{toHex(r.rootKey)}
                </span>
                <div style={{
                  fontSize: ds.__e2eKeyPanelSize, color: "var(--color-text-tertiary)", marginTop: 3, fontWeight: 500
                }}>
                  Chave raiz que gera novas cadeias — Ratchet(SK + DH efêmero)
                </div>
              </div>
              <div style={{
                background: "var(--color-background-info)", padding: "10px 14px",
                borderRadius: "var(--border-radius-md)", borderLeft: `4px solid ${r.senderIsAlice ? "var(--color-text-alice)" : "var(--color-text-bob)"}`
              }}>
                <span style={{ color: r.senderIsAlice ? "var(--color-text-alice)" : "var(--color-text-bob)", fontWeight: 700, fontSize: ds.__e2eKeyPanelSize + 1 }}>Chain Key (CK): </span>
                <span style={{
                  fontFamily: "var(--font-mono)", color: r.senderIsAlice ? "var(--color-text-alice)" : "var(--color-text-bob)", fontWeight: 800
                }}>
                  0x{toHex(r.sendCK)}
                </span>
                <div style={{
                  fontSize: ds.__e2eKeyPanelSize, color: "var(--color-text-tertiary)", marginTop: 3, fontWeight: 500
                }}>
                  Chave de cadeia — derivada de Root Key (RK)
                </div>
              </div>
              <div style={{
                background: "var(--color-background-secondary)", padding: "10px 14px",
                borderRadius: "var(--border-radius-md)", border: "1.5px solid var(--color-border-secondary)"
              }}>
                <span style={{ color: "var(--color-text-secondary)", fontWeight: 700 }}>DH Geração: </span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: ds.__e2eKeyPanelSize + 3 }}>
                  {r.dhGen}
                </span>
              </div>
            </div>

            <div style={{
              marginTop: 16, borderTop: "2px solid var(--color-border-tertiary)", paddingTop: 14,
            }}>
              <div style={{
                fontWeight: 800, marginBottom: 10, color: "var(--color-text-primary)",
                fontSize: ds.__e2eKeyPanelSize + 2
              }}>
                Message Keys (CK → MK)
              </div>
              <div style={{
                display: "flex", flexDirection: "column", gap: 4,
                maxHeight: 220, overflowY: "auto",
              }}>
                {msgKeys.length === 0 && (
                  <span style={{
                    color: "var(--color-text-tertiary)", fontStyle: "italic",
                    fontSize: ds.__e2eKeyPanelSize + 1
                  }}>
                    nenhum ainda
                  </span>
                )}
                {msgKeys.map((mk, i) => {
                  const isLatest = i === msgKeys.length - 1;
                  const msg = state.messages.filter(m => !m.type)[i];
                  return (
                    <div key={i} style={{
                      fontFamily: "var(--font-mono)", fontSize: ds.__e2eKeyPanelSize + 1,
                      opacity: isLatest ? 1 : 0.5,
                      color: "var(--color-text-primary)",
                      padding: isLatest ? "8px 8px" : "4px 8px",
                      background: isLatest ? "var(--color-background-info)" : "transparent",
                      borderRadius: "var(--border-radius-md)",
                      fontWeight: isLatest ? 700 : 400
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>MK#{mk.idx + 1} ({mk.sender[0]})</span>
                        <span style={{ color: "var(--color-text-success)", fontWeight: 700 }}>0x{toHex(mk.mk, 2)}</span>
                        <span style={{ color: "var(--color-text-tertiary)" }}>g{mk.dhGen}</span>
                      </div>
                      {isLatest && msg && (
                        <div style={{
                          fontSize: ds.__e2eKeyPanelSize, color: "var(--color-text-tertiary)",
                          marginTop: 2
                        }}>
                          CK 0x{toHex(msg.ckBefore)} → MK + CK 0x{toHex(msg.ckAfter)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{
              marginTop: 14, borderTop: "2px solid var(--color-border-tertiary)", paddingTop: 12,
              fontSize: ds.__labelFontSize, color: "var(--color-text-secondary)", fontWeight: 600
            }}>
              <div style={{
                background: "var(--color-background-info)", padding: "8px 12px",
                borderRadius: "var(--border-radius-md)", marginBottom: 6,
                borderLeft: "3px solid var(--color-text-info)"
              }}>
                <strong>Ratchet simétrico:</strong> cada msg avança CK → nova CK + MK
              </div>
              <div style={{
                background: "var(--color-background-warning)", padding: "8px 12px",
                borderRadius: "var(--border-radius-md)",
                borderLeft: "3px solid var(--color-text-warning)"
              }}>
                <strong>DH Ratchet:</strong> trocar remetente gera novo RK + CK via novo DH
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <Btn
                onClick={() => dispatch({ type: "SET_PHASE", phase: 3 })}
                disabled={state.messages.filter((m) => !m.type).length < 2}
                primary={state.messages.filter((m) => !m.type).length >= 2}
              >
                Análise de Segurança →
              </Btn>
            </div>

            {/* ── Logic Panel: Chain of Implications ── */}
            <LogicCallout source="HUTH, M.; RYAN, M. Logic in Computer Science, 2004, Cap. 3" collapsed={true}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-info)", marginBottom: 10 }}>
                Cadeia de Implicações (Chain Key)
              </div>

              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 10, fontWeight: 500 }}>
                A cadeia de derivação funciona como uma via de mão única: a partir de uma Chain Key (CK), é fácil calcular a próxima, mas é impossível voltar para a anterior. Isso garante que, se um atacante descobrir uma chave atual, ele NÃO consegue acessar mensagens anteriores.
              </p>

              {/* Chain visualization */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
                fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
                padding: "10px 14px", background: "var(--color-background-primary)",
                borderRadius: "var(--border-radius-md)", border: "1.5px solid var(--color-border-tertiary)",
                marginBottom: 10,
              }}>
                {msgKeys.slice(0, 6).map((mk, i) => {
                  const senderIsAlice = mk.sender === "Alice";
                  return (
                    <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4,
                        background: senderIsAlice ? "var(--color-background-info)" : "var(--color-background-warning)",
                        color: senderIsAlice ? "var(--color-text-alice)" : "var(--color-text-bob)",
                        border: `1px solid ${senderIsAlice ? "var(--color-text-alice)" : "var(--color-text-bob)"}`,
                      }}>
                        CK{"₀₁₂₃₄₅"[i] || i}
                      </span>
                      {i < Math.min(msgKeys.length - 1, 5) && (
                        <span style={{ color: "var(--color-text-warning)", fontSize: 16 }}>→</span>
                      )}
                    </span>
                  );
                })}
                {msgKeys.length > 6 && <span style={{ color: "var(--color-text-tertiary)" }}>...</span>}
              </div>

              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 8, fontWeight: 600 }}>
                (Notação: ∀i {"<"} n: comprometido(CK_n) → ¬acessível(CK_i))
              </p>

              <FormalNotation formula="CK_n → CK_{n+1} (fácil); CK_{n+1} → CK_n (impossível)" />

              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 8, marginBottom: 6, fontWeight: 500 }}>
                Forward secrecy: as setas são de MÃO ÚNICA. Conhecer CK₃ não revela CK₂.
              </p>

              <FormalNotation formula="∀i < n: comprometido(CK_n) → ¬acessível(CK_i)" />
            </LogicCallout>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Phase 4: Security Demo ────────────────────────────── */

function Phase4({ state, dispatch }) {
  const realMsgs = state.messages.filter((m) => !m.type);
  const comp = state.compromised;
  const ds = useDevStyles("__e2eDescSize", "__baseFontSize", "__smallFontSize", "__labelFontSize");
  const [hoveredMsg, setHoveredMsg] = useState(null);

  if (realMsgs.length === 0) {
    return (
      <div style={{
        textAlign: "center", padding: 40, color: "var(--color-text-tertiary)",
        fontSize: ds.__baseFontSize + 1
      }}>
        Envie mensagens na fase anterior primeiro.
        <br />
        <Btn onClick={() => dispatch({ type: "SET_PHASE", phase: 2 })} style={{ marginTop: 14 }}>
          ← Voltar ao Chat
        </Btn>
      </div>
    );
  }

  const compromisedMsg = comp !== null ? realMsgs.find((m) => m.idx === comp) : null;
  const compromisedDhGen = compromisedMsg ? compromisedMsg.dhGen : null;

  // Group messages by dhGen
  const grouped = [];
  let currentGroup = null;
  realMsgs.forEach(m => {
    if (!currentGroup || currentGroup.dhGen !== m.dhGen) {
      currentGroup = { dhGen: m.dhGen, msgs: [m] };
      grouped.push(currentGroup);
    } else {
      currentGroup.msgs.push(m);
    }
  });

  return (
    <div>
      <Callout type="danger">
        <strong>Fase 4:</strong> Visão do <strong>atacante</strong>: só vê ciphertext hex. Selecione uma chave para &quot;comprometer&quot; e veja o que acontece.
      </Callout>

      <div style={{
        marginBottom: 18, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        background: "var(--color-background-secondary)", padding: "16px 20px",
        borderRadius: "var(--border-radius-md)", border: "2px solid var(--color-border-secondary)"
      }}>
        <span style={{
          fontSize: ds.__baseFontSize, color: "var(--color-text-primary)", fontWeight: 700
        }}>
          Comprometer chave da msg:
        </span>
        <select
          value={comp ?? ""}
          onChange={(e) =>
            dispatch({
              type: "COMPROMISE",
              index: e.target.value === "" ? null : +e.target.value,
            })
          }
          style={{ fontSize: ds.__baseFontSize, padding: "8px 14px", fontWeight: 600 }}
        >
          <option value="">Nenhuma</option>
          {realMsgs.map((m) => (
            <option key={m.idx} value={m.idx}>
              Msg #{m.idx + 1} ({m.sender})
            </option>
          ))}
        </select>
      </div>

      {/* Hacker Process Visualization */}
      {compromisedMsg && (
        <div style={{
          marginBottom: 22, padding: "18px 22px",
          background: "var(--color-background-danger)",
          borderRadius: "var(--border-radius-lg)",
          border: "2px solid var(--color-text-danger)",
        }}>
          <div style={{ fontSize: ds.__baseFontSize + 1, fontWeight: 800, color: "var(--color-text-danger)", marginBottom: 12 }}>
            Como o atacante descobriu a Message Key (MK) #{compromisedMsg.idx + 1}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: ds.__smallFontSize + 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, color: "var(--color-text-danger)", minWidth: 24 }}>1.</span>
              <span>O atacante interceptou o ciphertext: <code style={{ fontFamily: "var(--font-mono)" }}>{compromisedMsg.cipher}</code></span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, color: "var(--color-text-danger)", minWidth: 24 }}>2.</span>
              <span>Obteve a Message Key (MK): <code style={{ fontFamily: "var(--font-mono)" }}>0x{compromisedMsg.mk.toString(16).padStart(2,'0')}</code> (por vazamento, falha de implementação, ou acesso físico ao dispositivo)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, color: "var(--color-text-danger)", minWidth: 24 }}>3.</span>
              <span>Aplicou XOR: ciphertext ⊕ MK = texto original: "<strong>{compromisedMsg.plain}</strong>"</span>
            </div>
            <div style={{
              marginTop: 8, padding: "10px 14px",
              background: "var(--color-background-success)",
              borderRadius: "var(--border-radius-md)",
              border: "1.5px solid var(--color-text-success)",
              fontWeight: 700, color: "var(--color-text-success)",
            }}>
              Porém: a MK é usada UMA vez e depois descartada. O atacante NÃO consegue derivar as MKs anteriores (Forward Secrecy) nem as futuras após um DH Ratchet (Future Secrecy).
            </div>
          </div>
        </div>
      )}

      {/* Attacker view - grouped by DH generation */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
        {grouped.map((group, gi) => (
          <div key={gi}>
            <div style={{
              fontSize: ds.__labelFontSize + 1, fontWeight: 800,
              color: "var(--color-text-warning)",
              padding: "6px 12px", marginBottom: 6,
              background: "var(--color-background-warning)",
              borderRadius: "var(--border-radius-md)",
              border: "1.5px solid var(--color-text-warning)",
            }}>
              Geração DH #{group.dhGen} ({group.msgs[0].sender} → {group.msgs[0].sender === "Alice" ? "Bob" : "Alice"})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 12 }}>
              {group.msgs.map((m) => {
                const isCompromised = comp === m.idx;
                const isBefore = comp !== null && m.idx < comp;
                const isAfter = comp !== null && m.idx > comp;
                const isAfterRatchet = isAfter && m.dhGen !== compromisedDhGen;
                const isAfterSameChain = isAfter && m.dhGen === compromisedDhGen;

                let bg, borderC, label, canRead;
                if (isCompromised) {
                  bg = "var(--color-background-danger)";
                  borderC = "var(--color-text-danger)";
                  label = "VAZOU!";
                  canRead = true;
                } else if (isBefore) {
                  bg = "var(--color-background-success)";
                  borderC = "var(--color-text-success)";
                  label = "Forward Secrecy";
                  canRead = false;
                } else if (isAfterRatchet) {
                  bg = "var(--color-background-success)";
                  borderC = "var(--color-text-success)";
                  label = "Future Secrecy (DH Ratchet)";
                  canRead = false;
                } else if (isAfterSameChain) {
                  bg = "var(--color-background-success)";
                  borderC = "var(--color-text-success)";
                  label = "Protegido (chain one-way)";
                  canRead = false;
                } else {
                  bg = "var(--color-background-secondary)";
                  borderC = "var(--color-border-tertiary)";
                  label = null;
                  canRead = false;
                }

                return (
                  <div
                    key={m.idx}
                    onMouseEnter={() => setHoveredMsg(m.idx)}
                    onMouseLeave={() => setHoveredMsg(null)}
                    style={{
                      padding: "14px 18px", borderRadius: "var(--border-radius-md)",
                      background: bg,
                      transition: "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                      border: `2px solid ${borderC}`,
                      transform: hoveredMsg === m.idx ? "scale(1.03) translateX(8px)" : "scale(1)",
                      boxShadow: hoveredMsg === m.idx ? "0 8px 24px rgba(0,0,0,0.15)" : "none",
                      zIndex: hoveredMsg === m.idx ? 10 : 1,
                      position: "relative",
                    }}
                  >
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      flexWrap: "wrap", gap: 8
                    }}>
                      <span style={{ fontSize: ds.__baseFontSize, fontWeight: 800, color: "var(--color-text-primary)" }}>
                        Msg #{m.idx + 1} ({m.sender}) — Gen {m.dhGen}
                      </span>
                      {label && (
                        <span style={{
                          fontSize: ds.__labelFontSize, fontWeight: 800,
                          padding: "4px 12px", borderRadius: "var(--border-radius-md)",
                          background: isCompromised ? "var(--color-text-danger)" : "var(--color-text-success)",
                          color: "#fff",
                        }}>
                          {label}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-mono)", fontSize: ds.__baseFontSize,
                      marginTop: 8, wordBreak: "break-all", fontWeight: 600
                    }}>
                      {canRead ? (
                        <span style={{ color: "var(--color-text-danger)" }}>
                          {m.cipher} → &quot;{m.plain}&quot; (MK: 0x{toHex(m.mk, 2)})
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-text-tertiary)" }}>
                          {m.cipher}
                          {comp !== null && (
                            <strong style={{ color: "var(--color-text-success)", marginLeft: 8 }}>→ NÃO CONSIGO LER</strong>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Explanatory cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Card title="Forward Secrecy" color="success">
          <p style={{
            fontSize: ds.__labelFontSize + 1, color: "var(--color-text-secondary)",
            margin: 0, fontWeight: 600, lineHeight: 1.5
          }}>
            Message Keys (MK) são derivadas de forma <strong>one-way</strong>. Comprometer uma não revela as anteriores.
          </p>
        </Card>
        <Card title="Future Secrecy" color="info">
          <p style={{
            fontSize: ds.__labelFontSize + 1, color: "var(--color-text-secondary)",
            margin: 0, fontWeight: 600, lineHeight: 1.5
          }}>
            Cada troca de remetente gera <strong>novo DH</strong>, criando chaves completamente independentes.
          </p>
        </Card>
        <Card title="E2E" color="warning">
          <p style={{
            fontSize: ds.__labelFontSize + 1, color: "var(--color-text-secondary)",
            margin: 0, fontWeight: 600, lineHeight: 1.5
          }}>
            O servidor <strong>nunca</strong> possui Message Keys (MK). Só transporta ciphertext ilegível.
          </p>
        </Card>
      </div>

      {/* ── Logic Panel: Forward Secrecy Proof ── */}
      <LogicCallout source="HUTH, M.; RYAN, M. Logic in Computer Science, 2004, Cap. 3; LEVADA, A. Lógica Matemática, 2025, Sec. 3.2" collapsed={true}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-success)", marginBottom: 10 }}>
          Prova Formal de Forward Secrecy
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 10, fontWeight: 500 }}>
          Se um atacante comprometer a chave de uma mensagem, as mensagens anteriores permanecem seguras. Isso acontece porque cada Message Key (MK) é derivada de uma Chain Key (CK) que é destruída após uso — não há caminho de volta.
        </p>
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6, fontWeight: 600 }}>
            (Notação formal: □(comprometida(MK_n) → ¬acessível(MK_i) para todo i {"<"} n))
          </p>
          <FormalNotation formula="□(comprometida(MK_n) → ¬acessível(MK_i) para todo i < n)" label="Safety Property" />
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8, fontWeight: 500 }}>
          O símbolo <strong style={{ color: "var(--color-text-info)" }}>□</strong> (sempre) vem da Lógica Temporal — significa que NUNCA é violado.
        </p>
        <LogicProof
          steps={[
            { formula: "MK_i derivada de CK_i", explanation: "Definição" },
            { formula: "CK_i destruída após uso", explanation: "Protocolo Signal" },
            { formula: "Sem CK_i, ¬∃ caminho para MK_i", explanation: "One-way derivation" },
            { formula: "∴ comprometida(MK_n) → ¬acessível(MK_i)", result: "Q.E.D.", explanation: "Forward Secrecy" },
          ]}
        />
      </LogicCallout>

      {/* ── Logic Panel: Future Secrecy Proof ── */}
      <LogicCallout source="HUTH, M.; RYAN, M. Logic in Computer Science, 2004, Cap. 3" collapsed={true}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-info)", marginBottom: 10 }}>
          Prova Formal de Future Secrecy
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 10, fontWeight: 500 }}>
          Mesmo que um atacante comprometa uma chave atual, quando o outro participante responder, o DH Ratchet gerará chaves completamente novas e independentes. O sistema se recupera automaticamente.
        </p>
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6, fontWeight: 600 }}>
            (Notação formal: comprometida(t) → ◇ segura(t + n))
          </p>
          <FormalNotation formula="comprometida(t) → ◇ segura(t + n)" label="Liveness Property" />
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8, fontWeight: 500 }}>
          O símbolo <strong style={{ color: "var(--color-text-success)" }}>◇</strong> (eventualmente) garante que o sistema SE RECUPERA.
          Quando Bob responde, o DH Ratchet gera chaves COMPLETAMENTE novas.
          O atacante perde acesso porque as novas chaves não derivam das comprometidas.
        </p>
      </LogicCallout>

      {/* ── Logic Panel: Verification Contradiction ── */}
      <LogicCallout source="LEVADA, A. Lógica Matemática, 2025, Sec. 3.2" collapsed={true}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-danger)", marginBottom: 10 }}>
          Contradição na Verificação de Identidade
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 10, fontWeight: 500 }}>
          Ataque Man-in-the-Middle (MITM) — quando um atacante se posiciona secretamente entre Alice e Bob, interceptando e potencialmente alterando todas as mensagens. O atacante finge ser Bob para Alice e Alice para Bob.
        </p>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 10, fontWeight: 500 }}>
          Para detectar esse ataque, Alice e Bob podem comparar seus Safety Numbers (códigos de segurança). Se os códigos forem diferentes, significa que há um intermediário — o que constitui uma contradição lógica.
        </p>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8, fontWeight: 600 }}>
          (Notação: p ∧ ¬p = F — uma proposição não pode ser verdadeira e falsa ao mesmo tempo)
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <FormalNotation formula="p: Hash(IK_Alice) = Hash(IK_que_Bob_vê)" label="Proposição" />
          <FormalNotation formula="Se MITM: p é F (códigos diferentes)" label="Ataque" />
          <FormalNotation formula="p ∧ ¬p = F (contradição — SEMPRE falso)" label="Detecção" />
        </div>
        <div style={{
          marginTop: 12, padding: "10px 14px",
          background: "var(--color-background-danger)",
          borderRadius: "var(--border-radius-md)",
          border: "1.5px solid var(--color-text-danger)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-danger)" }}>
            Contradição detectada = Ataque detectado
          </div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4, fontWeight: 500 }}>
            Na lógica, uma contradição é uma proposição que é SEMPRE falsa.
          </div>
        </div>
      </LogicCallout>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────── */

const PHASES = ["Instalação", "Handshake", "Conversa", "Segurança"];

export default function WhatsAppE2E() {
  const [state, dispatch] = useReducer(reducer, initial);
  const ds = useDevStyles("__e2ePhaseTabSize", "__e2eDescSize", "__baseFontSize", "__smallFontSize");

  useEffect(() => {
    const handler = (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "SELECT" ||
        e.target.tagName === "TEXTAREA"
      )
        return;
      if (e.key === "ArrowRight" && state.phase < 3)
        dispatch({ type: "SET_PHASE", phase: state.phase + 1 });
      if (e.key === "ArrowLeft" && state.phase > 0)
        dispatch({ type: "SET_PHASE", phase: state.phase - 1 });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.phase]);

  const canPhase = [
    true,
    state.alice.registered && state.bob.registered,
    state.x3dh.sk !== null,
    state.x3dh.sk !== null,
  ];

  return (
    <div>
      <Callout type="info">
        Simulação completa do <strong>Signal Protocol</strong> (usado no WhatsApp): <strong>X3DH</strong> + <strong>Double Ratchet</strong>.
      </Callout>

      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        {PHASES.map((name, i) => (
          <button
            key={i}
            onClick={() => canPhase[i] && dispatch({ type: "SET_PHASE", phase: i })}
            disabled={!canPhase[i]}
            style={{
              flex: "1 1 120px", fontSize: ds.__e2ePhaseTabSize + 2, padding: "10px 8px", whiteSpace: "nowrap",
              background: state.phase === i ? "var(--color-background-info)" : "transparent",
              color: state.phase === i ? "var(--color-text-info)" : "var(--color-text-tertiary)",
              border: state.phase === i
                ? "2px solid var(--color-text-info)"
                : "2px solid var(--color-border-tertiary)",
              borderRadius: "var(--border-radius-md)",
              fontWeight: state.phase === i ? 800 : 500,
              opacity: canPhase[i] ? 1 : 0.35,
            }}
          >
            {i + 1}. {name}
          </button>
        ))}
      </div>

      {state.phase === 0 && <Phase1 state={state} dispatch={dispatch} />}
      {state.phase === 1 && <Phase2 state={state} dispatch={dispatch} />}
      {state.phase === 2 && <Phase3 state={state} dispatch={dispatch} />}
      {state.phase === 3 && <Phase4 state={state} dispatch={dispatch} />}

      <div style={{
        marginTop: 22, textAlign: "center", display: "flex",
        justifyContent: "center", alignItems: "center", gap: 16
      }}>
        <button
          onClick={() => dispatch({ type: "RESET" })}
          style={{ fontSize: ds.__labelFontSize, color: "var(--color-text-tertiary)", fontWeight: 600 }}
        >
          Resetar tudo
        </button>
        <span style={{
          fontSize: ds.__labelFontSize, color: "var(--color-text-tertiary)", fontWeight: 500
        }}>
          Setas ← → para navegar entre fases
        </span>
      </div>
    </div>
  );
}

# Official example full working
- [Simulator_Whatsapp_Crypto.com](https://whatsapp-criptography-simulator.vercel.app/)

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## How to run the local server?

cd "D:/1.ESTUDOS/BIA UFG - Bacharelado Inteligência Artificial/1º Ano/1º Semestre (1º Período)/Lógica Matemática/Prática/Seminário 1/simulador"

npm run dev

Depois abra http://localhost:5173 no navegador.

## Como matar um servidor fantasma na porta 5173 (Windows)

Se a porta 5173 ainda estiver ocupada mesmo sem terminal aberto, execute no terminal:

```bash
netstat -ano | grep :5173
```

Isso mostra o PID do processo. Depois, mate-o com:

```bash
taskkill //F //PID <numero_do_PID>
```

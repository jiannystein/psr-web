<div align="center">

  <img src="./public/psr-logo-mark-692YSYBp.svg" alt="PSRWeb Logo" width="100" />

  <h1 align="center">PSRWeb</h1>

  <p align="center">
    <strong>Privacy-first browser-based screen capture and step recorder.</strong>
  </p>

  <p align="center">
    <a href="https://jiannystein.github.io/psr-web/">
      <img src="https://img.shields.io/badge/Live_Demo-Demo-blue?style=for-the-badge&logo=vercel" alt="Live Demo" />
    </a>
    <img src="https://img.shields.io/badge/React-18.3-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  </p>
</div>

<hr />

## ✨ Features

- 🛡️ **Privacy-First**: Everything runs locally in your browser. No data is sent to external servers.
- 🎥 **Screen Capture**: Easily record your screen with high quality.
- 👣 **Step Recorder**: Automatically document your workflow step-by-step.
- 💾 **Local Storage**: IndexedDB schema via Dexie for reliable and fast local data management.
- 🪟 **Floating Toolbar**: Intuitive and non-intrusive floating toolbar with privacy notice.
- 📦 **Export Generator**: Self-contained HTML export generator to easily share your recordings and steps.

## 🚀 Getting Started

### Use It Right Away (No Rebuild Needed)

If you just want to use PSRWeb, open the published build directly:

- https://jiannystein.github.io/psr-web/

This is the fastest way to start recording steps and exporting output, with no local setup required.

### Rebuild It Locally (If You Want to Improve It)

If you want to modify the product, experiment with ideas, or contribute improvements, fork the repo and run it locally.

Suggested workflow:

1. Fork the repository on GitHub.
2. Clone your fork locally.
3. Build and iterate on your own branch.
4. Open a pull request when your changes are ready.

Follow these instructions to set up the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/) installed (v18 or higher recommended)
- `npm`, `yarn`, or `pnpm`

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jiannystein/psr-web.git
   cd psr-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server with hot-module replacement (HMR):

```bash
npm run dev
```

### Build for Production

Generate an optimized production build:

```bash
npm run build
npm run preview
```

## 🛠️ Technology Stack

- **Framework**: [React 18](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- **File Handling**: [JSZip](https://stuk.github.io/jszip/)

## 📝 MVP Status

The current MVP implementation includes the foundational architecture:
- ✅ Recording lifecycle state machine
- ✅ IndexedDB schema via Dexie
- ✅ Worker protocol scaffolding
- ✅ Floating toolbar and privacy notice
- ✅ Self-contained HTML export generator

## 📄 License

This project is open-source and available under the standard MIT license.

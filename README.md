# Viper Td Logger (VTL)

Institutional Futures Trading Journal & Empirical Execution Gate Analytics for Micro E-mini Nasdaq (MNQ) and Micro E-mini S&P 500 (MES) traders.

## Features

- **Google Cloud Sync**: Instant multi-device synchronization powered by Google Firebase Authentication and Cloud Firestore.
- **Persistent Session Memory**: Automatic sign-in remembrance across tab closes and browser restarts.
- **6-Gate Rule Compliance**: Empirical edge and win rate attribution for trade discipline rules.
- **Chart Screenshot Vault**: 5-minute chart entry and exit snapshot management with cloud backup.
- **Trade Ledger**: Filterable trade log with CSV and JSON backup export/import capabilities.
- **Rule Analytics**: Edge discovery metrics comparing discipline gate adherence vs violations.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4
- **Cloud & Database**: Google Firebase Auth & Cloud Firestore
- **Icons**: Lucide React

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/mantis-rei/Viper-Td-Logger.git
cd Viper-Td-Logger
```

### 2. Install dependencies
```bash
npm install --legacy-peer-deps
```

### 3. Configure Firebase (Optional if embedded)
Copy `.env.example` to `.env.local` and add your Firebase credentials:
```bash
cp .env.example .env.local
```

### 4. Run development server
```bash
npm run dev
```

Visit `http://localhost:3000` to open the app.

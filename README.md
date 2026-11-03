# Viper Td Logger (VTL) & Arsenal Trading System

[![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg)](https://tailwindcss.com)
[![Pine Script](https://img.shields.io/badge/PineScript-v5-green.svg)](https://www.tradingview.com/pine-script-docs/)

> Institutional Futures Trading Journal, Confluence Gate Analytics, and Execution Platform for Micro E-mini Nasdaq (MNQ) and Micro E-mini S&P 500 (MES), paired directly with the **Arsenal Pro [Antigravity]** TradingView indicator.

---

## 🎯 The Two Valid A++ Trading Setups

The system eliminates discretionary hesitation by restricting execution to strictly **two mechanical A++ setups**:

```
                          TWO VALID A++ SETUPS
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│   SETUP 1 (TYPE A): EXPANSION   │ │    SETUP 2 (TYPE B): RETEST     │
├─────────────────────────────────┤ ├─────────────────────────────────┤
│ • Location: ABOVE 1st Band      │ │ • Location: BELOW 1st Band      │
│ • Trend: > 24 on both NQ & ES   │ │ • Trend: > 24 on both NQ & ES   │
│ • Trigger: Ribbon test (EMA 8)  │ │ • Trigger: Deep pullback into   │
│   with rejection or strong      │ │   Ribbon / EMA 22 baseline;     │
│   engulfing candle closing      │ │   rejection closing back        │
│   ABOVE EMA 8                   │ │   ABOVE EMA 8                   │
│ • Stop Loss: Directly BELOW the │ │ • Stop Loss: Directly BELOW the │
│   breakout candle               │ │   breakout candle               │
│ • Target: Strict 1:2 RR         │ │ • Target: 2nd Volatility Band   │
└─────────────────────────────────┘ └─────────────────────────────────┘
*(Vice versa for Short setups)*
```

### 1. Setup 1 (Type A): Above 1st Band Ribbon Rejection (1:2 RR)
* **Regime:** Established momentum expansion beyond the 1st standard deviation band.
* **Trend Strength:** Must be strictly **$> 24$** (confirmed by ADX / Trend Gauge).
* **Pullback Depth:** Shallow test into the ribbon (EMA 8).
* **Trigger:** Rejection candle or strong engulfing candle closing decisively **above EMA 8** (below for Short).
* **Stop Loss:** Directly below the low of the breakout candle.
* **Take Profit:** Strict **1:2 Risk-to-Reward (RR)** ratio.

### 2. Setup 2 (Type B): Below 1st Band Deep Retest (Target: 2nd Band)
* **Regime:** Mean retest / liquidity sweep inside or below the 1st band.
* **Trend Strength:** Must be strictly **$> 24$**.
* **Pullback Depth:** Deep corrective pullback into the EMA 21 / EMA 55 baseline (or unfilled HTF gap).
* **Trigger:** Decisive rejection wick off the baseline, closing back **above EMA 8** (below for Short).
* **Stop Loss:** Directly below the low of the breakout candle.
* **Take Profit:** Targets the **2nd Volatility Band** (capturing the full expansion runway).

---

## 🛠️ Ecosystem Overview

### 1. Arsenal Pro TradingView Indicator (`arsenal.pine`)
Included directly in the root directory:
* **VWAP ±1σ & ±2σ Bands:** Dynamic volatility expansion envelopes.
* **EMA Trend Ribbon:** 8 / 21 / 55 EMA alignment for directional bias.
* **1m CISD Engine:** Lower-timeframe change in state of delivery (Type A shallow vs Type B deep pattern-confirmed).
* **PO3 HTF Candle Projection:** Multi-timeframe open/high/low/close visualization.
* **HTF FVG Accelerators:** Automated detection of unfilled 15m, 30m, 1H, 4H, and Daily Fair Value Gaps.
* **15-Row Confluence HUD:** Real-time signal dashboard scoring market regime, bias, and session windows.

### 2. Viper Trade Logger Web App (`src/`)
A high-performance trading journal built for execution discipline:
* **Dynamic Setup Cards:** Select between Setup 1 (Type A) and Setup 2 (Type B) with automated rule switching.
* **Real-time Safeguards:** Warns if Trend $\le 24$ or RSI enters overbought/oversold exhaustion zones.
* **1-Click 1:2 RR Calculator:** Computes exact target prices instantly from entry and stop loss.
* **Cloud Sync:** Firebase Authentication and Cloud Firestore for multi-device synchronization.
* **Chart Vault:** IndexedDB high-resolution entry and exit screenshot storage.
* **Execution Analytics:** Scenario performance matrix measuring win rate, average R, and net P&L.

---

## 💻 Tech Stack

* **Frontend**: React 19, TypeScript, Vite
* **Styling**: Tailwind CSS v4
* **Database & Auth**: Google Firebase Auth & Cloud Firestore
* **Local Storage**: IndexedDB (Screenshots) & LocalStorage (Offline caching)
* **Icons**: Lucide React
* **Indicator**: TradingView Pine Script v5

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/mantis-rei/Viper-Td-Logger.git
cd Viper-Td-Logger
```

### 2. Install dependencies
```bash
npm install --legacy-peer-deps
```

### 3. Environment Setup (Optional for cloud sync)
Create `.env.local` with your Firebase config:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` (or the port displayed in your terminal).

### 5. Build for Production
```bash
npm run build
```

---

## 📜 License
MIT License. Built for discipline, empirical edge, and institutional trade execution.

# Governance DApp

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd app
npm install
```

### 2. Environment Setup

Copy the example environment file and add your Alchemy API key:

```bash
cp .env.example .env
```

Edit `.env` and replace `YOUR_API_KEY_HERE` with your actual Alchemy API key:

```env
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ACTUAL_API_KEY
```

**How to get Alchemy API Key:**
1. Visit [https://www.alchemy.com/](https://www.alchemy.com/)
2. Sign up for a free account
3. Create a new app, select "Ethereum" and "Sepolia" network
4. Copy the API key from your dashboard

### 3. Run Development Server

```bash
npm run dev
```

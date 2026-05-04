<div align="center">

# 🔷 InsightForge Intelligence

### Enterprise Analytics Dashboard — Built for Scale

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-DB%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel)](https://insight-forge-dashboard.vercel.app)
[![Groq](https://img.shields.io/badge/Groq-AI%20Powered-orange?style=for-the-badge)](https://groq.com)

> **A world-class enterprise analytics dashboard** featuring real-time KPI tracking,
> AI-powered insights via Groq + Llama 3.1, Google OAuth, and a stunning glassmorphism dark UI.

[🚀 **Live Demo**](https://insight-forge-dashboard.vercel.app) &nbsp;·&nbsp; [🐛 **Report Bug**](https://github.com/YOUR_USERNAME/insightforge-dashboard/issues) &nbsp;·&nbsp; [✨ **Request Feature**](https://github.com/YOUR_USERNAME/insightforge-dashboard/issues)

![GitHub last commit](https://img.shields.io/github/last-commit/YOUR_USERNAME/insightforge-dashboard?style=flat-square&color=0ea5e9)
![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/insightforge-dashboard?style=flat-square&color=0ea5e9)

</div>
_______________________________________________________________________________________________________________________________________________________


### **✨ Features**

### 📊 Dashboard & Analytics
- **6 KPI Cards** — Revenue, Profit, Orders, Users, Churn Rate, Margin
- **Interactive Charts** — Area, Bar, and Pie charts
- **KPI Detail Pages** — Full breakdown, trend analysis, export
- **Time Range Filters** — 7, 30, 90 day views
- **Category Filters** — Filter by revenue, profit, users, orders

### 🤖 AI Intelligence
- **InsightForge AI Chat** — Ask questions in natural language
- **Powered by Groq + Llama 3.1** — Ultra-fast responses
- **Context-Aware** — AI knows your exact metrics
- **Suggested Questions** — Quick-access prompts

### 🔐 Authentication
- **Google OAuth** — One-click sign in
- **Email/Password** — Traditional auth with validation
- **Forgot Password** — Email reset flow
- **Protected Routes** — Middleware-based protection

### 📁 Data Management
- **Data Sources** — Upload CSV, connect APIs
- **Reports** — Generate and download reports
- **Saved Views** — Bookmark filter combinations
- **Export CSV** — One-click export

### ⚙️ Settings
- **Profile** — Update name, synced to Supabase
- **Password** — Secure update via Supabase Auth
- **Notifications** — Toggle alerts and reports
- **Appearance** — Accent color, compact mode

### 🎨 UI/UX
- **Glassmorphism** — Frosted glass with ambient glow
- **Framer Motion** — Smooth animations
- **Skeleton Loaders** — Professional loading states
- **Dark Theme** — Mesh background design
- **Responsive** — Desktop, tablet, mobile

_______________________________________________________________________________________________________________________________________________________

### 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth + Google OAuth |
| **AI** | Groq API + Llama 3.1 |
| **Icons** | Lucide React |
| **Deployment** | Vercel |

_______________________________________________________________________________________________________________________________________________________

### 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free)
- Groq API key (free)

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/insightforge-dashboard.git
cd insightforge-dashboard

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Groq AI
GROQ_API_KEY=your-groq-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉
_______________________________________________________________________________________________________________________________________________________


### 📁 Project Structure
```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   ├── [slug]/
│   │   │   ├── data-sources/
│   │   │   ├── reports/
│   │   │   ├── saved-views/
│   │   │   └── settings/
│   │   └── page.tsx
│   ├── api/
│   │   └── ai-chat/
│   └── auth/
├── components/
│   ├── dashboard/
│   └── layout/
├── lib/
│   ├── data.ts
│   └── supabase.ts
└── data/
    └── mockData.ts
```

_______________________________________________________________________________________________________________________________________________________

### 🗄️ Supabase Setup

Create these tables in Supabase SQL editor:

```sql
create table profiles (
  id uuid references auth.users on delete cascade,
  full_name text,
  role text default 'user',
  primary key (id)
);

create table transactions (
  id text primary key,
  customer text,
  category text,
  region text,
  amount numeric,
  status text,
  created_at timestamptz default now()
);
```

Enable Row Level Security and Google OAuth in Supabase Authentication settings.
_______________________________________________________________________________________________________________________________________________________

## 📸 Screenshots

### Dashboard with KPI cards, charts, and AI insights panel
![Dashboard](<img width="1588" height="705" alt="Image" src="https://github.com/user-attachments/assets/6a05be40-5bb5-453a-be3f-24eecdba459e" />)

### KPI Detail page with trend analysis and export
![KPI Detail](<img width="1568" height="712" alt="Image" src="https://github.com/user-attachments/assets/bd2f0376-3684-4c17-98ef-32f241b09d31" />)

### AI Chat widget powered by Groq + Llama 3.1
![AI Chat](<img width="453" height="646" alt="Image" src="https://github.com/user-attachments/assets/3fe92e3a-2bef-4b25-b2b8-8baa01e9bc3c" />)

### Auth page with Google OAuth and email/password
![Auth](<img width="561" height="750" alt="Image" src="https://github.com/user-attachments/assets/faa29463-77d8-40dd-a793-b8d2fc46fc1f" />)

### Revenue Charts and Bar Section
![Charts](<img width="1536" height="875" alt="Image" src="https://github.com/user-attachments/assets/a0ac5ed4-6768-414e-baf1-f377ace6bbc7" />)

_______________________________________________________________________________________________________________________________________________________

## 🌐 Deployment

This project is deployed on **Vercel** with automatic deployments on every push to `main`.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/insightforge-dashboard)

### Deploy Your Own
1. Fork this repo
2. Import to [Vercel](https://vercel.com)
3. Add environment variables
4. Click Deploy ✅

---
## 📄 License

MIT License — feel free to use this project for your portfolio or as a base for your own dashboard.

---

<div align="center">

### Built with ❤️ by Ravi

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ravi-bist-378a48251/)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-black?style=for-the-badge&logo=github)](https://github.com/RaviBist18)

⭐ **Star this repo if you found it helpful!**

</div>


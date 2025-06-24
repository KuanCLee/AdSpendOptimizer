# 📚 Application Overview

Welcome to the **Ad Spend Optimizer** – an interactive web application designed to help you:

- 📈 **Track marketing performance**
- 💡 **Measure channel contributions**
- 🧠 **Analyze customer segmentation performance**
- 🧮 **Optimize marketing spend through simulation**

You can explore *what-if scenarios* to understand how different budget allocations across brands, categories, and channels can impact revenue or Rx generation.

## 🎯 Key Features

- **Scenario-based budget planning**: Experiment with different marketing budgets to project outcomes.
- **Spend allocation controls**: Define your own brands, categories, and channels.
- **Custom constraints**: Freeze spend for specific channels or set min/max boundaries for flexibility and control.

---
# 🚀 Run the App

Start your journey here 👉 [https://ad-spend-optimizer-git-master-kuanclees-projects.vercel.app](https://ad-spend-optimizer-git-master-kuanclees-projects.vercel.app)

> Note: Since our backend code is hosted on a free source, when you go to the Optimization page and enter the budget, please allow 1 to 2 minutes for the backend to activate the first time. After it’s successfully activated, the loading speed will be much faster within the same active session.

# 🖼️ What You’ll See

### 1. **Overview Page** – Track Marketing Performance 
![image](https://github.com/user-attachments/assets/0ff18c65-c5f8-48f0-b0d4-962ba016a9b4)

### 2. **Optimize Page** – Budget Optimization  

![image](https://github.com/user-attachments/assets/e0992f52-5d90-4d7a-b23c-cbef96ecd1db)

# 🚀 Run This App Locally (Windows)

Follow these steps to set up and run the app on your local machine using PowerShell:

---

## ✅ Step 1: Install Node.js Version Manager (`fnm`)

Use `winget` to install [Fast Node Manager (fnm)](https://github.com/Schniz/fnm):

```powershell
winget install Schniz.fnm
```

---

## ✅ Step 2: Install and Use Node.js (v22)

Use `fnm` to install and switch to Node.js version 22:

```powershell
fnm install 22
fnm use 22
```

> 💡 This ensures your app runs with the correct Node.js version.

---

## ✅ Step 3: Set Up Auto Node Version Switching

Optional, but recommended for convenience. This command enables automatic Node version switching when you `cd` into the project directory:

```powershell
fnm env --use-on-cd | Out-String | Invoke-Expression
```

> 💡 Add this line to your PowerShell profile to make it run automatically in every session.

---

## 📦 Step 4: Install Project Dependencies

Install the required packages:

```bash
npm install recharts date-fns
npm install @mui/material @emotion/react @emotion/styled
```

> 🧱 These libraries are used for charts, date handling, and Material UI styling.

---

## ▶️ Step 5: Start the App

Finally, run the app in development mode:

```bash
npm run dev
```

> 🟢 This will start your local development server, usually available at `http://localhost:5173/`.

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

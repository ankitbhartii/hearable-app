Here is a complete, production-ready `README.md` file designed to make your GitHub repository look incredibly professional to other developers, recruiters, or open-source contributors.

You can copy this entire block, paste it into a file named `README.md` in the root of your VS Code project, and push it to GitHub.

```markdown
# 🎧 Hearable

[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel)](https://hearable.co.in)
[![Next.js](https://img.shields.io/badge/Next.js-Framework-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database_&_Auth-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Media_Storage-3448C5?style=for-the-badge&logo=cloudinary)](https://cloudinary.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Styling-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

> The Next Generation of Audio Asset Management. Unapologetic layout constraints built explicitly for high-fidelity literary streaming.

🔗 **Live Production Application:** [hearable.co.in](https://www.hearable.co.in)

---

## 🚀 Overview

Hearable is a full-stack, secure audio streaming and asset management platform. Built with a custom brutalist UI, the application allows users to securely authenticate, upload, manage, and stream audiobooks globally. The architecture relies on server-side rendering, edge-network deployment, and a strict route-protection security model.

## ✨ Core Features

* **Secure Authentication:** Complete user registration and login system powered by Supabase Auth.
* **Route Protection (Digital Bouncer):** Impenetrable session-checking on all restricted routes (`/dashboard`, `/profile`, `/admin`) to immediately reject unauthenticated access.
* **Audio Asset Management:** Seamless media uploading and streaming utilizing Cloudinary's cloud infrastructure.
* **Brutalist UI/UX:** High-fidelity, unapologetic user interface built with Tailwind CSS and custom typography (Anton & Hanken Grotesk).
* **Edge Deployment:** Fully integrated CI/CD pipeline with Vercel for zero-downtime global updates.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js (App Router), React, Tailwind CSS
* **Backend / Database:** Supabase (PostgreSQL)
* **Authentication:** Supabase Auth (Session Tokens)
* **Media Storage:** Cloudinary API
* **Deployment:** Vercel

---

## 💻 Local Development

To run Hearable on your local machine, follow these steps:

### 1. Clone the repository
```bash
git clone [https://github.com/ankitbhartii/hearable-app.git](https://github.com/ankitbhartii/hearable-app.git)
cd hearable-app

```

### 2. Install dependencies

```bash
npm install

```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory and add your specific API keys. **Never commit this file to version control.**

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

```

### 4. Start the development server

```bash
npm run dev

```

Open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) with your browser to see the application running.

---

## 🔒 Security Note

All internal dashboards and administrative routes are fortified using server-side session token validation. Testing these routes in a private/incognito window without valid credentials will result in an automatic redirect to the authentication gateway.

---

## 👨‍💻 Author

**Ankit Singh** * Full-Stack Developer

* GitHub: [@ankitbhartii](https://www.google.com/search?q=https://github.com/ankitbhartii)

```

```

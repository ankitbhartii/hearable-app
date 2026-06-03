<div align="center">
  
  # 🎧 HEARABLE
  
  **The Next Generation of Audio Asset Management.**<br/>
  *Unapologetic layout constraints built explicitly for high-fidelity literary streaming.*

  <br/>

  [![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=for-the-badge&logo=vercel)](https://hearable.co.in)
  [![Next.js](https://img.shields.io/badge/Next.js-Framework-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-Database_&_Auth-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
  [![Cloudinary](https://img.shields.io/badge/Cloudinary-Media_Storage-3448C5?style=for-the-badge&logo=cloudinary)](https://cloudinary.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Styling-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

  <br/>
  
  ### 🔗 **[ENTER LIVE PLATFORM](https://www.hearable.co.in)** 🔗
  
</div>

---

## 🚀 System Architecture

Hearable is a full-stack, highly secure audio streaming and asset management platform. Built with a custom brutalist UI, the application allows users to securely authenticate, upload, manage, and stream audiobooks globally. The architecture relies on server-side rendering, edge-network deployment, and a strict route-protection security model.

## ✨ Core Integrations

* **Gateway Security:** Complete user registration and login system powered by Supabase Auth.
* **The Digital Bouncer:** Impenetrable session-checking on all restricted routes (`/dashboard`, `/profile`, `/admin`) to immediately reject unauthenticated access.
* **Asset Management:** Seamless media uploading and streaming utilizing Cloudinary's cloud infrastructure.
* **Brutalist UI/UX:** High-fidelity, unapologetic user interface built with Tailwind CSS and custom typography (Anton & Hanken Grotesk).
* **Edge Deployment:** Fully integrated CI/CD pipeline with Vercel for zero-downtime global updates.

---

## 💻 Local Developer Setup

To spin up Hearable on your local machine, run the following sequence:

### 1. Initialize Repository
```bash
git clone https://github.com/ankitbhartii/hearable-app.git
cd hearable-app
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "../utils/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Baseline validation
    if (password !== confirmPassword) {
      setError("SECURITY FAULT: PASSWORDS DO NOT MATCH.");
      return;
    }

    if (password.length < 6) {
      setError("SECURITY FAULT: PASSWORD MUST BE AT LEAST 6 CHARACTERS.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;

      // Handle email confirmation vs auto-login
      if (data?.user && data?.session === null) {
        setSuccessMsg("NODE INITIATED. CHECK YOUR EMAIL. REDIRECTING TO SIGN IN...");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        
        // Automatically route the user back to the login page after 2.5 seconds
        setTimeout(() => {
          router.push("/auth");
        }, 2500);

      } else {
        setSuccessMsg("ACCOUNT SECURED. REDIRECTING TO DASHBOARD...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      }
    } catch (err) {
      console.error("Registration fault:", err);
      setError(err.message?.toUpperCase() || "REGISTRATION REJECTED BY SYSTEM.");
    } finally {
      setIsLoading(false);
    }
  };

  // Content fade-in animation using your custom cubic bezier curves
  const contentVariants = {
    hidden: { opacity: 0, x: 30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { ease: [0.16, 1, 0.3, 1], duration: 0.8, delay: 0.2 },
    },
  };

  // Core background light line loops
  const lineLoopVariants = (duration, delay, yPos) => ({
    animate: {
      x: ["-100%", "100%"],
      opacity: [0, 1, 1, 0],
      transition: {
        duration: duration,
        delay: delay,
        repeat: Infinity,
        ease: "linear",
      },
    },
  });

  return (
    <div className="min-h-screen bg-[#050404] flex flex-col md:flex-row font-['Hanken_Grotesk'] selection:bg-[#E50914] selection:text-white overflow-hidden relative">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@500;700;900&display=swap');
      `}</style>

      {/* ================= LEFT SIDE: CINEMATIC AMBIENT LOOPER ================= */}
      <div className="w-full md:w-1/2 bg-black relative overflow-hidden flex flex-col justify-between p-12 lg:p-20 border-b md:border-b-0 md:border-r border-white/5">
        
        {/* Continuous Streaming Ambient Light Streaks */}
        <div className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
          {[
            { d: 4, delay: 0, y: "30%", h: "2px", rot: -12, bg: "linear-gradient(90deg, transparent, #E50914, transparent)" },
            { d: 5, delay: 1.5, y: "55%", h: "3px", rot: 6, bg: "linear-gradient(90deg, transparent, #FF3E4D, transparent)" },
            { d: 3.5, delay: 0.8, y: "42%", h: "1.5px", rot: -3, bg: "linear-gradient(90deg, transparent, #B81D24, transparent)" },
            { d: 6, delay: 2.2, y: "70%", h: "4px", rot: 15, bg: "linear-gradient(90deg, transparent, #E50914, transparent)" },
          ].map((line, i) => (
            <motion.div
              key={i}
              variants={lineLoopVariants(line.d, line.delay, line.y)}
              animate="animate"
              style={{
                top: line.y,
                height: line.h,
                background: line.bg,
                transformOrigin: "center",
                boxShadow: "0 0 20px #E50914, 0 0 8px #B81D24",
                rotateZ: line.rot,
              }}
              className="absolute w-[200%]"
            />
          ))}
          {/* Radial ambient vignette to contain the line glow fields */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#000000_90%)]" />
        </div>

        {/* Global Nav Branding Header */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="text-[#E50914] text-4xl font-bold drop-shadow-[0_0_15px_rgba(229,9,20,0.5)]">🎧</span>
          <span className="text-white font-['Anton'] text-3xl tracking-wider">HEARABLE</span>
        </div>

        {/* Hero Copy Presentation */}
        <div className="relative z-10 mt-20 mb-auto">
          <h1 className="font-['Anton'] text-[6rem] lg:text-[7.5rem] uppercase tracking-tighter text-white leading-[0.85] flex flex-col">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-neutral-500">NEW</span>
            <span className="text-[#E50914] drop-shadow-[0_0_30px_rgba(229,9,20,0.3)]">NODE</span>
          </h1>
          <p className="mt-8 font-bold text-sm text-neutral-400 uppercase tracking-widest max-w-sm leading-relaxed border-l-2 border-[#E50914] pl-4">
            Initialize your profile to gain encrypted access to the global streaming repository.
          </p>
        </div>

        <div className="relative z-10 font-bold text-xs text-neutral-600 uppercase tracking-widest mt-12">
          HEARABLE GATEWAY SYSTEM // VER V2.026
        </div>
      </div>

      {/* ================= RIGHT SIDE: INDUSTRIAL ACCESS CONTROLS ================= */}
      <motion.div 
        variants={contentVariants}
        initial="hidden"
        visible="visible"
        animate="visible"
        className="w-full md:w-1/2 bg-[#050404] flex flex-col justify-center p-12 lg:p-24 relative z-10"
      >
        <div className="max-w-md w-full mx-auto">
          <h2 className="font-['Anton'] text-6xl uppercase tracking-tighter text-white leading-none mb-2">
            REGISTRATION
          </h2>
          <div className="flex justify-between items-center border-b-2 border-neutral-800 pb-4 mb-8">
            <p className="font-bold text-[10px] sm:text-xs text-neutral-500 uppercase tracking-widest">
              SECURE A NEW PERSONAL AUDIOBOOK SHELF
            </p>
            <span className="font-bold text-xs text-[#E50914] ml-2 tracking-wider">[AUTH_02]</span>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <p className="text-white font-bold text-sm bg-[#E50914]/20 p-4 uppercase border-l-4 border-[#E50914] tracking-wide">
                {error}
              </p>
            )}
            {successMsg && (
              <p className="text-neutral-300 font-bold text-sm bg-white/5 p-4 uppercase border-l-4 border-white/40 tracking-wide">
                {successMsg}
              </p>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="font-bold text-xs text-neutral-400 uppercase tracking-widest">
                EMAIL ADDRESS FIELD
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="YOUR.NAME@EMAIL.COM"
                className="w-full p-4 border-2 border-neutral-800 bg-black text-white font-bold placeholder-neutral-700 focus:outline-none focus:ring-0 focus:border-[#E50914] transition-colors rounded-none"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="font-bold text-xs text-neutral-400 uppercase tracking-widest">
                SECURE CODE PASSWORD
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full p-4 border-2 border-neutral-800 bg-black text-white font-bold placeholder-neutral-700 focus:outline-none focus:ring-0 focus:border-[#E50914] transition-colors rounded-none"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="font-bold text-xs text-neutral-400 uppercase tracking-widest">
                VERIFY SECURE CODE
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full p-4 border-2 border-neutral-800 bg-black text-white font-bold placeholder-neutral-700 focus:outline-none focus:ring-0 focus:border-[#E50914] transition-colors rounded-none"
                required
              />
            </div>

            {/* Custom Industrial Action Trigger */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full bg-[#E50914] text-white font-['Anton'] text-2xl py-5 mt-4 overflow-hidden transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              <span className="relative z-10 flex items-center justify-center gap-2 group-hover:-translate-y-[150%] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] tracking-wider">
                {isLoading ? "PROCESSING..." : "INITIALIZE ACCOUNT →"}
              </span>
              <span className="absolute inset-0 bg-white text-black flex items-center justify-center gap-2 z-10 translate-y-[150%] group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] tracking-wider">
                {isLoading ? "PROCESSING..." : "INITIALIZE ACCOUNT →"}
              </span>
            </button>
          </form>

          <div className="mt-10 text-center border-t border-neutral-900 pt-8">
            <Link href="/auth" className="font-bold text-sm text-neutral-500 uppercase tracking-widest hover:text-[#E50914] transition-colors">
              ALREADY HAVE AN ACCOUNT? <span className="text-white underline decoration-[#E50914] underline-offset-4 ml-1">SIGN IN</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
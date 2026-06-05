"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [animationStage, setAnimationStage] = useState("intro"); // intro -> portal

  useEffect(() => {
    // Stage transition timeline matching Netflix's sonic/visual cue length
    const timer = setTimeout(() => {
      setAnimationStage("portal");
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  // 1. Text Expansion & Flash (Netflix Iconics)
  const logoVariants = {
    hidden: { scale: 0.8, filter: "blur(10px)", opacity: 0 },
    animate: {
      scale: [0.8, 1.05, 1.4],
      filter: ["blur(10px)", "blur(0px)", "blur(4px)"],
      opacity: [0, 1, 1, 0],
      transition: {
        duration: 2.5,
        times: [0, 0.2, 0.8, 1],
        ease: [0.25, 1, 0.5, 1],
      },
    },
  };

  // 2. Light Streaks Passing the Camera Plane (Z-Axis Distortion)
  const streakVariants = (delay, duration, yPos, rotateZ) => ({
    hidden: { opacity: 0, scaleZ: 0, z: -400, x: "-50%" },
    animate: {
      opacity: [0, 1, 1, 0],
      z: [-400, 200],
      scaleZ: [0.5, 3, 1],
      transition: {
        duration: duration,
        delay: delay,
        times: [0, 0.2, 0.7, 1],
        ease: [0.4, 0, 0.2, 1],
        repeat: 0,
      },
    },
  });

  return (
    <div className="relative min-h-screen bg-[#050404] flex flex-col items-center justify-center p-6 overflow-hidden font-['Hanken_Grotesk'] selection:bg-[#E50914] selection:text-white">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@500;700;900&display=swap');
        
        /* 3D Warp Field Setup */
        .perspective-tunnel {
          perspective: 300px;
          perspective-origin: 50% 50%;
          transform-style: preserve-3d;
        }
      `}</style>

      {/* ================= STAGE 1: THE NETFLIX CINEMATIC BEAM OVERLAY ================= */}
      {animationStage === "intro" && (
        <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden z-50">
          
          {/* 3D Warp Field Tunnel */}
          <div className="perspective-tunnel absolute inset-0 w-full h-full pointer-events-none">
            {/* Array of streaming neon laser lines tracking past coordinate boundaries */}
            {[
              { delay: 0.1, duration: 1.8, y: "45%", rot: -5, h: "2px", bg: "linear-gradient(90deg, transparent, #E50914, transparent)" },
              { delay: 0.3, duration: 1.5, y: "52%", rot: 8, h: "3px", bg: "linear-gradient(90deg, transparent, #FF3E4D, transparent)" },
              { delay: 0.0, duration: 2.2, y: "38%", rot: -15, h: "1.5px", bg: "linear-gradient(90deg, transparent, #E50914, #B81D24)" },
              { delay: 0.5, duration: 1.4, y: "60%", rot: 12, h: "4px", bg: "linear-gradient(90deg, transparent, #FF1E27, transparent)" },
              { delay: 0.2, duration: 1.9, y: "49%", rot: -2, h: "2.5px", bg: "linear-gradient(90deg, transparent, #B81D24, transparent)" },
            ].map((streak, index) => (
              <motion.div
                key={index}
                variants={streakVariants(streak.delay, streak.duration, streak.y, streak.rot)}
                initial="hidden"
                animate="animate"
                style={{
                  top: streak.y,
                  height: streak.h,
                  background: streak.bg,
                  left: "50%",
                  transformOrigin: "center",
                  boxShadow: "0 0 25px #E50914, 0 0 10px #B81D24",
                  rotateZ: streak.rot,
                }}
                className="absolute w-[200%] transform -translate-x-1/2"
              />
            ))}
          </div>

          {/* Central Logo Expanding and Fading into Light */}
          <motion.h1
            variants={logoVariants}
            initial="hidden"
            animate="animate"
            className="font-['Anton'] text-[5.5rem] sm:text-[8rem] md:text-[11rem] uppercase tracking-tighter text-[#E50914] leading-none z-10 select-none transform-gpu"
            style={{
              textShadow: "0 0 35px rgba(229, 9, 20, 0.6), 0 0 70px rgba(184, 29, 36, 0.4)",
              letterSpacing: "-0.04em"
            }}
          >
            HEARABLE
          </motion.h1>

          {/* Vignette ambient pulse shadow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.9)_100%)] pointer-events-none" />
        </div>
      )}

      {/* ================= STAGE 2: THE MAIN INTERACTIVE ROUTING GATEWAY ================= */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center text-center space-y-12">
        {/* Soft atmospheric red glow residual left behind */}
        <div className="absolute top-[20%] w-[40vw] h-[40vw] rounded-full bg-[#E50914]/10 blur-[150px] pointer-events-none z-0" />

        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={animationStage === "portal" ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="font-['Anton'] text-[4.5rem] md:text-[8.5rem] uppercase tracking-tighter text-white leading-[0.85] flex flex-col items-center"
        >
          <span className="text-[#878382] text-2xl font-['Hanken_Grotesk'] font-black tracking-widest mb-6 uppercase">
            ENTER THE SONIC EXPERIENCE
          </span>
          HEARABLE
        </motion.h1>

        {/* Wero-style Interactive Split Action Pill Options */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={animationStage === "portal" ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.2, type: "spring", damping: 15 }}
          className="flex flex-col sm:flex-row gap-6 mt-12 z-10"
        >
          <Link href="/auth" className="group relative flex items-center justify-center bg-white text-black font-bold text-xl md:text-2xl px-12 py-6 rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.05)]">
            <span className="relative z-10 group-hover:-translate-y-[150%] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">I'm a Listener</span>
            <span className="absolute inset-0 flex items-center justify-center z-10 translate-y-[150%] group-hover:translate-y-0 text-white bg-[#E50914] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">I'm a Listener</span>
          </Link>

          <Link href="/auth" className="group relative flex items-center justify-center bg-transparent text-white border-[3px] border-white/20 font-bold text-xl md:text-2xl px-12 py-6 rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95 hover:border-white">
            <span className="relative z-10 group-hover:-translate-y-[150%] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">I'm a Creator</span>
            <span className="absolute inset-0 flex items-center justify-center z-10 translate-y-[150%] group-hover:translate-y-0 text-black bg-white transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">I'm a Creator</span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
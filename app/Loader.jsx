"use client";

import { motion } from "framer-motion";

export default function Loader() {
  // Netflix-style perspective text warp physics
  const logoVariants = {
    hidden: { scale: 0.85, filter: "blur(8px)", opacity: 0 },
    animate: {
      scale: [0.85, 1.03, 1.15],
      filter: ["blur(8px)", "blur(0px)", "blur(2px)"],
      opacity: [0, 1, 1],
      transition: {
        duration: 1.8,
        repeat: Infinity,
        repeatType: "reverse",
        ease: [0.25, 1, 0.5, 1],
      },
    },
  };

  // Coordinated breathing ambient light glow background
  const glowVariants = {
    animate: {
      opacity: [0.2, 0.4, 0.2],
      scale: [1, 1.1, 1],
      transition: {
        duration: 1.8,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-[#141414] flex flex-col items-center justify-center overflow-hidden z-[9999] select-none pointer-events-none">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');
      `}</style>

      {/* Residual Neon Red Ambient Light Fields */}
      <motion.div
        variants={glowVariants}
        animate="animate"
        className="absolute w-[45vw] h-[45vw] md:w-[25vw] md:h-[25vw] rounded-full bg-[#E50914]/15 blur-[100px] pointer-events-none z-0"
      />

      {/* Core Lettermark Scaling Grid */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <motion.h1
          variants={logoVariants}
          initial="hidden"
          animate="animate"
          className="font-['Anton'] text-[4rem] sm:text-[5.5rem] md:text-[7rem] uppercase tracking-tighter text-[#E50914] leading-none transform-gpu"
          style={{
            textShadow: "0 0 30px rgba(229, 9, 20, 0.55), 0 0 60px rgba(184, 29, 36, 0.3)",
            letterSpacing: "-0.04em",
          }}
        >
          HEARABLE
        </motion.h1>
        
        {/* Minimalist sub-indicator tracking track */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="text-[10px] text-neutral-500 font-bold uppercase tracking-[0.3em] mt-4 pl-[0.3em]"
        >
          STREAMING DATA VAULT
        </motion.div>
      </div>

      {/* Peripheral Vignette Masking Scrim */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(5,4,4,0.95)_100%)] pointer-events-none" />
    </div>
  );
}
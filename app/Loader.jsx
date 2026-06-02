'use client'

import React from 'react'

export default function Loader() {
  return (
    <div className="flex justify-center items-center w-full h-full min-h-[200px] select-none">
      <div className="loader">
        <div className="circle" />
        <div className="circle" />
        <div className="circle" />
        <div className="circle" />
      </div>

      <style jsx>{`
        .loader {
          --dim: 3rem;
          width: var(--dim);
          height: var(--dim);
          position: relative;
          animation: spin988 2s linear infinite;
        }

        .loader .circle {
          /* Premium Amber-500 matching your Audible dashboard colors */
          --color: #f59e0b;
          --dim: 1.2rem;
          width: var(--dim);
          height: var(--dim);
          background-color: var(--color);
          border-radius: 50%;
          position: absolute;
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.3);
        }

        .loader .circle:nth-child(1) {
          top: 0;
          left: 0;
        }

        .loader .circle:nth-child(2) {
          top: 0;
          right: 0;
        }

        .loader .circle:nth-child(3) {
          bottom: 0;
          left: 0;
        }

        .loader .circle:nth-child(4) {
          bottom: 0;
          right: 0;
        }

        @keyframes spin988 {
          0% {
            transform: scale(1) rotate(0);
          }

          20%, 25% {
            transform: scale(1.3) rotate(90deg);
          }

          45%, 50% {
            transform: scale(1) rotate(180deg);
          }

          70%, 75% {
            transform: scale(1.3) rotate(270deg);
          }

          95%, 100% {
            transform: scale(1) rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
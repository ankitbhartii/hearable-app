import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#050404] flex flex-col items-center justify-center p-6 text-white font-['Hanken_Grotesk'] selection:bg-[#FEBB0F] selection:text-[#050404]">
       <style justify global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@500;600;700;800;900&display=swap');
      `}</style>
      
      <div className="max-w-4xl w-full flex flex-col items-center text-center space-y-8">
        <h1 className="font-['Anton'] text-7xl md:text-9xl uppercase tracking-tighter text-white leading-none">
          HEARABLE
        </h1>
        
        <p className="font-bold text-lg md:text-2xl text-[#878382] uppercase tracking-widest max-w-2xl border-y-4 border-[#333] py-4">
          The Next Generation of Audio Asset Management.
        </p>
        
        <Link 
          href="/auth" 
          className="bg-[#FEBB0F] text-[#050404] font-['Anton'] text-3xl md:text-4xl px-12 py-6 uppercase tracking-wider hover:bg-white transition-colors duration-200 border-4 border-transparent hover:border-[#050404] rounded-[0.25rem] mt-8 inline-block"
        >
          Enter Platform
        </Link>
      </div>
    </div>
  )
}
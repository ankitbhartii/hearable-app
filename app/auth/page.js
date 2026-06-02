'use client'

import { useState } from 'react'
import { createClient } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Headphones, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function AuthPage() {
  const supabase = createClient()
  const router = useRouter()

  // Mode and Data States
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // Status States
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [isError, setIsError] = useState(false)

  // Auth Submission Pipeline
  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setIsError(false)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        setMessage('REGISTRATION SUCCESSFUL. CHECK YOUR EMAIL FOR Verification LINK.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      console.error('Authentication gate break:', error)
      setIsError(true)
      setMessage(error.message?.toUpperCase() || 'AUTHENTICATION ERROR.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FEBB0F] text-[#050404] font-['Hanken_Grotesk'] antialiased flex flex-col md:flex-row select-none overflow-x-hidden">
      
      {/* Google Web Font Injector */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@500;700;800;900&display=swap');
      `}</style>

      {/* Left Column: Massive Editorial Branding Poster Panel */}
      <div className="w-full md:w-[55%] bg-[#050404] text-white p-8 md:p-16 flex flex-col justify-between border-b-8 md:border-b-0 md:border-r-8 border-[#050404] relative overflow-hidden">
        {/* Background Raw Abstract Tonal Block */}
        <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-[#B70504] rounded-none rotate-12 opacity-40 pointer-events-none" />
        
        <div className="flex items-center gap-2 z-10">
          <Headphones className="h-8 w-8 text-[#FEBB0F] stroke-[3]" />
          <span className="font-['Anton'] text-3xl uppercase tracking-wider text-white">HEARABLE</span>
        </div>

        <div className="my-auto pt-16 pb-8 space-y-4 z-10">
          <h1 className="font-['Anton'] text-7xl lg:text-9xl uppercase tracking-tighter leading-[0.85] text-white">
            SONIC<br />IMPACT
          </h1>
          <p className="font-['Hanken_Grotesk'] font-extrabold text-lg lg:text-xl text-[#FEBB0F] uppercase tracking-wide max-w-md">
            Unapologetic layout constraints built explicitly for high-fidelity literary streaming.
          </p>
        </div>

        <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest z-10">
          HEARABLE GATEWAY SYSTEM // VER v2.026
        </div>
      </div>

      {/* Right Column: In-Your-Face Stark Form Workspace */}
      <div className="w-full md:w-[45%] bg-[#f9f9f9] p-8 md:p-16 flex flex-col justify-center relative">
        
        <div className="w-full max-w-md mx-auto space-y-8">
          
          {/* Form Header Segment */}
          <div className="space-y-2 border-b-4 border-[#050404] pb-4 relative">
            <h2 className="font-['Anton'] text-5xl uppercase tracking-tight text-[#050404] leading-none">
              {isSignUp ? 'CREATE ACCOUNT' : 'USER ACCESS'}
            </h2>
            <p className="font-['Hanken_Grotesk'] font-extrabold text-xs text-zinc-500 uppercase tracking-widest">
              {isSignUp ? 'Register credentials to build your workspace library' : 'Sign in to access your secure audiobook shelves'}
            </p>
            <span className="absolute bottom-1 right-0 font-mono text-xs font-black text-[#B70504]">
              {isSignUp ? '[REG_02]' : '[AUTH_01]'}
            </span>
          </div>

          {/* Dynamic Banner Notification Alerts */}
          {message && (
            <div className={`p-4 border-4 border-[#050404] text-xs font-black uppercase tracking-wider rounded-[0.125rem] ${
              isError ? 'bg-[#B70504] text-white' : 'bg-[#FEBB0F] text-[#050404]'
            }`}>
              {message}
            </div>
          )}

          {/* Input Submission Terminal Form */}
          <form onSubmit={handleAuth} className="space-y-6">
            
            {/* Email Input Field Box */}
            <div className="space-y-2">
              <label className="block font-['Hanken_Grotesk'] font-black text-xs uppercase tracking-widest text-[#050404]">
                Email Address Field
              </label>
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="YOUR.NAME@EMAIL.COM"
                className="w-full bg-[#f3f3f4] border-4 border-[#050404] px-4 py-3 font-['Hanken_Grotesk'] font-bold text-[#050404] placeholder-zinc-400 outline-none focus:bg-white rounded-[0.25rem] transition-colors"
              />
            </div>

            {/* Password Input Field Box */}
            <div className="space-y-2">
              <label className="block font-['Hanken_Grotesk'] font-black text-xs uppercase tracking-widest text-[#050404]">
                Secure Code Password
              </label>
              <div className="relative w-full">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#f3f3f4] border-4 border-[#050404] pl-4 pr-12 py-3 font-['Hanken_Grotesk'] font-bold text-[#050404] placeholder-zinc-400 outline-none focus:bg-white rounded-[0.25rem] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#050404] p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5 stroke-[2.5]" /> : <Eye className="w-5 h-5 stroke-[2.5]" />}
                </button>
              </div>
            </div>

            {/* In-Your-Face Flat Submission Block Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#050404] text-white border-4 border-[#050404] font-['Hanken_Grotesk'] font-black text-sm uppercase tracking-widest py-4 rounded-[0.25rem] flex items-center justify-center gap-2 transition-colors hover:bg-[#B70504] hover:border-[#B70504] disabled:opacity-50"
            >
              <span>{loading ? 'PROCESSING STREAM...' : isSignUp ? 'EXECUTE REGISTER' : 'AUTHORIZE LOGIN'}</span>
              {!loading && <ArrowRight className="w-4 h-4 stroke-[3]" />}
            </button>

          </form>

          {/* Flat Mode Toggle Bridge Link */}
          <div className="pt-4 border-t border-[#eeeeee] text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setMessage(null)
              }}
              className="font-['Hanken_Grotesk'] font-extrabold text-sm uppercase tracking-wide text-[#B70504] hover:text-[#050404] border-b-2 border-transparent hover:border-[#050404] pb-0.5 transition-all"
            >
              {isSignUp ? 'Already registered? Log in here' : "Don't have an account? Create one"}
            </button>
          </div>

        </div>

      </div>

    </div>
  )
}
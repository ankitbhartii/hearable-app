'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, PlusCircle, Link2 } from 'lucide-react'

export default function AdminConsole() {
  const supabase = createClient()
  const router = useRouter()

  // Form State Definitions
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [narrator, setNarrator] = useState('')
  const [duration, setDuration] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [audioUrl, setAudioUrl] = useState('') 
  const [genreSlug, setGenreSlug] = useState('sci-fi-fantasy')
  const [description, setDescription] = useState('')

  // UI Status State Engine
  const [publishing, setPublishing] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [isError, setIsError] = useState(false)

  // Enforce Route Authentication Guards Natively
  useEffect(() => {
    async function checkAdminAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth')
      }
    }
    checkAdminAuth()
  }, [router, supabase])

  // Submit Handler Database Insert Pipeline
  const handlePublish = async (e) => {
    e.preventDefault()
    
    if (!audioUrl.trim()) {
      setIsError(true)
      setStatusMessage('CRITICAL NULL URL: PLEASE PROVIDE A VALID STREAMING LINK.')
      return
    }

    setPublishing(true)
    setStatusMessage(null)
    setIsError(false)

    try {
      setStatusMessage('PROCESSING MEDIA LINK...')
      
      // 1. Google Drive Link Conversion Engine
      let finalAudioUrl = audioUrl.trim()
      if (finalAudioUrl.includes('drive.google.com/file/d/')) {
        const fileId = finalAudioUrl.split('/d/')[1]?.split('/')[0]
        if (fileId) {
          finalAudioUrl = `https://docs.google.com/uc?export=download&id=${fileId}`
        }
      }

      setStatusMessage('COMMITTING TO AUDIOBOOKS TABLE...')

      // 🌟 THE BULLETPROOF PAYLOAD 🌟
      // We are ONLY sending the exact columns visible in your SQL schema.
      // Genre, duration, and description are kept in the UI but ignored in the database push.
      const payload = {
        title: title.trim(),
        author: author.trim(),
        narrator: narrator.trim() || null,
        cover_url: coverUrl.trim() || null,
        audio_url: finalAudioUrl
      }

      const { error: insertError } = await supabase.from('audiobooks').insert([payload])

      if (insertError) throw insertError

      setIsError(false)
      setStatusMessage('SUCCESS: AUDIOBOOK METADATA SUCCESSFULLY PUBLISHED TO CATALOG.')
      
      // Flush fields
      setTitle('')
      setAuthor('')
      setNarrator('')
      setDuration('')
      setCoverUrl('')
      setAudioUrl('')
      setDescription('')

    } catch (err) {
      const safeErrorText = err?.message || err?.details || err?.hint || (typeof err === 'object' ? JSON.stringify(err) : String(err))
      console.warn('Extracted Database Rejection:', safeErrorText)
      
      setIsError(true)
      setStatusMessage(`REJECTION: ${safeErrorText.toUpperCase()}`)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#050404] font-['Hanken_Grotesk'] antialiased pb-24 select-none">
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@500;700;800;900&display=swap');
      `}</style>

      {/* Top Stark Navigation Header Strip */}
      <header className="border-b-4 border-[#050404] bg-[#FEBB0F] px-6 py-6 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <h1 className="font-['Anton'] text-4xl uppercase tracking-tighter text-[#050404] leading-none">
            DEV_CONTROL_PANEL
          </h1>
          <span className="font-mono text-xs font-black bg-[#050404] text-white px-2 py-0.5 rounded-[0.125rem]">
            V2.026
          </span>
        </div>
        
        <button 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-white border-4 border-[#050404] px-4 py-2.5 rounded-[0.125rem] hover:bg-[#050404] hover:text-white transition-colors"
        >
          <LayoutDashboard className="h-4 w-4 stroke-[3]" />
          Return to Dashboard
        </button>
      </header>

      {/* Main Form Content Layout Area */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        
        <div className="bg-white border-4 border-[#050404] p-6 md:p-10 rounded-[0.25rem] space-y-8">
          
          <div className="border-b-4 border-[#050404] pb-3 flex items-center gap-2">
            <PlusCircle className="h-6 w-6 text-[#B70504] stroke-[3]" />
            <h2 className="font-['Anton'] text-3xl uppercase tracking-tight text-[#050404] leading-none">
              Upload New Audiobook Asset
            </h2>
          </div>

          {/* Dynamic Action Response Banner */}
          {statusMessage && (
            <div className={`p-4 border-4 border-[#050404] text-xs font-black uppercase tracking-wider rounded-[0.125rem] whitespace-normal break-words ${
              isError ? 'bg-[#B70504] text-white' : 'bg-[#FEBB0F] text-[#050404]'
            }`}>
              {statusMessage}
            </div>
          )}

          {/* Form UI Layout Structure */}
          <form onSubmit={handlePublish} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block font-black text-xs uppercase tracking-widest text-[#050404]">Book Title Field *</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.G., THE DIGITAL FRONTIER" className="w-full bg-[#f3f3f4] border-4 border-[#050404] px-4 py-3 font-bold text-[#050404] outline-none focus:bg-white rounded-[0.25rem] transition-colors" />
              </div>

              <div className="space-y-2">
                <label className="block font-black text-xs uppercase tracking-widest text-[#050404]">Author Name Field *</label>
                <input type="text" required value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="E.G., ANKIT SINGH" className="w-full bg-[#f3f3f4] border-4 border-[#050404] px-4 py-3 font-bold text-[#050404] outline-none focus:bg-white rounded-[0.25rem] transition-colors" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block font-black text-xs uppercase tracking-widest text-[#050404]">Narrator Voice Engine Specification</label>
                <input type="text" value={narrator} onChange={(e) => setNarrator(e.target.value)} placeholder="E.G., ECHO VOICE V2 (OPTIONAL)" className="w-full bg-[#f3f3f4] border-4 border-[#050404] px-4 py-3 font-bold text-[#050404] outline-none focus:bg-white rounded-[0.25rem] transition-colors" />
              </div>

              <div className="space-y-2">
                <label className="block font-black text-xs uppercase tracking-widest text-[#050404]">Audiobook Total Duration Runtime</label>
                <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="E.G., 5H 45M (UI ONLY)" className="w-full bg-[#f3f3f4] border-4 border-[#050404] px-4 py-3 font-bold text-[#050404] outline-none focus:bg-white rounded-[0.25rem] transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-black text-xs uppercase tracking-widest text-[#050404]">Cover Image External Destination URL</label>
              <input type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="HTTPS://IMAGES.UNSPLASH.COM/PHOTO-... (OPTIONAL)" className="w-full bg-[#f3f3f4] border-4 border-[#050404] px-4 py-3 font-bold text-[#050404] outline-none focus:bg-white rounded-[0.25rem] transition-colors" />
            </div>

            <div className="space-y-2">
              <label className="block font-black text-xs uppercase tracking-widest text-[#050404]">Google Drive / Direct streaming Audio Link *</label>
              <div className="relative flex items-center">
                <Link2 className="absolute left-4 h-5 w-5 text-zinc-400 pointer-events-none z-10 stroke-[2.5]" />
                <input type="url" required value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="PASTE HTTPS://DRIVE.GOOGLE.COM/... HERE" className="w-full bg-[#f3f3f4] border-4 border-[#050404] pl-12 pr-4 py-3 font-bold text-[#050404] outline-none focus:bg-white rounded-[0.25rem] transition-colors font-mono text-xs" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-black text-xs uppercase tracking-widest text-[#050404]">Target Category Genre Mapping</label>
              <div className="relative">
                <select value={genreSlug} onChange={(e) => setGenreSlug(e.target.value)} className="w-full bg-[#f3f3f4] border-4 border-[#050404] px-4 py-3 font-bold text-[#050404] outline-none focus:bg-white rounded-[0.25rem] appearance-none cursor-pointer">
                  <option value="sci-fi-fantasy">Sci-Fi & Fantasy</option>
                  <option value="biographies-memoirs">Biographies & Memoirs</option>
                  <option value="children">Children</option>
                  <option value="business-money">Business & Money</option>
                  <option value="self-development">Self-Development</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#050404]">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-black text-xs uppercase tracking-widest text-[#050404]">Book Summary / Structural Description</label>
              <textarea rows="4" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="PROVIDE A BRIEF NARRATIVE SUMMARY (UI ONLY)" className="w-full bg-[#f3f3f4] border-4 border-[#050404] px-4 py-3 font-bold text-[#050404] outline-none focus:bg-white rounded-[0.25rem] resize-none transition-colors" />
            </div>

            <button type="submit" disabled={publishing} className="w-full bg-[#B70504] hover:bg-[#050404] text-white border-4 border-[#050404] font-['Hanken_Grotesk'] font-black text-sm uppercase tracking-widest py-4 rounded-[0.25rem] flex items-center justify-center gap-2 transition-colors disabled:opacity-40">
              <span>{publishing ? 'COMMITTING DATA SEGMENT...' : 'Publish Audiobook to Catalog'}</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
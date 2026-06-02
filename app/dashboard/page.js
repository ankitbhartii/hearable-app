'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '../utils/supabase/client'
import { LogOut, ArrowRight, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Loader from '../Loader'

export default function Dashboard() {
  const supabase = createClient()
  const router = useRouter()

  // App Core State Management
  const [audiobooks, setAudiobooks] = useState([])
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorDebug, setErrorDebug] = useState(null)
  
  // Immersive Editorial Player Control Pipeline States
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false)
  
  // Custom Hard-Flat Media Control States
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [durationSec, setDurationSec] = useState(0)

  // Combined Authentication Guard and Data Fetching Loop
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        
        if (authError || !session) {
          router.push('/auth')
          return
        }

        const { data: genresData, error: genreErr } = await supabase.from('genres').select('*')
        if (genreErr) throw genreErr
        setGenres(genresData || [])

        const { data: booksData, error: bookErr } = await supabase.from('audiobooks').select('*')
        if (bookErr) throw bookErr
        setAudiobooks(booksData || [])

      } catch (error) {
        console.error('Database system failure:', error)
        setErrorDebug(error?.message || String(error))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router, supabase])

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDurationSec(audioRef.current.duration)
  }

  const togglePlayPause = (e) => {
    e.stopPropagation()
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  useEffect(() => {
    if (currentTrack) setIsPlaying(true)
  }, [currentTrack])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.refresh()
      router.push('/auth')
    } catch (err) {
      console.error('Logout script execution break:', err)
    }
  }

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00'
    const minutes = Math.floor(secs / 60)
    const seconds = Math.floor(secs % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-6">
        <Loader />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c] font-['Hanken_Grotesk'] antialiased pb-40 select-none">
      
      {/* Google Web Font Layout Loader Engine */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@500;600;700;800;900&display=swap');
        
        /* Custom ranges layout clean overrides */
        .thick-scrubber::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #050404;
          border: 3px solid #ffffff;
          cursor: pointer;
          transition: transform 0.1s ease-in-out;
        }
        .thick-scrubber::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Primary Stark Header Strip */}
      <header className="border-b-4 border-[#050404] bg-[#f9f9f9] sticky top-0 z-40 px-6 py-6 flex justify-between items-center">
        <h1 className="font-['Anton'] text-4xl uppercase tracking-tighter text-[#050404] leading-none">
          HEARABLE <span className="text-xs font-['Hanken_Grotesk'] font-black bg-[#050404] text-white px-2 py-0.5 ml-1 vertical-middle rounded-[0.125rem]">EDITION 2026</span>
        </h1>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/admin')}
            className="text-xs font-black uppercase tracking-wider bg-[#FEBB0F] border-2 border-[#050404] px-4 py-2 text-[#050404] rounded-[0.125rem] hover:bg-[#050404] hover:text-white transition-colors"
          >
            Upload Console
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 font-black text-xs uppercase tracking-widest text-[#1a1c1c] hover:text-[#B70504]"
          >
            <LogOut className="h-4 w-4 stroke-[3]" />
            Exit
          </button>
        </div>
      </header>

      {/* Error Boundary Output Display Component */}
      {errorDebug && (
        <div className="m-6 p-4 bg-[#B70504] border-4 border-[#050404] text-white text-sm font-black uppercase tracking-wide">
          SYSTEM ERROR ERROR: {errorDebug}
        </div>
      )}

      {/* Main Container Layout Body */}
      <main className="px-6 py-12 space-y-20">
        
        {genres.map((genre) => {
          const structuralRowBooks = audiobooks.filter(book => book.genre_slug === genre.slug)
          if (structuralRowBooks.length === 0) return null

          return (
            <section key={genre.id} className="space-y-6 relative">
              
              {/* Row Header with Super-script Count Identifier */}
              <div className="border-b-4 border-[#050404] pb-2 flex items-baseline gap-3">
                <h2 className="font-['Anton'] text-5xl uppercase tracking-tight text-[#050404] leading-none">
                  {genre.name}
                </h2>
                <span className="font-['Hanken_Grotesk'] text-lg font-black tracking-tighter text-[#B70504]">
                  /{structuralRowBooks.length.toString().padStart(2, '0')}
                </span>
              </div>

              {/* Horizontal Flex Grid Flow container */}
              <div className="flex gap-8 overflow-x-auto pb-4 pt-2 snap-x scroll-smooth no-scrollbar">
                {structuralRowBooks.map((book) => (
                  <div 
                    key={book.id} 
                    className="w-[200px] sm:w-[240px] flex-shrink-0 snap-start bg-white border-4 border-[#050404] p-4 relative group flex flex-col justify-between hover:bg-[#FEBB0F] transition-colors duration-200 rounded-[0.25rem]"
                  >
                    {/* Hard Full-Bleed Artwork container */}
                    <div className="relative aspect-square w-full bg-[#dadada] border-2 border-[#050404] overflow-hidden rounded-[0.5rem]">
                      <img 
                        src={book.cover_url} 
                        alt={book.title}
                        className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all duration-300"
                      />
                      {/* Heavy Glyph Hover Overlay Layout */}
                      <div className="absolute inset-0 bg-[#B70504]/90 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <button 
                          onClick={() => setCurrentTrack(book)}
                          className="bg-white border-4 border-[#050404] text-[#050404] p-4 rounded-full font-black transform hover:scale-110 transition-transform"
                        >
                          <Play className="h-6 w-6 fill-current" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Typography Strings */}
                    <div className="pt-4 space-y-1 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-['Hanken_Grotesk'] font-extrabold text-lg text-[#050404] tracking-tight leading-tight line-clamp-2 uppercase">
                          {book.title}
                        </h3>
                        <p className="font-['Hanken_Grotesk'] font-bold text-sm text-[#4d4545] mt-1">
                          BY {book.author.toUpperCase()}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#dadada] font-bold text-xs text-[#4d4545] uppercase tracking-wider">
                        <span className="bg-[#050404] text-white px-2 py-0.5 text-[10px] rounded-[0.125rem]">
                          {book.genre_slug}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          {book.duration || 'RUN TIME'}
                        </span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>

            </section>
          )
        })}

      </main>

      {/* Persistent Audio Deck Floating Flat Bar Strip */}
      {currentTrack && (
        <div 
          onClick={() => setIsPlayerExpanded(true)}
          className="fixed bottom-0 left-0 right-0 cursor-pointer bg-[#050404] border-t-8 border-[#B70504] px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-4 z-40 shadow-none transition-all"
        >
          <div className="flex items-center gap-4 w-full md:w-1/2">
            <div className="relative h-14 w-14 flex-shrink-0 bg-zinc-800 border-2 border-white rounded-[0.25rem] overflow-hidden">
              <img src={currentTrack.cover_url} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <h4 className="font-['Hanken_Grotesk'] font-black text-base text-white tracking-tight uppercase truncate">{currentTrack.title}</h4>
              <p className="text-[#878382] font-bold text-xs uppercase mt-0.5 tracking-wider">BY {currentTrack.author}</p>
            </div>
          </div>

          <div className="w-full md:w-1/2 flex items-center justify-end">
            <div className="bg-[#B70504] text-white text-xs font-black uppercase tracking-widest px-4 py-2.5 border-2 border-white rounded-[0.125rem] flex items-center gap-2">
              <span>EXPAND CONTROL PLATFORM</span>
              <ArrowRight className="h-4 w-4 stroke-[3]" />
            </div>
          </div>
        </div>
      )}

      {/* Immersive Bold High-Contrast Full-Screen Context View Section */}
      {currentTrack && isPlayerExpanded && (
        <div className="fixed inset-0 bg-[#B70504] z-[100] flex flex-col justify-between p-6 md:p-12 animate-in fade-in duration-200 select-none overflow-y-auto">
          
          <audio 
            ref={audioRef}
            src={currentTrack.audio_url} 
            autoPlay 
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
          />

          {/* Top Stark Navigation Strip */}
          <div className="w-full flex items-center justify-between z-10 flex-shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsPlayerExpanded(false); }}
              className="bg-white border-4 border-[#050404] text-[#050404] p-3 rounded-[0.25rem] font-black hover:bg-[#FEBB0F] transition-all"
            >
              <ChevronLeft className="w-6 h-6 stroke-[3]" />
            </button>
            <span className="font-['Anton'] text-2xl text-white uppercase tracking-wider">
              AUDIO STREAM CONTEXT
            </span>
            <div className="w-14" />
          </div>

          {/* Central Full-Bleed Graphic Poster Canvas Frame Layout */}
          <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center my-auto z-10 py-6">
            
            {/* Rigid Heavy-Bordered Square Cover Frame */}
            <div className="relative aspect-square w-[85%] sm:w-[70%] md:w-full justify-self-center bg-white border-[6px] border-[#050404] p-2 rounded-[0.5rem] shadow-none">
              <img 
                src={currentTrack.cover_url} 
                alt={currentTrack.title} 
                className="w-full h-full object-cover rounded-[0.25rem]"
              />
            </div>

            {/* Massive Typographic Meta Readout */}
            <div className="text-left space-y-4 text-white">
              <h1 className="font-['Anton'] text-6xl lg:text-7xl uppercase tracking-tighter leading-none text-white border-b-4 border-[#050404] pb-2">
                {currentTrack.title}
              </h1>
              <p className="font-['Hanken_Grotesk'] font-black text-2xl lg:text-3xl text-[#050404] uppercase tracking-tight">
                BY {currentTrack.author}
              </p>
              <div className="inline-block bg-[#050404] text-white px-3 py-1 font-mono font-bold text-xs uppercase tracking-widest rounded-[0.125rem]">
                {currentTrack.genre_slug} // {currentTrack.duration || 'STABLE RUN'}
              </div>
            </div>

          </div>

          {/* Bottom Solid Pure Black Control Array Deck Container Block */}
          <div className="w-full max-w-4xl mx-auto bg-[#050404] border-4 border-white p-6 md:p-8 rounded-[0.25rem] z-10 mt-auto space-y-6 flex-shrink-0">
            
            {/* Thick Horizontal High-Contrast Seek Bar Scrubber element */}
            <div className="space-y-2">
              <div className="relative w-full flex items-center">
                <input 
                  type="range"
                  min="0"
                  max={durationSec || 100}
                  value={currentTime}
                  onChange={(e) => {
                    const seekTargetTime = Number(e.target.value);
                    setCurrentTime(seekTargetTime);
                    if (audioRef.current) audioRef.current.currentTime = seekTargetTime;
                  }}
                  className="w-full h-3 bg-white/20 appearance-none cursor-pointer outline-none transition-all thick-scrubber rounded-full"
                  style={{
                    background: `linear-gradient(to right, #FEBB0F 0%, #FEBB0F ${(currentTime / (durationSec || 1)) * 100}%, rgba(255,255,255,0.2) ${(currentTime / (durationSec || 1)) * 100}%, rgba(255,255,255,0.2) 100%)`
                  }}
                />
              </div>
              
              <div className="flex justify-between items-center text-xs font-mono font-black text-[#878382]">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(durationSec)}</span>
              </div>
            </div>

            {/* Massive Heavy Glyph Controls Row */}
            <div className="flex items-center justify-center gap-12 py-2">
              <button 
                onClick={(e) => { e.stopPropagation(); if(audioRef.current) audioRef.current.currentTime -= 15; }}
                className="text-white hover:text-[#FEBB0F] transition-colors p-2"
              >
                <ChevronLeft className="w-8 h-8 stroke-[3]" />
              </button>

              {/* Stark Inverted In-Your-Face Play Toggle Node */}
              <button 
                onClick={togglePlayPause}
                className="bg-white text-[#050404] p-5 rounded-full hover:bg-[#FEBB0F] transition-colors flex items-center justify-center border-4 border-[#050404]"
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8 fill-current stroke-[3]" />
                ) : (
                  <Play className="h-8 w-8 fill-current stroke-[3] translate-x-0.5" />
                )}
              </button>

              <button 
                onClick={(e) => { e.stopPropagation(); if(audioRef.current) audioRef.current.currentTime += 15; }}
                className="text-white hover:text-[#FEBB0F] transition-colors p-2"
              >
                <ChevronRight className="w-8 h-8 stroke-[3]" />
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  )
}
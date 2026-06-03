'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '../utils/supabase/client'
import { LogOut, ArrowRight, Play, Pause, ChevronLeft, ChevronRight, Trash2, Volume2, VolumeX, Search, Bookmark, BookOpen } from 'lucide-react'
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
  
  // LEVEL 3: User Identity & Library States
  const [userId, setUserId] = useState(null)
  const [library, setLibrary] = useState([])
  const [activeView, setActiveView] = useState('catalog') // 'catalog' | 'library'
  
  // LEVEL 2: Global Search State
  const [searchQuery, setSearchQuery] = useState('')
  
  // Immersive Editorial Player Control Pipeline States
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false)
  
  // Custom Hard-Flat Media Control States
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [durationSec, setDurationSec] = useState(0)
  
  // LEVEL 1: UI Win States
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)

  // Combined Authentication Guard and Data Fetching Loop
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        
        if (authError || !session) {
          router.push('/auth')
          return
        }

        setUserId(session.user.id)

        // 1. Fetch Core Catalog
        const { data: genresData, error: genreErr } = await supabase.from('genres').select('*')
        if (genreErr) throw genreErr
        setGenres(genresData || [])

        const { data: booksData, error: bookErr } = await supabase.from('audiobooks').select('*')
        if (bookErr) throw bookErr
        setAudiobooks(booksData || [])

        // 2. Fetch User's Personal Library Map
        const { data: libData, error: libErr } = await supabase
          .from('user_library')
          .select('book_id')
          .eq('user_id', session.user.id)
        
        if (libErr) throw libErr
        setLibrary(libData?.map(item => item.book_id) || [])

      } catch (error) {
        console.error('Database system failure:', error)
        setErrorDebug(error?.message || String(error))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router, supabase])


  // ==========================================
  // LEVEL 3: BOOKMARK TOGGLE FUNCTION
  // ==========================================
  const handleToggleBookmark = async (bookId, e) => {
    e.stopPropagation()
    const isSaved = library.includes(bookId)

    try {
      if (isSaved) {
        // Optimistic UI Update: Remove it instantly
        setLibrary(prev => prev.filter(id => id !== bookId))
        await supabase.from('user_library').delete().match({ user_id: userId, book_id: bookId })
      } else {
        // Optimistic UI Update: Add it instantly
        setLibrary(prev => [...prev, bookId])
        await supabase.from('user_library').insert([{ user_id: userId, book_id: bookId }])
      }
    } catch (err) {
      console.error('Library sync failed:', err)
      // Revert state if the database fails
      setLibrary(prev => isSaved ? [...prev, bookId] : prev.filter(id => id !== bookId))
    }
  }

  // ==========================================
  // HARDWARE EVENT LISTENERS
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPlayerExpanded || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault()
        if (audioRef.current) {
          if (audioRef.current.paused) {
            audioRef.current.play()
            setIsPlaying(true)
          } else {
            audioRef.current.pause()
            setIsPlaying(false)
          }
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        if (audioRef.current) audioRef.current.currentTime += 15
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        if (audioRef.current) audioRef.current.currentTime -= 15
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlayerExpanded]) 


  // ==========================================
  // MEDIA CONTROL & MEMORY FUNCTIONS
  // ==========================================
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime
      setCurrentTime(time)
      if (currentTrack?.id) {
        localStorage.setItem(`hearable_resume_${currentTrack.id}`, time)
      }
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDurationSec(audioRef.current.duration)
      audioRef.current.playbackRate = playbackRate
      audioRef.current.volume = isMuted ? 0 : volume

      if (currentTrack?.id) {
        const savedTime = localStorage.getItem(`hearable_resume_${currentTrack.id}`)
        if (savedTime) {
          const parsedTime = parseFloat(savedTime)
          if (parsedTime > 2 && parsedTime < audioRef.current.duration - 10) {
            audioRef.current.currentTime = parsedTime
            setCurrentTime(parsedTime)
          }
        }
      }
    }
  }

  const togglePlayPause = (e) => {
    if (e) e.stopPropagation()
    if (!audioRef.current) return
    if (audioRef.current.paused) {
      audioRef.current.play()
      setIsPlaying(true)
    } else {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleSpeedToggle = (e) => {
    e.stopPropagation()
    const rates = [0.75, 1, 1.25, 1.5, 2]
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length
    const newRate = rates[nextIndex]
    
    setPlaybackRate(newRate)
    if (audioRef.current) audioRef.current.playbackRate = newRate
  }

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (val > 0 && isMuted) setIsMuted(false)
    
    if (audioRef.current) {
      audioRef.current.volume = val
      audioRef.current.muted = val === 0
    }
  }

  const toggleMute = (e) => {
    e.stopPropagation()
    const newMutedState = !isMuted
    setIsMuted(newMutedState)
    if (audioRef.current) {
      audioRef.current.muted = newMutedState
    }
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

  const handleDelete = async (bookId, e) => {
    e.stopPropagation()
    const confirmDelete = window.confirm("WARNING: Are you sure you want to permanently purge this asset from the database?")
    if (!confirmDelete) return

    try {
      const { error } = await supabase.from('audiobooks').delete().eq('id', bookId)
      if (error) throw error

      setAudiobooks((prev) => prev.filter((book) => book.id !== bookId))
      localStorage.removeItem(`hearable_resume_${bookId}`) 

      if (currentTrack?.id === bookId) {
        setCurrentTrack(null)
        setIsPlayerExpanded(false)
      }
    } catch (err) {
      console.error('Failed to purge asset:', err)
      alert(`DELETION FAILED: ${err.message}`)
    }
  }

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00'
    const minutes = Math.floor(secs / 60)
    const seconds = Math.floor(secs % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  // CORE FILTERING ENGINE: Applies both Search Query AND View State (Catalog vs Library)
  const activeSearch = searchQuery.toLowerCase().trim()
  const displayAudiobooks = audiobooks.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(activeSearch) || book.author.toLowerCase().includes(activeSearch)
    const matchesView = activeView === 'library' ? library.includes(book.id) : true
    return matchesSearch && matchesView
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-6">
        <Loader />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c] font-['Hanken_Grotesk'] antialiased pb-40 select-none">
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@500;600;700;800;900&display=swap');
        
        .thick-scrubber::-webkit-slider-thumb {
          appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #050404; border: 3px solid #ffffff; cursor: pointer; transition: transform 0.1s ease-in-out;
        }
        .thick-scrubber::-webkit-slider-thumb:hover { transform: scale(1.15); }
        .volume-scrubber::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #ffffff; cursor: pointer; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Primary Stark Header Strip */}
      <header className="border-b-4 border-[#050404] bg-[#f9f9f9] sticky top-0 z-40 px-6 py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-6 w-full md:w-auto justify-between">
          <h1 className="font-['Anton'] text-4xl uppercase tracking-tighter text-[#050404] leading-none">
            HEARABLE <span className="text-xs font-['Hanken_Grotesk'] font-black bg-[#050404] text-white px-2 py-0.5 ml-1 vertical-middle rounded-[0.125rem]">EDITION 2026</span>
          </h1>

          {/* Mobile-only exit toggle */}
          <button onClick={handleLogout} className="md:hidden flex items-center justify-center p-2 border-2 border-[#050404] rounded-[0.125rem]">
            <LogOut className="h-4 w-4 stroke-[3]" />
          </button>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          
          {/* View Toggle Controls */}
          <div className="flex items-center bg-white border-2 border-[#050404] rounded-[0.125rem] overflow-hidden flex-shrink-0">
            <button 
              onClick={() => setActiveView('catalog')}
              className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider px-4 py-2 transition-colors ${activeView === 'catalog' ? 'bg-[#050404] text-white' : 'text-[#050404] hover:bg-zinc-100'}`}
            >
              <BookOpen className="h-4 w-4 stroke-[3]" />
              Catalog
            </button>
            <div className="w-[2px] self-stretch bg-[#050404]" />
            <button 
              onClick={() => setActiveView('library')}
              className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider px-4 py-2 transition-colors ${activeView === 'library' ? 'bg-[#050404] text-white' : 'text-[#050404] hover:bg-zinc-100'}`}
            >
              <Bookmark className={`h-4 w-4 stroke-[3] ${activeView === 'library' ? 'fill-current' : ''}`} />
              Library
            </button>
          </div>

          <button 
            onClick={() => router.push('/profile')}
            className="text-xs font-black uppercase tracking-wider bg-white border-2 border-[#050404] px-4 py-2 text-[#050404] rounded-[0.125rem] hover:bg-[#050404] hover:text-white transition-colors flex-shrink-0"
          >
            Profile
          </button>
          <button 
            onClick={() => router.push('/admin')}
            className="text-xs font-black uppercase tracking-wider bg-[#FEBB0F] border-2 border-[#050404] px-4 py-2 text-[#050404] rounded-[0.125rem] hover:bg-[#050404] hover:text-white transition-colors flex-shrink-0"
          >
            Upload
          </button>
          <button 
            onClick={handleLogout}
            className="hidden md:flex items-center gap-1.5 font-black text-xs uppercase tracking-widest text-[#1a1c1c] hover:text-[#B70504] ml-2 flex-shrink-0"
          >
            <LogOut className="h-4 w-4 stroke-[3]" />
            Exit
          </button>
        </div>
      </header>

      {errorDebug && (
        <div className="m-6 p-4 bg-[#B70504] border-4 border-[#050404] text-white text-sm font-black uppercase tracking-wide">
          SYSTEM ERROR ERROR: {errorDebug}
        </div>
      )}

      {/* Main Container Layout Body */}
      <main className="px-6 py-12 space-y-20">
        
        {/* Search Bar */}
        <div className="relative max-w-5xl">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeView === 'library' ? "SEARCH YOUR VAULT..." : "SEARCH CATALOG BY TITLE OR AUTHOR..."}
            className="w-full bg-white border-[6px] border-[#050404] px-6 py-6 md:py-8 font-['Anton'] text-3xl md:text-5xl uppercase tracking-tighter text-[#050404] outline-none focus:bg-[#FEBB0F] transition-colors placeholder:text-zinc-300 rounded-[0.25rem] shadow-[8px_8px_0px_0px_rgba(5,4,4,1)]"
          />
          <Search className="absolute right-8 top-1/2 -translate-y-1/2 h-10 w-10 text-[#050404] stroke-[3]" />
        </div>

        {genres.map((genre) => {
          const structuralRowBooks = displayAudiobooks.filter(book => book.genre_slug === genre.slug)
          if (structuralRowBooks.length === 0) return null

          return (
            <section key={genre.id} className="space-y-6 relative">
              <div className="border-b-4 border-[#050404] pb-2 flex items-baseline gap-3">
                <h2 className="font-['Anton'] text-5xl uppercase tracking-tight text-[#050404] leading-none">
                  {genre.name}
                </h2>
                <span className="font-['Hanken_Grotesk'] text-lg font-black tracking-tighter text-[#B70504]">
                  /{structuralRowBooks.length.toString().padStart(2, '0')}
                </span>
              </div>

              <div className="flex gap-8 overflow-x-auto pb-4 pt-2 snap-x scroll-smooth no-scrollbar">
                {structuralRowBooks.map((book) => {
                  const isSaved = library.includes(book.id)
                  
                  return (
                    <div 
                      key={book.id} 
                      className="w-[200px] sm:w-[240px] flex-shrink-0 snap-start bg-white border-4 border-[#050404] p-4 relative group flex flex-col justify-between hover:bg-[#FEBB0F] transition-colors duration-200 rounded-[0.25rem]"
                    >
                      <div className="relative aspect-square w-full bg-[#dadada] border-2 border-[#050404] overflow-hidden rounded-[0.5rem]">
                        <img 
                          src={book.cover_url} 
                          alt={book.title}
                          className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all duration-300"
                        />
                        <div className="absolute inset-0 bg-[#B70504]/90 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <button 
                            onClick={() => setCurrentTrack(book)}
                            className="bg-white border-4 border-[#050404] text-[#050404] p-4 rounded-full font-black transform hover:scale-110 transition-transform"
                          >
                            <Play className="h-6 w-6 fill-current" />
                          </button>
                        </div>
                        
                        {/* THE NEW BOOKMARK ICON */}
                        <button
                          onClick={(e) => handleToggleBookmark(book.id, e)}
                          className={`absolute top-2 left-2 p-2 z-30 transition-all rounded-[0.125rem] border-2 ${isSaved ? 'bg-[#050404] border-white text-[#FEBB0F] opacity-100' : 'bg-white border-[#050404] text-[#050404] opacity-0 group-hover:opacity-100 hover:bg-[#050404] hover:text-white'}`}
                          title={isSaved ? "Remove from Library" : "Save to Library"}
                        >
                          <Bookmark className={`h-5 w-5 stroke-[2] ${isSaved ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          onClick={(e) => handleDelete(book.id, e)}
                          className="absolute top-2 right-2 bg-[#B70504] border-2 border-[#050404] text-white p-2 z-30 opacity-0 group-hover:opacity-100 hover:bg-[#050404] hover:scale-110 transition-all rounded-[0.125rem]"
                          title="PURGE ASSET"
                        >
                          <Trash2 className="h-4 w-4 stroke-[3]" />
                        </button>
                      </div>

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
                  )
                })}
              </div>
            </section>
          )
        })}

        {/* Dynamic Empty States */}
        {displayAudiobooks.length === 0 && (
          <div className="text-center py-20 border-[6px] border-[#050404] border-dashed rounded-[0.5rem]">
            <h3 className="font-['Anton'] text-4xl uppercase text-[#050404]">NO SIGNALS DETECTED</h3>
            <p className="font-['Hanken_Grotesk'] font-bold uppercase tracking-widest text-[#4d4545] mt-2">
              {activeView === 'library' && searchQuery === '' 
                ? "Your vault is empty. Return to the catalog to save some assets." 
                : "Try adjusting your search parameters."}
            </p>
          </div>
        )}

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

          <div className="w-full flex items-center justify-between z-10 flex-shrink-0">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsPlayerExpanded(false); }}
              className="bg-white border-4 border-[#050404] text-[#050404] p-3 rounded-[0.25rem] font-black hover:bg-[#FEBB0F] transition-all"
            >
              <ChevronLeft className="w-6 h-6 stroke-[3]" />
            </button>
            <span className="font-['Anton'] text-2xl text-white uppercase tracking-wider hidden sm:block">
              AUDIO STREAM CONTEXT
            </span>
            <div className="w-14" />
          </div>

          <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center my-auto z-10 py-6">
            <div className="relative aspect-square w-[85%] sm:w-[70%] md:w-full justify-self-center bg-white border-[6px] border-[#050404] p-2 rounded-[0.5rem] shadow-none">
              <img 
                src={currentTrack.cover_url} 
                alt={currentTrack.title} 
                className="w-full h-full object-cover rounded-[0.25rem]"
              />
            </div>
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

          <div className="w-full max-w-4xl mx-auto bg-[#050404] border-4 border-white p-6 md:p-8 rounded-[0.25rem] z-10 mt-auto space-y-6 flex-shrink-0">
            
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

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-2">
              
              <div className="flex items-center gap-3 w-full md:w-1/3 justify-center md:justify-start">
                <button onClick={toggleMute} className="text-white hover:text-[#FEBB0F] transition-colors p-2">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input 
                  type="range"
                  min="0" max="1" step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-24 h-1.5 bg-white/20 appearance-none rounded-full volume-scrubber outline-none transition-all"
                  style={{
                    background: `linear-gradient(to right, #ffffff 0%, #ffffff ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) 100%)`
                  }}
                />
              </div>

              <div className="flex items-center justify-center gap-6 md:gap-8 w-full md:w-1/3">
                <button 
                  onClick={(e) => { e.stopPropagation(); if(audioRef.current) audioRef.current.currentTime -= 15; }}
                  className="text-white hover:text-[#FEBB0F] transition-colors p-2"
                  title="Rewind 15s (Left Arrow)"
                >
                  <ChevronLeft className="w-7 h-7 stroke-[3]" />
                </button>

                <button 
                  onClick={togglePlayPause}
                  className="bg-white text-[#050404] p-4 md:p-5 rounded-full hover:bg-[#FEBB0F] transition-colors flex items-center justify-center border-4 border-[#050404]"
                  title="Play/Pause (Spacebar)"
                >
                  {isPlaying ? (
                    <Pause className="h-7 w-7 md:h-8 md:w-8 fill-current stroke-[3]" />
                  ) : (
                    <Play className="h-7 w-7 md:h-8 md:w-8 fill-current stroke-[3] translate-x-0.5" />
                  )}
                </button>

                <button 
                  onClick={(e) => { e.stopPropagation(); if(audioRef.current) audioRef.current.currentTime += 15; }}
                  className="text-white hover:text-[#FEBB0F] transition-colors p-2"
                  title="Skip 15s (Right Arrow)"
                >
                  <ChevronRight className="w-7 h-7 stroke-[3]" />
                </button>
              </div>

              <div className="flex items-center justify-center md:justify-end w-full md:w-1/3">
                <button 
                  onClick={handleSpeedToggle}
                  className="text-xs font-black uppercase tracking-wider bg-[#050404] border-2 border-white text-white hover:bg-white hover:text-[#050404] transition-colors px-4 py-1.5 rounded-[0.125rem] w-16 text-center"
                >
                  {playbackRate}X
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  )
}
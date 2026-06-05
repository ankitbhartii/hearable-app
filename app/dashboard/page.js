'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '../utils/supabase/client'
import { LogOut, ArrowRight, Play, Pause, ChevronLeft, ChevronRight, Trash2, Volume2, VolumeX, Search, Bookmark, BookOpen, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Loader from '../Loader'

export default function Dashboard() {
  const supabase = createClient()
  const router = useRouter()

  // App Core State Management
  const [audiobooks, setAudiobooks] = useState([])
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorDebug, setErrorDebug] = useState(null)
  
  // User Identity & Library States
  const [userId, setUserId] = useState(null)
  const [library, setLibrary] = useState([])
  const [activeView, setActiveView] = useState('catalog') // 'catalog' | 'library'
  
  // Global Search State
  const [searchQuery, setSearchQuery] = useState('')
  
  // Immersive Player Pipeline States
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false)
  
  // Custom Media Control States & References
  const audioRef = useRef(null)
  const playPromiseRef = useRef(null) // Safe Async Lock Reference
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [durationSec, setDurationSec] = useState(0)
  
  // UI Modifier States
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

        // 1. Fetch Core Catalog Genres Rows
        const { data: genresData, error: genreErr } = await supabase.from('genres').select('*')
        if (genreErr) throw genreErr
        setGenres(genresData || [])

        // 2. Fetch Core Audiobooks Tracks
        const { data: booksData, error: bookErr } = await supabase.from('audiobooks').select('*')
        if (bookErr) throw bookErr
        setAudiobooks(booksData || [])

        // 3. Fetch User's Personal Save Library Map
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
  // BOOKMARK MY-LIST TOGGLE FUNCTION
  // ==========================================
  const handleToggleBookmark = async (bookId, e) => {
    e.stopPropagation()
    const isSaved = library.includes(bookId)

    try {
      if (isSaved) {
        setLibrary(prev => prev.filter(id => id !== bookId))
        await supabase.from('user_library').delete().match({ user_id: userId, book_id: bookId })
      } else {
        setLibrary(prev => [...prev, bookId])
        await supabase.from('user_library').insert([{ user_id: userId, book_id: bookId }])
      }
    } catch (err) {
      console.error('Library sync failed:', err)
      setLibrary(prev => isSaved ? [...prev, bookId] : prev.filter(id => id !== bookId))
    }
  }

  // ==========================================
  // HARDWARE KEYBOARD LISTENERS
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault()
        togglePlayPause()
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
  }, [currentTrack, isPlaying]) 

  // ==========================================
  // GLOBAL NATIVE OS MEDIA SESSION INTERFACES
  // ==========================================
  useEffect(() => {
    if (currentTrack && 'mediaSession' in navigator) {
      // 1. Update OS Notification Center Drawer Card Meta details
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title.toUpperCase(),
        artist: currentTrack.author.toUpperCase(),
        album: 'HEARABLE VAULT',
        artwork: [
          { src: currentTrack.cover_url, sizes: '96x96',   type: 'image/jpeg' },
          { src: currentTrack.cover_url, sizes: '128x128', type: 'image/jpeg' },
          { src: currentTrack.cover_url, sizes: '192x192', type: 'image/jpeg' },
          { src: currentTrack.cover_url, sizes: '256x256', type: 'image/jpeg' },
          { src: currentTrack.cover_url, sizes: '384x384', type: 'image/jpeg' },
          { src: currentTrack.cover_url, sizes: '512x512', type: 'image/jpeg' },
        ]
      });

      // 2. Intercept Hardware/OS System Control Actions
      navigator.mediaSession.setActionHandler('play', () => {
        if (audioRef.current && audioRef.current.paused) {
          const playPromise = audioRef.current.play();
          playPromiseRef.current = playPromise;
          if (playPromise !== undefined) {
            playPromise.then(() => setIsPlaying(true)).catch(err => console.log(err));
          }
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (audioRef.current && !audioRef.current.paused) {
          if (playPromiseRef.current) {
            playPromiseRef.current.then(() => {
              audioRef.current.pause();
              setIsPlaying(false);
            }).catch(() => {
              audioRef.current.pause();
              setIsPlaying(false);
            });
          } else {
            audioRef.current.pause();
            setIsPlaying(false);
          }
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (audioRef.current) {
          const offset = details.seekOffset || 15;
          audioRef.current.currentTime = Math.max(audioRef.current.currentTime - offset, 0);
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (audioRef.current) {
          const offset = details.seekOffset || 15;
          audioRef.current.currentTime = Math.min(audioRef.current.currentTime + offset, audioRef.current.duration);
        }
      });

      // Handle seeking adjustments straight from OS slider thumb moves
      try {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (audioRef.current && details.seekTime !== undefined) {
            audioRef.current.currentTime = details.seekTime;
          }
        });
      } catch (error) {
        console.info("SeekTo system context mapping not supported by this browser client package.");
      }
    }
  }, [currentTrack]);

  // Synchronize internal state changes smoothly back up to the OS tracker
  useEffect(() => {
    if (currentTrack && audioRef.current && 'mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: durationSec || 180,
          playbackRate: playbackRate,
          position: currentTime
        });
      } catch (e) {
        // Safe catch layout parameters if duration metadata hasn't loaded yet
        console.debug("Position syncing stream parsing...", e);
      }
    }
  }, [currentTime, durationSec, playbackRate, currentTrack]);

  // Update OS playback indicators explicitly
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // ==========================================
  // SAFELY MONITORED MEDIA LIFECYCLE FUNCTIONS
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

  // Global Pipeline Effects Loop with safe Async Promise checking
  useEffect(() => {
    if (currentTrack && audioRef.current) {
      setCurrentTime(0)
      audioRef.current.load()
      
      const playPromise = audioRef.current.play()
      playPromiseRef.current = playPromise

      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(err => console.info("Playback promise cleanly controlled:", err.message))
      }
    }
  }, [currentTrack])

  const togglePlayPause = (e) => {
    if (e) e.stopPropagation()
    if (!audioRef.current) return

    if (audioRef.current.paused) {
      const playPromise = audioRef.current.play()
      playPromiseRef.current = playPromise

      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(err => console.log("Play request managed safely:", err))
      }
    } else {
      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => {
            audioRef.current.pause()
            setIsPlaying(false)
          })
          .catch(() => {
            audioRef.current.pause()
            setIsPlaying(false)
          })
      } else {
        audioRef.current.pause()
        setIsPlaying(false)
      }
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

  const activeSearch = searchQuery.toLowerCase().trim()
  const displayAudiobooks = audiobooks.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(activeSearch) || book.author.toLowerCase().includes(activeSearch)
    const matchesView = activeView === 'library' ? library.includes(book.id) : true
    return matchesSearch && matchesView
  })

  // Select the absolute first book inside your storage array to feature as the massive billboard
  const featuredHeroBook = audiobooks[0] || {
    title: "SPECULATIVE STORIES",
    author: "CURATED FOR YOU",
    description: "Immerse yourself inside exceptional creative literature across detailed fiction worlds and fact-driven historical narratives. Explore our new expansive catalog library categories.",
    cover_url: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&auto=format&fit=crop&q=80",
    audio_url: ""
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white font-['Hanken_Grotesk'] antialiased pb-40 select-none transition-colors duration-300 overflow-x-hidden">
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&display=swap');
        
        .thick-scrubber::-webkit-slider-thumb {
          appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #e50914; cursor: pointer; transition: transform 0.1s ease;
        }
        .thick-scrubber::-webkit-slider-thumb:hover { transform: scale(1.3); }
        .volume-scrubber::-webkit-slider-thumb { appearance: none; width: 10px; height: 10px; border-radius: 50%; background: #ffffff; cursor: pointer; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Global Hidden Audio Streaming Controller */}
      {currentTrack && (
        <audio 
          ref={audioRef}
          src={currentTrack.audio_url} 
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
      )}

      {/* ================= NETFLIX NAVIGATION HEADER ================= */}
      <header className="bg-gradient-to-b from-black via-black/70 to-transparent fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
        <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => { setActiveView('catalog'); setSearchQuery(''); }}>
            <span className="text-[#e50914] text-2xl md:text-3xl font-[900] tracking-tighter antialiased">
              HEARABLE
            </span>
            <span className="bg-[#e50914] text-white text-[8px] font-[900] px-1.5 py-0.5 rounded-sm ml-1 tracking-widest uppercase">
              V2.026
            </span>
          </div>

          <button onClick={handleLogout} className="md:hidden flex items-center justify-center p-2 border border-white/10 rounded-md text-neutral-400 hover:text-white transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
          {/* Netflix Clean Inline Menu Weights */}
          <div className="flex items-center gap-5 text-[13px] font-medium text-neutral-300 transition-colors">
            <button onClick={() => { setActiveView('catalog'); setSearchQuery(''); }} className={`hover:text-neutral-400 transition-colors ${activeView === 'catalog' && searchQuery === '' ? 'text-white font-bold' : ''}`}>Home</button>
            <button onClick={() => { setActiveView('library'); setSearchQuery(''); }} className={`hover:text-neutral-400 transition-colors ${activeView === 'library' ? 'text-white font-bold' : ''}`}>My List</button>
            <button onClick={() => router.push('/profile')} className="hover:text-neutral-400 transition-colors">Profile</button>
            <button onClick={() => router.push('/admin')} className="text-[#e50914] font-bold hover:text-[#b81d24] transition-colors">Upload</button>
          </div>

          {/* Clean Rounded Search Box */}
          <div className="relative flex items-center bg-black/60 border border-white/20 rounded-md px-3 py-1.5 backdrop-blur-md max-w-[180px] md:max-w-xs group">
            <Search className="h-4 w-4 text-neutral-400 group-focus-within:text-[#e50914] transition-colors mr-2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Titles, authors..."
              className="bg-transparent text-white placeholder-neutral-500 font-medium text-xs outline-none w-full"
            />
          </div>

          <button onClick={handleLogout} className="hidden md:flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-neutral-400 hover:text-white transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ================= NETFLIX WIDESCREEN WIDE BILLBOARD ================= */}
      {searchQuery === '' && activeView === 'catalog' && (
        <div className="relative w-full h-[56vw] min-h-[420px] max-h-[780px] bg-black overflow-hidden select-none">
          <img 
            src={featuredHeroBook.cover_url} 
            alt={featuredHeroBook.title}
            className="w-full h-full object-cover object-center opacity-70 md:opacity-80"
          />
          
          {/* Edge Masking Scrim Gradient Mix Fields */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-black/10 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/80 via-transparent to-transparent hidden md:block" />

          {/* Left Hero Description Controls Container */}
          <div className="absolute left-6 md:left-12 bottom-[30%] md:bottom-[22%] max-w-xl space-y-4 md:space-y-5 z-10">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-[900] tracking-tight text-white uppercase leading-none antialiased drop-shadow-md">
              {featuredHeroBook.title}
            </h1>
            <p className="text-neutral-200 font-normal text-xs sm:text-sm md:text-[15px] leading-relaxed drop-shadow max-w-lg line-clamp-3 md:line-clamp-none">
              {featuredHeroBook.description || "No summary provided for this premium audiobook catalog asset."}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={() => {
                  if (currentTrack?.id === featuredHeroBook.id) {
                    togglePlayPause();
                  } else {
                    setCurrentTrack(featuredHeroBook);
                  }
                }}
                className="flex items-center justify-center gap-2 bg-white text-black font-extrabold text-xs sm:text-sm md:text-base px-6 sm:px-8 py-2.5 sm:py-3 rounded-md hover:bg-white/80 transition-all active:scale-95 shadow-md"
              >
                {currentTrack?.id === featuredHeroBook.id && isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 fill-current text-black" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current text-black ml-0.5" />
                    Play
                  </>
                )}
              </button>
              <button 
                onClick={() => { setCurrentTrack(featuredHeroBook); setIsPlayerExpanded(true); }}
                className="flex items-center justify-center gap-2 bg-neutral-500/30 text-white font-extrabold text-xs sm:text-sm md:text-base px-6 sm:px-8 py-2.5 sm:py-3 rounded-md border border-white/10 hover:bg-neutral-500/50 transition-all backdrop-blur-md active:scale-95"
              >
                <Info className="h-4 w-4" />
                More Info
              </button>
            </div>
          </div>

          <div className="absolute right-0 bottom-[35%] md:bottom-[25%] bg-zinc-900/50 border-l-4 border-neutral-400 pl-4 pr-12 py-2 backdrop-blur-sm flex items-center font-bold text-xs uppercase tracking-widest text-neutral-300 z-10">
            U/A 16+
          </div>
        </div>
      )}

      {errorDebug && (
        <div className="mx-6 md:mx-12 my-6 p-4 bg-[#e50914]/20 border-l-4 border-[#e50914] text-white text-sm font-bold uppercase tracking-wide rounded-r-md">
          SYSTEM FAULT NODE: {errorDebug}
        </div>
      )}

      {/* ================= NETFLIX ROW CAROUSELS ================= */}
      <main className={`max-w-7xl mx-auto px-6 md:px-12 relative z-20 ${searchQuery !== '' || activeView !== 'catalog' ? 'pt-28' : '-mt-12 sm:-mt-20 md:-mt-28'}`}>
        
        {genres.map((genre) => {
          const structuralRowBooks = displayAudiobooks.filter(book => book.genre_slug === genre.slug)
          if (structuralRowBooks.length === 0) return null

          return (
            <section key={genre.id} className="space-y-3 relative pb-8 select-none">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[14px] sm:text-[18px] md:text-[22px] font-bold tracking-tight text-white leading-none hover:text-[#e50914] cursor-pointer transition-colors antialiased">
                  {genre.name}
                </h2>
                <span className="font-bold text-[10px] text-neutral-500 tracking-widest">
                  [{structuralRowBooks.length}]
                </span>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scroll-smooth no-scrollbar">
                {structuralRowBooks.map((book) => {
                  const isSaved = library.includes(book.id)
                  const isCurrentlyPlaying = currentTrack?.id === book.id
                  
                  return (
                    <motion.div 
                      key={book.id} 
                      whileHover={{ scale: 1.05, zIndex: 30 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      className={`w-[150px] sm:w-[200px] md:w-[240px] flex-shrink-0 snap-start bg-[#181818] rounded-md overflow-hidden border cursor-pointer flex flex-col justify-between group relative shadow-xl transition-colors ${isCurrentlyPlaying ? 'border-[#e50914]' : 'border-neutral-900 hover:border-neutral-700'}`}
                    >
                      {/* Horizontal Preview Ratio Block */}
                      <div className="relative aspect-[16/10] w-full bg-neutral-900 overflow-hidden">
                        <img 
                          src={book.cover_url} 
                          alt={book.title}
                          className="object-cover w-full h-full transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-black/10 to-transparent opacity-80" />
                        
                        {/* Shutter Hover Overlay Core Play */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 backdrop-blur-[1px]">
                          <button 
                            onClick={() => {
                              if (isCurrentlyPlaying) {
                                togglePlayPause();
                              } else {
                                setCurrentTrack(book);
                              }
                            }}
                            className="bg-[#e50914] text-white p-3 rounded-full shadow-2xl scale-90 hover:scale-105 transition-transform flex items-center justify-center border-none outline-none"
                          >
                            {isCurrentlyPlaying && isPlaying ? (
                              <Pause className="h-4 w-4 fill-current" />
                            ) : (
                              <Play className="h-4 w-4 fill-current ml-0.5" />
                            )}
                          </button>
                        </div>
                        
                        {/* Bookmark List Toggle */}
                        <button
                          onClick={(e) => handleToggleBookmark(book.id, e)}
                          className={`absolute top-2 left-2 p-1.5 z-30 transition-all rounded-md text-xs backdrop-blur-sm border ${isSaved ? 'bg-black/70 border-[#e50914] text-[#e50914]' : 'bg-black/40 border-white/10 text-white opacity-0 group-hover:opacity-100 hover:bg-white hover:text-black hover:border-white'}`}
                          title={isSaved ? "Remove from List" : "Add to My List"}
                        >
                          <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
                        </button>

                        {/* Trash Purge Handler */}
                        <button
                          onClick={(e) => handleDelete(book.id, e)}
                          className="absolute top-2 right-2 bg-black/40 border border-white/10 text-neutral-400 p-1.5 rounded-md z-30 opacity-0 group-hover:opacity-100 hover:bg-[#e50914] hover:text-white hover:border-[#e50914] transition-all"
                          title="PURGE ASSET"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Title Metadata Footer Section */}
                      <div className="p-3 space-y-2 flex-1 flex flex-col justify-between" onClick={() => setCurrentTrack(book)}>
                        <div>
                          <h3 className={`font-semibold text-xs sm:text-[13px] tracking-wide truncate uppercase transition-colors duration-200 ${isCurrentlyPlaying ? 'text-[#e50914]' : 'text-white'}`}>
                            {book.title}
                          </h3>
                          <p className="font-bold text-[9px] text-neutral-500 mt-0.5 uppercase tracking-wider truncate">
                            BY {book.author}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[9px] text-neutral-400 font-bold tracking-widest uppercase">
                          <span className="bg-white/5 px-1.5 py-0.5 rounded-sm border border-white/5 text-neutral-300">{book.genre_slug}</span>
                          <span className="font-mono text-neutral-500">{book.duration || 'RUN TIME'}</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </section>
          )
        })}

        {/* Empty States Filter Indicator */}
        {displayAudiobooks.length === 0 && (
          <div className="text-center py-20 border border-neutral-800 border-dashed rounded-xl bg-black/20">
            <h3 className="text-lg font-bold uppercase text-neutral-400 tracking-wider">NO SIGNALS DETECTED</h3>
            <p className="font-bold uppercase tracking-widest text-neutral-600 text-xs mt-2 max-w-sm mx-auto">
              {activeView === 'library' && searchQuery === '' 
                ? "Your list is currently empty. Revert parameters to add assets." 
                : "Try adjusting your text search filters."}
            </p>
          </div>
        )}

      </main>

      {/* ================= FIXED FLOATING CONTROLS DOCKBAR ================= */}
      <AnimatePresence>
        {currentTrack && !isPlayerExpanded && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
            className="fixed bottom-0 left-0 right-0 bg-[#181818]/95 backdrop-blur-xl border-t border-neutral-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-40 shadow-[0_-15px_40px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center gap-4 w-full sm:w-1/2 cursor-pointer" onClick={() => setIsPlayerExpanded(true)}>
              <div className="relative h-12 w-12 flex-shrink-0 bg-neutral-900 border border-white/10 rounded-md overflow-hidden">
                <img src={currentTrack.cover_url} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-white tracking-tight uppercase truncate">{currentTrack.title}</h4>
                <p className="text-[#e50914] font-bold text-xs uppercase mt-0.5 tracking-wider">BY {currentTrack.author}</p>
              </div>
            </div>
            <div className="w-full sm:w-1/2 flex items-center justify-end gap-4">
              <button 
                onClick={togglePlayPause}
                className="bg-white text-black p-2.5 rounded-full hover:bg-[#e50914] hover:text-white transition-colors flex items-center justify-center shadow-md active:scale-95 border-none outline-none"
              >
                {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
              </button>
              <div 
                onClick={() => setIsPlayerExpanded(true)}
                className="bg-[#e50914] hover:bg-[#b81d24] text-white text-xs font-bold uppercase tracking-widest px-5 py-3 rounded-md transition-colors flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <span>Expand Controls</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= IMMERSIVE CONTROLS VIEW CONTEXT ================= */}
      <AnimatePresence>
        {currentTrack && isPlayerExpanded && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 bg-gradient-to-b from-[#0f0f0f] to-[#050404] z-[100] flex flex-col justify-between p-6 md:p-12 select-none overflow-y-auto"
          >
            <div className="w-full flex items-center justify-between z-10 flex-shrink-0">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsPlayerExpanded(false); }}
                className="bg-black/40 border border-white/10 text-white p-3 rounded-full hover:bg-white hover:text-black hover:border-white transition-all transform hover:scale-105 active:scale-95"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-[0.2em] hidden sm:block">
                AUDIO STREAM CONTEXT
              </span>
              <div className="w-14" />
            </div>

            <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center my-auto z-10 py-6">
              <div className="relative aspect-[4/5] w-[70%] sm:w-[55%] md:w-[80%] max-w-xs justify-self-center bg-neutral-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                <img 
                  src={currentTrack.cover_url} 
                  alt={currentTrack.title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-60" />
              </div>
              
              <div className="text-left space-y-5">
                <div className="space-y-1">
                  <h1 className="text-4xl lg:text-6xl font-black tracking-tight leading-none text-white antialiased">
                    {currentTrack.title}
                  </h1>
                  <p className="font-bold text-lg lg:text-xl text-[#e50914] uppercase tracking-wide">
                    BY {currentTrack.author}
                  </p>
                </div>
                <div className="inline-flex bg-white/5 border border-white/10 text-neutral-300 px-3 py-1.5 font-mono text-xs uppercase tracking-widest rounded-md">
                  {currentTrack.genre_slug} &nbsp;//&nbsp; {currentTrack.duration || 'STABLE RUN'}
                </div>
                {currentTrack.description && (
                  <p className="text-neutral-400 text-sm leading-relaxed max-w-md uppercase font-medium tracking-wide">
                    {currentTrack.description}
                  </p>
                )}
              </div>
            </div>

            {/* BASE SLIDER ACTION INTERACTION CORE */}
            <div className="w-full max-w-4xl mx-auto bg-[#181818]/60 border border-white/10 p-6 md:p-8 rounded-2xl backdrop-blur-md z-10 mt-auto space-y-6 flex-shrink-0 shadow-2xl">
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
                    className="w-full h-1 bg-white/10 appearance-none cursor-pointer outline-none transition-all thick-scrubber rounded-full"
                    style={{
                      background: `linear-gradient(to right, #e50914 0%, #e50914 ${(currentTime / (durationSec || 1)) * 100}%, rgba(255,255,255,0.1) ${(currentTime / (durationSec || 1)) * 100}%, rgba(255,255,255,0.1) 100%)`
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs font-mono font-bold text-neutral-500 tracking-wider">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(durationSec)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
                <div className="flex items-center gap-3 w-full sm:w-1/3 justify-center sm:justify-start">
                  <button onClick={toggleMute} className="text-neutral-400 hover:text-white transition-colors p-2">
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input 
                    type="range"
                    min="0" max="1" step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-24 h-1 bg-white/20 appearance-none rounded-full volume-scrubber outline-none transition-all"
                    style={{
                      background: `linear-gradient(to right, #ffffff 0%, #ffffff ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) 100%)`
                    }}
                  />
                </div>

                <div className="flex items-center justify-center gap-6 md:gap-8 w-full sm:w-1/3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); if(audioRef.current) audioRef.current.currentTime -= 15; }}
                    className="text-neutral-400 hover:text-white transition-colors p-2"
                  >
                    <ChevronLeft className="w-7 h-7" />
                  </button>

                  <button 
                    onClick={togglePlayPause}
                    className="bg-white text-black p-4 md:p-5 rounded-full hover:bg-[#e50914] hover:text-white transition-all flex items-center justify-center shadow-lg transform active:scale-95 border-none outline-none"
                  >
                    {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current translate-x-0.5" />}
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); if(audioRef.current) audioRef.current.currentTime += 15; }}
                    className="text-neutral-400 hover:text-white transition-colors p-2"
                  >
                    <ChevronRight className="w-7 h-7" />
                  </button>
                </div>

                <div className="flex items-center justify-center sm:justify-end w-full sm:w-1/3">
                  <button 
                    onClick={handleSpeedToggle}
                    className="text-xs font-bold bg-black/40 border border-white/10 text-neutral-300 hover:text-white hover:border-white transition-colors px-4 py-2 rounded-md w-16 text-center"
                  >
                    {playbackRate}X
                  </button>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
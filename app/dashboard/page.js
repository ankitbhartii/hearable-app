'use client'

import { useEffect, useState, useRef, memo, useMemo } from 'react'
import { createClient } from '../utils/supabase/client'
import { LogOut, ArrowRight, Play, Pause, ChevronLeft, ChevronRight, Trash2, Volume2, VolumeX, Search, Bookmark, Info, ListOrdered, Heart, Share2, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Loader from '../Loader'

// Memoized Sub-Component Card to isolate DOM rendering chains
const AudiobookCard = memo(({ book, isSaved, isLiked, likeCount, isCurrentlyPlaying, isPlaying, onToggleBookmark, onToggleLike, onShare, onDelete, onPlayClick, onExpandView }) => {
  return (
    <motion.div 
      whileHover={{ scale: 1.05, zIndex: 30 }}
      transition={{ type: "spring", stiffness: 350, damping: 24 }}
      className={`w-[150px] sm:w-[200px] md:w-[240px] flex-shrink-0 snap-start bg-[#181818] rounded-md overflow-hidden border cursor-pointer flex flex-col justify-between group relative shadow-xl transform-gpu will-change-transform ${isCurrentlyPlaying ? 'border-[#e50914]' : 'border-neutral-900 hover:border-neutral-700'}`}
    >
      <div className="relative aspect-[16/10] w-full bg-neutral-900 overflow-hidden">
        <img src={book.cover_url} alt={book.title} loading="lazy" className="object-cover w-full h-full transition-opacity duration-200 group-hover:opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-black/10 to-transparent opacity-80" />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-black/40 backdrop-blur-[1px]">
          <button onClick={(e) => { e.stopPropagation(); onPlayClick(book); }} className="bg-[#e50914] text-white p-3 rounded-full shadow-2xl scale-90 hover:scale-105 transition-transform flex items-center justify-center border-none outline-none">
            {isCurrentlyPlaying && isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
          </button>
        </div>
        
        <button onClick={(e) => onToggleBookmark(book.id, e)} className={`absolute top-2 left-2 p-1.5 z-30 transition-all rounded-md text-xs backdrop-blur-sm border ${isSaved ? 'bg-black/70 border-[#e50914] text-[#e50914]' : 'bg-black/40 border-white/10 text-white opacity-0 group-hover:opacity-100 hover:bg-white hover:text-black hover:border-white'}`}>
          <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
        </button>

        <button onClick={(e) => onDelete(book.id, e)} className="absolute top-2 right-2 bg-black/40 border border-white/10 text-neutral-400 p-1.5 rounded-md z-30 opacity-0 group-hover:opacity-100 hover:bg-[#e50914] hover:text-white hover:border-[#e50914] transition-all">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3 space-y-2 flex-1 flex flex-col justify-between" onClick={() => onExpandView(book)}>
        <div>
          <h3 className={`font-semibold text-xs sm:text-[13px] tracking-wide truncate uppercase transition-colors duration-200 ${isCurrentlyPlaying ? 'text-[#e50914]' : 'text-white'}`}>{book.title}</h3>
          <p className="font-bold text-[9px] text-neutral-500 mt-0.5 uppercase tracking-wider truncate">BY {book.author}</p>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[9px] text-neutral-400 font-bold tracking-widest uppercase">
          <span className="bg-white/5 px-1.5 py-0.5 rounded-sm border border-white/5 text-neutral-300">{book.genre_slug}</span>
          <div className="flex items-center gap-2.5 normal-case font-normal text-neutral-400 z-20">
            <button onClick={(e) => onToggleLike(book.id, e)} className={`flex items-center gap-1 transition-colors hover:text-[#e50914] ${isLiked ? 'text-[#e50914]' : ''}`}>
              <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-[10px] font-bold font-mono">{likeCount}</span>
            </button>
            <button onClick={(e) => onShare(book, e)} className="hover:text-white transition-colors"><Share2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>
    </motion.div>
  )
})
AudiobookCard.displayName = 'AudiobookCard'

export default function Dashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [audiobooks, setAudiobooks] = useState([])
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorDebug, setErrorDebug] = useState(null)
  const [userId, setUserId] = useState(null)
  
  const [library, setLibrary] = useState([])
  const [likedBooks, setLikedBooks] = useState([])
  const [globalLikesMap, setGlobalLikesMap] = useState({})
  const [recentBookIds, setRecentBookIds] = useState([]) 

  const [activeView, setActiveView] = useState('catalog')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [activeBookContext, setActiveBookContext] = useState(null) 
  const [bookChapters, setBookChapters] = useState([]) 
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false)
  
  // Ratings & Reviews State
  const [bookReviews, setBookReviews] = useState([])
  const [ratingHover, setRatingHover] = useState(0)
  const [ratingValue, setRatingValue] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  const [currentActiveChapter, setCurrentActiveChapter] = useState(null) 
  const [isPlaying, setIsPlaying] = useState(false)

  const audioRef = useRef(null)
  const playPromiseRef = useRef(null)
  const rangeScrubberRef = useRef(null)       
  const persistentScrubberRef = useRef(null)  
  const expandedCurrentTimeTextRef = useRef(null)
  const expandedDurationTextRef = useRef(null)
  
  const [durationSec, setDurationSec] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        if (authError || !session) { router.push('/auth'); return; }
        setUserId(session.user.id)

        const [genresRes, booksRes, libRes, likesRes, allLikesRes] = await Promise.all([
          supabase.from('genres').select('*'),
          supabase.from('audiobooks').select('*').order('created_at', { ascending: false }),
          supabase.from('user_library').select('book_id').eq('user_id', session.user.id),
          supabase.from('likes').select('book_id').eq('user_id', session.user.id),
          supabase.from('likes').select('book_id')
        ])

        if (genresRes.error) throw genresRes.error
        if (booksRes.error) throw booksRes.error

        const counts = {}
        if (allLikesRes.data) {
          allLikesRes.data.forEach(item => { counts[item.book_id] = (counts[item.book_id] || 0) + 1 })
        }

        setGenres(genresRes.data || [])
        setAudiobooks(booksRes.data || [])
        setLibrary(libRes.data?.map(item => item.book_id) || [])
        setLikedBooks(likesRes.data?.map(item => item.book_id) || [])
        setGlobalLikesMap(counts)

        try {
          const storedRecents = JSON.parse(localStorage.getItem('hearable_recent_books') || '[]')
          setRecentBookIds(storedRecents)
        } catch(e) {}

      } catch (error) {
        setErrorDebug(error?.message || String(error))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router, supabase])

  const trackRecentBook = (bookId) => {
    setRecentBookIds(prev => {
      const updatedList = [bookId, ...prev.filter(id => id !== bookId)].slice(0, 15)
      localStorage.setItem('hearable_recent_books', JSON.stringify(updatedList))
      return updatedList
    })
  }

  const handleToggleBookmark = async (bookId, e) => {
    if (e) e.stopPropagation()
    const isSaved = library.includes(bookId)
    setLibrary(prev => isSaved ? prev.filter(id => id !== bookId) : [...prev, bookId])
    try {
      if (isSaved) await supabase.from('user_library').delete().match({ user_id: userId, book_id: bookId })
      else await supabase.from('user_library').insert([{ user_id: userId, book_id: bookId }])
    } catch (err) { setLibrary(prev => isSaved ? [...prev, bookId] : prev.filter(id => id !== bookId)) }
  }

  const handleToggleLike = async (bookId, e) => {
    if (e) e.stopPropagation()
    const isLiked = likedBooks.includes(bookId)
    setLikedBooks(prev => isLiked ? prev.filter(id => id !== bookId) : [...prev, bookId])
    setGlobalLikesMap(prev => ({ ...prev, [bookId]: (prev[bookId] || 0) + (isLiked ? -1 : 1) }))
    try {
      if (isLiked) await supabase.from('likes').delete().match({ user_id: userId, book_id: bookId })
      else await supabase.from('likes').insert([{ user_id: userId, book_id: bookId }])
    } catch (err) {
      setLikedBooks(prev => isLiked ? [...prev, bookId] : prev.filter(id => id !== bookId))
      setGlobalLikesMap(prev => ({ ...prev, [bookId]: (prev[bookId] || 0) + (isLiked ? 1 : -1) }))
    }
  }

  const handleShareClick = async (book, e) => {
    if (e) e.stopPropagation()
    const shareData = { title: book.title, text: `Check out "${book.title}" on Hearable!`, url: typeof window !== 'undefined' ? `${window.location.origin}/dashboard?book=${book.id}` : '' }
    try {
      if (navigator.share) await navigator.share(shareData)
      else { await navigator.clipboard.writeText(shareData.url); alert('Share link copied!'); }
    } catch (err) {}
  }

  // Handle Review Submission
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (ratingValue === 0) return alert('Please select a star rating first.')
    
    setIsSubmittingReview(true)
    try {
      const payload = { user_id: userId, book_id: activeBookContext.id, rating: ratingValue, comment_text: commentText.trim() }
      const { error } = await supabase.from('reviews').upsert(payload, { onConflict: 'user_id, book_id' })
      if (error) throw error

      setBookReviews(prev => {
        const filtered = prev.filter(r => r.user_id !== userId)
        return [{ ...payload, created_at: new Date().toISOString() }, ...filtered]
      })
    } catch (err) {
      console.error("Failed to post review:", err)
      alert("Could not save review. Please try again.")
    } finally {
      setIsSubmittingReview(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlayPause(); } 
      else if (e.code === 'ArrowRight') { e.preventDefault(); if (audioRef.current) audioRef.current.currentTime += 15; } 
      else if (e.code === 'ArrowLeft') { e.preventDefault(); if (audioRef.current) audioRef.current.currentTime -= 15; }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentActiveChapter, isPlaying]) 

  const handleTimeUpdate = () => {
    const audio = audioRef.current; if (!audio) return;
    const current = audio.currentTime; const duration = audio.duration || 1;
    if (rangeScrubberRef.current) {
      rangeScrubberRef.current.value = current
      rangeScrubberRef.current.style.background = `linear-gradient(to right, #e50914 0%, #e50914 ${(current / duration) * 100}%, rgba(255,255,255,0.1) ${(current / duration) * 100}%, rgba(255,255,255,0.1) 100%)`
    }
    if (persistentScrubberRef.current) persistentScrubberRef.current.style.width = `${(current / duration) * 100}%`
    if (expandedCurrentTimeTextRef.current) expandedCurrentTimeTextRef.current.innerText = formatTime(current)
    if (Math.floor(current) % 6 === 0 && currentActiveChapter?.id) localStorage.setItem(`hearable_resume_${currentActiveChapter.id}`, current)
  }

  const handleLoadedMetadata = () => {
    const audio = audioRef.current; if (!audio) return;
    setDurationSec(audio.duration)
    audio.playbackRate = playbackRate; audio.volume = isMuted ? 0 : volume;
    if (rangeScrubberRef.current) rangeScrubberRef.current.max = audio.duration
    if (expandedDurationTextRef.current) expandedDurationTextRef.current.innerText = formatTime(audio.duration)
    if (currentActiveChapter?.id) {
      const savedTime = localStorage.getItem(`hearable_resume_${currentActiveChapter.id}`)
      if (savedTime && parseFloat(savedTime) > 2 && parseFloat(savedTime) < audio.duration - 10) audio.currentTime = parseFloat(savedTime)
    }
  }

  useEffect(() => {
    if (currentActiveChapter && audioRef.current) {
      audioRef.current.load()
      const playPromise = audioRef.current.play()
      playPromiseRef.current = playPromise
      if (playPromise !== undefined) playPromise.then(() => setIsPlaying(true)).catch(() => {})
    }
  }, [currentActiveChapter])

  const togglePlayPause = (e) => {
    if (e) e.stopPropagation(); const audio = audioRef.current; if (!audio) return;
    if (audio.paused) {
      const playPromise = audio.play(); playPromiseRef.current = playPromise;
      if (playPromise !== undefined) playPromise.then(() => setIsPlaying(true)).catch(() => {})
    } else {
      if (playPromiseRef.current) playPromiseRef.current.then(() => { audio.pause(); setIsPlaying(false) }).catch(() => { audio.pause(); setIsPlaying(false) })
      else { audio.pause(); setIsPlaying(false) }
    }
  }

  const handleSpeedToggle = (e) => {
    e.stopPropagation(); const rates = [0.75, 1, 1.25, 1.5, 2]
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length]
    setPlaybackRate(nextRate); if (audioRef.current) audioRef.current.playbackRate = nextRate
  }

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value); setVolume(val); if (val > 0 && isMuted) setIsMuted(false);
    if (audioRef.current) { audioRef.current.volume = val; audioRef.current.muted = val === 0; }
  }

  const toggleMute = (e) => {
    e.stopPropagation(); const newMutedState = !isMuted; setIsMuted(newMutedState);
    if (audioRef.current) audioRef.current.muted = newMutedState
  }

  const handleDelete = async (bookId, e) => {
    e.stopPropagation()
    if (!window.confirm("WARNING: Are you sure you want to permanently purge this Master Book?")) return
    try {
      const { error } = await supabase.from('audiobooks').delete().eq('id', bookId)
      if (error) throw error
      setAudiobooks((prev) => prev.filter((book) => book.id !== bookId))
      if (activeBookContext?.id === bookId) { setActiveBookContext(null); setCurrentActiveChapter(null); setIsPlayerExpanded(false) }
    } catch (err) {}
  }

  const handleTrackCardSelect = async (book) => {
    setActiveBookContext(book)
    setIsPlayerExpanded(true)
    trackRecentBook(book.id) 

    setRatingValue(0)
    setRatingHover(0)
    setCommentText('')

    try {
      // Fetch Chapters
      const { data: chapData, error: chapError } = await supabase.from('chapters').select('*').eq('book_id', book.id).order('chapter_number', { ascending: true })
      if (chapError) throw chapError

      if (chapData && chapData.length > 0) {
        setBookChapters(chapData)
        if (!currentActiveChapter || currentActiveChapter.book_id !== book.id) setCurrentActiveChapter(chapData[0])
      } else if (book.audio_url && book.audio_url !== 'EPISODIC_SERIES') {
        const standaloneVirtualChapter = { id: book.id, book_id: book.id, chapter_number: 1, title: 'Complete Audio', audio_url: book.audio_url, duration: 'FULL TRACK' }
        setBookChapters([standaloneVirtualChapter])
        if (!currentActiveChapter || currentActiveChapter.id !== book.id) setCurrentActiveChapter(standaloneVirtualChapter)
      } else setBookChapters([])

      // Fetch Reviews
      const { data: reviewsData, error: reviewError } = await supabase.from('reviews').select('*').eq('book_id', book.id).order('created_at', { ascending: false })
      if (!reviewError && reviewsData) {
        setBookReviews(reviewsData)
        const myReview = reviewsData.find(r => r.user_id === userId)
        if (myReview) {
          setRatingValue(myReview.rating)
          setCommentText(myReview.comment_text || '')
        }
      }
    } catch (err) {}
  }

  const handlePlayFromMainCard = (book) => {
      if (activeBookContext?.id === book.id && isPlaying) togglePlayPause(); else handleTrackCardSelect(book);
  }

  const handleChapterSelect = (chapter) => {
      if (currentActiveChapter?.id === chapter.id) togglePlayPause(); else setCurrentActiveChapter(chapter);
  }

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00'
    const minutes = Math.floor(secs / 60)
    const seconds = Math.floor(secs % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  const handleLogout = async () => { try { await supabase.auth.signOut(); router.refresh(); router.push('/auth'); } catch (err) {} }

  const displayAudiobooks = useMemo(() => {
    const activeSearch = searchQuery.toLowerCase().trim()
    return audiobooks.filter(book => {
      const matchesSearch = !activeSearch || book.title.toLowerCase().includes(activeSearch) || book.author.toLowerCase().includes(activeSearch)
      const matchesView = activeView !== 'library' || library.includes(book.id)
      return matchesSearch && matchesView
    })
  }, [audiobooks, library, activeView, searchQuery])

  const recommendedBooks = useMemo(() => {
    if (likedBooks.length === 0 && library.length === 0) return []
    const genreCounts = {}
    const combinedInterests = [...new Set([...likedBooks, ...library])]
    combinedInterests.forEach(id => {
      const book = audiobooks.find(b => b.id === id)
      if (book) genreCounts[book.genre_slug] = (genreCounts[book.genre_slug] || 0) + 1
    })
    const topGenre = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a])[0]
    if (!topGenre) return []
    return audiobooks.filter(b => b.genre_slug === topGenre && !combinedInterests.includes(b.id)).slice(0, 10)
  }, [audiobooks, likedBooks, library])

  const featuredHeroBook = audiobooks[0] || { title: "SPECULATIVE STORIES", author: "CURATED FOR YOU", description: "Immerse yourself inside exceptional creative literature.", cover_url: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&auto=format&fit=crop&q=80" };

  const activeBookAvgRating = useMemo(() => {
    if (bookReviews.length === 0) return 'NEW'
    const total = bookReviews.reduce((acc, rev) => acc + rev.rating, 0)
    return (total / bookReviews.length).toFixed(1)
  }, [bookReviews])

  if (loading) return <div className="min-h-screen bg-[#141414] flex items-center justify-center p-6"><Loader /></div>

  return (
    <div className="min-h-screen bg-[#141414] text-white font-['Hanken_Grotesk'] antialiased pb-40 select-none transition-colors duration-300 overflow-x-hidden">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&display=swap');
        .thick-scrubber::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #e50914; cursor: pointer; transition: transform 0.1s ease; }
        .thick-scrubber::-webkit-slider-thumb:hover { transform: scale(1.3); }
        .volume-scrubber::-webkit-slider-thumb { appearance: none; width: 10px; height: 10px; border-radius: 50%; background: #ffffff; cursor: pointer; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Global Hidden Audio Streaming Controller */}
      {currentActiveChapter && (
        <audio 
          ref={audioRef} 
          src={currentActiveChapter.audio_url} 
          onTimeUpdate={handleTimeUpdate} 
          onLoadedMetadata={handleLoadedMetadata} 
          onEnded={() => {
            const currentIndex = bookChapters.findIndex(c => c.id === currentActiveChapter.id);
            if (currentIndex >= 0 && currentIndex < bookChapters.length - 1) setCurrentActiveChapter(bookChapters[currentIndex + 1]);
            else setIsPlaying(false);
          }}
        />
      )}

      {/* Navigation Header */}
      <header className="bg-gradient-to-b from-black via-black/70 to-transparent fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
        <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => { setActiveView('catalog'); setSearchQuery(''); }}>
            <span className="text-[#e50914] text-2xl md:text-3xl font-[900] tracking-tighter antialiased">HEARABLE</span>
            <span className="bg-[#e50914] text-white text-[8px] font-[900] px-1.5 py-0.5 rounded-sm ml-1 tracking-widest uppercase">V4.5 (SOCIAL)</span>
          </div>
          <button onClick={handleLogout} className="md:hidden flex items-center justify-center p-2 border border-white/10 rounded-md text-neutral-400 hover:text-white"><LogOut className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
          <div className="flex items-center gap-5 text-[13px] font-medium text-neutral-300 transition-colors">
            <button onClick={() => { setActiveView('catalog'); setSearchQuery(''); }} className={`hover:text-neutral-400 transition-colors ${activeView === 'catalog' && searchQuery === '' ? 'text-white font-bold' : ''}`}>Home</button>
            <button onClick={() => { setActiveView('library'); setSearchQuery(''); }} className={`hover:text-neutral-400 transition-colors ${activeView === 'library' ? 'text-white font-bold' : ''}`}>My List</button>
            <button onClick={() => router.push('/profile')} className="hover:text-neutral-400 transition-colors">Profile</button>
            <button onClick={() => router.push('/admin')} className="text-[#e50914] font-bold hover:text-[#b81d24] transition-colors">Upload</button>
          </div>
          <div className="relative flex items-center bg-black/60 border border-white/20 rounded-md px-3 py-1.5 backdrop-blur-md max-w-[180px] md:max-w-xs group">
            <Search className="h-4 w-4 text-neutral-400 group-focus-within:text-[#e50914] transition-colors mr-2" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Titles, authors..." className="bg-transparent text-white placeholder-neutral-500 font-medium text-xs outline-none w-full" />
          </div>
        </div>
      </header>

      {/* Hero Billboard */}
      {searchQuery === '' && activeView === 'catalog' && (
        <div className="relative w-full h-[56vw] min-h-[420px] max-h-[780px] bg-black overflow-hidden transform-gpu select-none">
          <img src={featuredHeroBook.cover_url} alt={featuredHeroBook.title} className="w-full h-full object-cover object-center opacity-70 md:opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-black/10 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/80 via-transparent to-transparent hidden md:block" />
          <div className="absolute left-6 md:left-12 bottom-[30%] md:bottom-[22%] max-w-xl space-y-4 md:space-y-5 z-10">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-[900] tracking-tight text-white uppercase leading-none antialiased drop-shadow-md">{featuredHeroBook.title}</h1>
            <p className="text-neutral-200 font-normal text-xs sm:text-sm md:text-[15px] leading-relaxed drop-shadow max-w-lg line-clamp-3 md:line-clamp-none">{featuredHeroBook.description}</p>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => handlePlayFromMainCard(featuredHeroBook)} className="flex items-center justify-center gap-2 bg-white text-black font-extrabold text-xs sm:text-sm md:text-base px-6 sm:px-8 py-2.5 sm:py-3 rounded-md hover:bg-white/80 transition-all active:scale-95 shadow-md">
                {activeBookContext?.id === featuredHeroBook.id && isPlaying ? <Pause className="h-4 w-4 fill-current text-black" /> : <Play className="h-4 w-4 fill-current text-black ml-0.5" />}
                <span>{activeBookContext?.id === featuredHeroBook.id && isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button onClick={() => handleTrackCardSelect(featuredHeroBook)} className="flex items-center justify-center gap-2 bg-neutral-500/30 text-white font-extrabold text-xs sm:text-sm md:text-base px-6 sm:px-8 py-2.5 sm:py-3 rounded-md border border-white/10 hover:bg-neutral-500/50 transition-all backdrop-blur-md active:scale-95">
                <Info className="h-4 w-4" /><span>More Info</span>
              </button>
            </div>
          </div>
          <div className="absolute right-0 bottom-[35%] md:bottom-[25%] bg-zinc-900/50 border-l-4 border-neutral-400 pl-4 pr-12 py-2 backdrop-blur-sm flex items-center font-bold text-xs uppercase tracking-widest text-neutral-300 z-10">U/A 16+</div>
        </div>
      )}

      <main className={`max-w-7xl mx-auto px-6 md:px-12 relative z-20 ${searchQuery !== '' || activeView !== 'catalog' ? 'pt-28' : '-mt-12 sm:-mt-20 md:-mt-28'}`}>
        
        {/* Continue Listening Row */}
        {activeView === 'catalog' && searchQuery === '' && recentBookIds.length > 0 && (
          <section className="space-y-3 relative pb-8">
            <div className="flex items-baseline gap-2"><h2 className="text-[14px] sm:text-[18px] md:text-[22px] font-bold tracking-tight text-white leading-none antialiased hover:text-[#e50914] transition-colors cursor-pointer">Continue Listening</h2></div>
            <div className="w-full h-[1px] bg-gradient-to-r from-[#e50914]/40 via-neutral-800 to-transparent -mt-2 opacity-60" />
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scroll-smooth no-scrollbar transform-gpu will-change-transform">
              {recentBookIds.map(id => {
                const book = audiobooks.find(b => b.id === id); if (!book) return null;
                return <AudiobookCard key={`recent-${book.id}`} book={book} isSaved={library.includes(book.id)} isLiked={likedBooks.includes(book.id)} likeCount={globalLikesMap[book.id] || 0} isCurrentlyPlaying={activeBookContext?.id === book.id && isPlaying} isPlaying={isPlaying} onToggleBookmark={handleToggleBookmark} onToggleLike={handleToggleLike} onShare={handleShareClick} onDelete={handleDelete} onPlayClick={handlePlayFromMainCard} onExpandView={handleTrackCardSelect} />
              })}
            </div>
          </section>
        )}

        {/* Top Picks For You */}
        {activeView === 'catalog' && searchQuery === '' && recommendedBooks.length > 0 && (
          <section className="space-y-3 relative pb-8">
            <div className="flex items-baseline gap-2"><h2 className="text-[14px] sm:text-[18px] md:text-[22px] font-bold tracking-tight text-white leading-none antialiased hover:text-[#e50914] transition-colors cursor-pointer">Top Picks For You</h2></div>
            <div className="w-full h-[1px] bg-gradient-to-r from-[#e50914]/40 via-neutral-800 to-transparent -mt-2 opacity-60" />
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scroll-smooth no-scrollbar transform-gpu will-change-transform">
              {recommendedBooks.map(book => (
                <AudiobookCard key={`rec-${book.id}`} book={book} isSaved={library.includes(book.id)} isLiked={likedBooks.includes(book.id)} likeCount={globalLikesMap[book.id] || 0} isCurrentlyPlaying={activeBookContext?.id === book.id && isPlaying} isPlaying={isPlaying} onToggleBookmark={handleToggleBookmark} onToggleLike={handleToggleLike} onShare={handleShareClick} onDelete={handleDelete} onPlayClick={handlePlayFromMainCard} onExpandView={handleTrackCardSelect} />
              ))}
            </div>
          </section>
        )}

        {/* Dynamic Shelf Rows */}
        {genres.map((genre) => {
          const rowBooks = displayAudiobooks.filter(b => b.genre_slug === genre.slug)
          if (rowBooks.length === 0) return null
          return (
            <section key={genre.id} className="space-y-3 relative pb-8">
              <div className="flex items-baseline gap-2"><h2 className="text-[14px] sm:text-[18px] md:text-[22px] font-bold tracking-tight text-white leading-none hover:text-[#e50914] cursor-pointer transition-colors antialiased">{genre.name}</h2></div>
              <div className="w-full h-[1px] bg-gradient-to-r from-[#e50914]/40 via-neutral-800 to-transparent -mt-2 opacity-60" />
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scroll-smooth no-scrollbar transform-gpu will-change-transform">
                {rowBooks.map((book) => (
                  <AudiobookCard key={book.id} book={book} isSaved={library.includes(book.id)} isLiked={likedBooks.includes(book.id)} likeCount={globalLikesMap[book.id] || 0} isCurrentlyPlaying={activeBookContext?.id === book.id && isPlaying} isPlaying={isPlaying} onToggleBookmark={handleToggleBookmark} onToggleLike={handleToggleLike} onShare={handleShareClick} onDelete={handleDelete} onPlayClick={handlePlayFromMainCard} onExpandView={handleTrackCardSelect} />
                ))}
              </div>
            </section>
          )
        })}
      </main>

      {/* DOCKBAR */}
      <AnimatePresence>
        {currentActiveChapter && activeBookContext && !isPlayerExpanded && (
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ ease: "easeInOut", duration: 0.2 }} className="fixed bottom-0 left-0 right-0 bg-[#181818]/95 backdrop-blur-xl border-t border-neutral-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-40 shadow-[0_-15px_40px_rgba(0,0,0,0.6)]">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10"><div ref={persistentScrubberRef} className="h-full bg-[#e50914] w-0 transition-all duration-300" /></div>
            <div className="flex items-center gap-4 w-full sm:w-1/2 cursor-pointer" onClick={() => setIsPlayerExpanded(true)}>
              <div className="relative h-12 w-12 flex-shrink-0 bg-neutral-900 border border-white/10 rounded-md overflow-hidden"><img src={activeBookContext.cover_url} alt="" className="h-full w-full object-cover" /></div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-white tracking-tight uppercase truncate">{currentActiveChapter.title}</h4>
                <p className="text-[#e50914] font-bold text-xs uppercase mt-0.5 tracking-wider truncate">CH. {currentActiveChapter.chapter_number} // {activeBookContext.title}</p>
              </div>
            </div>
            <div className="w-full sm:w-1/2 flex items-center justify-end gap-4">
              <button onClick={togglePlayPause} className="bg-white text-black p-2.5 rounded-full hover:bg-[#e50914] hover:text-white transition-colors flex items-center justify-center shadow-md active:scale-95 border-none outline-none">{isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}</button>
              <div onClick={() => setIsPlayerExpanded(true)} className="bg-[#e50914] hover:bg-[#b81d24] text-white text-xs font-bold uppercase tracking-widest px-5 py-3 rounded-md shadow-lg cursor-pointer flex items-center gap-2"><span>Expand</span><ArrowRight className="h-4 w-4" /></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPANDED PLAYER & REVIEWS */}
      <AnimatePresence>
        {activeBookContext && isPlayerExpanded && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }} transition={{ duration: 0.2, ease: "linear" }} className="fixed inset-0 bg-gradient-to-b from-[#0f0f0f] to-[#050404] z-[100] flex flex-col p-6 md:p-12 select-none overflow-y-auto pb-48">
            <div className="w-full flex items-center justify-between z-10 flex-shrink-0 mb-8 max-w-5xl mx-auto">
              <button onClick={() => setIsPlayerExpanded(false)} className="bg-black/40 border border-white/10 text-white p-3 rounded-full hover:bg-white hover:text-black transition-all transform hover:scale-105 active:scale-95"><ChevronLeft className="w-6 h-6" /></button>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-[0.2em] hidden sm:block">AUDIO STREAM CONTEXT</span>
              <div className="w-14" />
            </div>

            <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-12 items-start z-10 pb-12 border-b border-white/10">
              <div className="relative aspect-[4/5] w-[40%] sm:w-[35%] md:w-[30%] max-w-[280px] flex-shrink-0 bg-neutral-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl mx-auto md:mx-0">
                <img src={activeBookContext.cover_url} alt={activeBookContext.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-60" />
              </div>
              
              <div className="text-left space-y-5 flex-1">
                <div className="space-y-1">
                  <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-none text-white antialiased">{activeBookContext.title}</h1>
                  <p className="font-bold text-base lg:text-lg text-[#e50914] uppercase tracking-wide">BY {activeBookContext.author}</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <span className="bg-white/5 border border-white/10 text-neutral-300 px-3 py-1 font-mono text-[10px] uppercase tracking-widest rounded-md">{activeBookContext.genre_slug}</span>
                    <span className="text-neutral-500 font-bold text-[10px] uppercase tracking-widest">{bookChapters.length === 1 && bookChapters[0].title === 'Complete Audio' ? '1 STANDALONE TRACK' : `${bookChapters.length} CHAPTERS`}</span>
                    <div className="flex items-center gap-1 bg-[#e50914]/10 text-[#e50914] px-2 py-1 rounded-md border border-[#e50914]/20">
                      <Star className="w-3 h-3 fill-current" />
                      <span className="text-[10px] font-bold font-mono tracking-widest">{activeBookAvgRating} ({bookReviews.length})</span>
                    </div>
                </div>
                
                {activeBookContext.description && <p className="text-neutral-400 text-sm md:text-[15px] leading-relaxed uppercase font-medium tracking-wide">{activeBookContext.description}</p>}

                {bookChapters.length > 0 && (
                    <button onClick={() => { if (!currentActiveChapter) setCurrentActiveChapter(bookChapters[0]); else togglePlayPause(); }} className="mt-4 bg-white hover:bg-neutral-200 text-black px-8 py-3 rounded-md font-extrabold text-sm uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95">
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                        {isPlaying ? 'PAUSE STREAM' : 'PLAY AUDIO'}
                    </button>
                )}
              </div>
            </div>

            {/* Episodes List */}
            <div className="w-full max-w-5xl mx-auto py-10 z-10">
                <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-white uppercase tracking-wider antialiased">Episodes</h2></div>
                {bookChapters.length === 0 ? (
                    <div className="p-8 border border-neutral-800 border-dashed rounded-xl bg-black/20 text-center"><ListOrdered className="w-8 h-8 text-neutral-600 mx-auto mb-3" /><p className="text-neutral-400 font-bold text-sm uppercase tracking-widest">No audio indexed for this title yet.</p></div>
                ) : (
                    <div className="space-y-2">
                        {bookChapters.map((chapter) => {
                            const isThisChapterPlaying = currentActiveChapter?.id === chapter.id;
                            return (
                                <div key={chapter.id} onClick={() => handleChapterSelect(chapter)} className={`group flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${isThisChapterPlaying ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent hover:bg-white/5'}`}>
                                    <div className="w-12 text-center text-xl font-black text-neutral-600 group-hover:text-white transition-colors">
                                        {isThisChapterPlaying && isPlaying ? (
                                            <div className="flex items-end justify-center gap-1 h-6">
                                                <motion.div animate={{ height: [4, 16, 4] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-1 bg-[#e50914]" />
                                                <motion.div animate={{ height: [8, 20, 8] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-1 bg-[#e50914]" />
                                                <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-1 bg-[#e50914]" />
                                            </div>
                                        ) : ( chapter.chapter_number )}
                                    </div>
                                    <div className="flex-1"><h4 className={`font-bold text-sm md:text-base tracking-wide uppercase transition-colors ${isThisChapterPlaying ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>{chapter.title}</h4></div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">{isThisChapterPlaying && isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}</div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Reviews & Ratings Section */}
            <div className="w-full max-w-5xl mx-auto py-10 z-10 border-t border-white/10">
              <h2 className="text-xl font-bold text-white uppercase tracking-wider antialiased mb-6">Community Reviews</h2>
              
              <div className="bg-[#181818] p-6 rounded-xl border border-white/5 mb-8">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Leave your rating</h3>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`w-8 h-8 cursor-pointer transition-colors ${star <= (ratingHover || ratingValue) ? 'text-[#e50914] fill-current' : 'text-neutral-700'}`} onMouseEnter={() => setRatingHover(star)} onMouseLeave={() => setRatingHover(0)} onClick={() => setRatingValue(star)} />
                    ))}
                  </div>
                  <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="WHAT DID YOU THINK OF THIS AUDIOBOOK?" className="w-full bg-black/40 text-white p-4 border border-neutral-800 rounded-xl focus:border-[#e50914] focus:outline-none text-sm font-medium resize-none" rows="3" />
                  <button disabled={isSubmittingReview} type="submit" className="bg-white hover:bg-neutral-200 text-black px-6 py-2.5 rounded-md font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-50">
                    {isSubmittingReview ? 'POSTING...' : 'SUBMIT REVIEW'}
                  </button>
                </form>
              </div>

              <div className="space-y-4">
                {bookReviews.length === 0 ? (
                  <p className="text-neutral-500 font-bold text-sm uppercase tracking-widest text-center py-8">NO REVIEWS YET. BE THE FIRST.</p>
                ) : (
                  bookReviews.map((review, i) => (
                    <div key={i} className="bg-transparent p-4 rounded-xl border border-white/5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center text-xs font-bold text-neutral-400">U</div>
                          <span className="text-xs font-bold text-neutral-300 uppercase tracking-widest">Listener</span>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-[#e50914] fill-current' : 'text-neutral-800'}`} />)}
                        </div>
                      </div>
                      {review.comment_text && <p className="text-neutral-400 text-sm font-medium leading-relaxed">"{review.comment_text}"</p>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* STICKY BOTTOM PLAYER CONTROLS */}
            <AnimatePresence>
                {currentActiveChapter && (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }} 
                        animate={{ y: 0, opacity: 1 }} 
                        exit={{ y: 100, opacity: 0 }} 
                        className="sticky bottom-0 w-full max-w-4xl mx-auto bg-[#181818]/95 border border-white/10 p-6 md:p-8 rounded-2xl backdrop-blur-xl z-20 mt-auto shadow-2xl flex-shrink-0"
                    >
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                                <span>CH. {currentActiveChapter.chapter_number} // {currentActiveChapter.title}</span>
                            </div>
                            <div className="relative w-full flex items-center">
                                <input 
                                    ref={rangeScrubberRef} 
                                    type="range" 
                                    min="0" 
                                    max={durationSec || 100} 
                                    defaultValue="0" 
                                    onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value) }} 
                                    className="w-full h-1 bg-white/10 appearance-none cursor-pointer outline-none transition-all thick-scrubber rounded-full" 
                                />
                            </div>
                            <div className="flex justify-between items-center text-xs font-mono font-bold text-neutral-500 tracking-wider">
                                <span ref={expandedCurrentTimeTextRef}>0:00</span>
                                <span ref={expandedDurationTextRef}>{formatTime(durationSec)}</span>
                            </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2 mt-4">
                            <div className="flex items-center gap-3 w-full sm:w-1/3 justify-center sm:justify-start">
                                <button onClick={toggleMute} className="text-neutral-400 hover:text-white transition-colors p-2">
                                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </button>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="1" 
                                    step="0.01" 
                                    value={isMuted ? 0 : volume} 
                                    onChange={handleVolumeChange} 
                                    className="w-24 h-1 bg-white/20 appearance-none rounded-full volume-scrubber outline-none" 
                                />
                            </div>
                            
                            <div className="flex items-center justify-center gap-6 md:gap-8 w-full sm:w-1/3">
                                <button onClick={() => { if(audioRef.current) audioRef.current.currentTime -= 15 }} className="text-neutral-400 hover:text-white p-2">
                                    <ChevronLeft className="w-7 h-7" />
                                </button>
                                <button onClick={togglePlayPause} className="bg-white text-black p-4 md:p-5 rounded-full hover:bg-[#e50914] hover:text-white transition-all flex items-center justify-center shadow-lg transform active:scale-95 border-none outline-none">
                                    {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current translate-x-0.5" />}
                                </button>
                                <button onClick={() => { if(audioRef.current) audioRef.current.currentTime += 15 }} className="text-neutral-400 hover:text-white p-2">
                                    <ChevronRight className="w-7 h-7" />
                                </button>
                            </div>
                            
                            <div className="flex items-center justify-center sm:justify-end w-full sm:w-1/3">
                                <button onClick={handleSpeedToggle} className="text-xs font-bold bg-black/40 border border-white/10 text-neutral-300 hover:text-white px-4 py-2 rounded-md w-16 text-center">
                                    {playbackRate}X
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
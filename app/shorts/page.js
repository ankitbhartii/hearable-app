'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Play,
  Pause,
  Heart,
  MessageCircle,
  Share2,
  ChevronLeft,
  Headphones,
  Volume2,
  VolumeX,
  X
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import Loader from '../Loader'

export default function ShortsFeed() {
  const supabase = createClient()
  const router = useRouter()

  const [shorts, setShorts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [userInteracted, setUserInteracted] = useState(false)
  const [userId, setUserId] = useState(null)
  const [likedBooks, setLikedBooks] = useState([])
  const [likeCountsMap, setLikeCountsMap] = useState({})
  const [reviewCountsMap, setReviewCountsMap] = useState({})
  const [progressMap, setProgressMap] = useState({})
  const [durationMap, setDurationMap] = useState({})
  const [activeCommentShort, setActiveCommentShort] = useState(null)
  const [commentReviews, setCommentReviews] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)

  const containerRef = useRef(null)
  const audioRefs = useRef([])
  const itemRefs = useRef([])

  useEffect(() => {
    async function fetchShorts() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/auth')
          return
        }

        setUserId(session.user.id)

        const [shortsRes, userLikesRes, allLikesRes, reviewCountsRes] = await Promise.all([
          supabase
            .from('shorts')
            .select(`
              id,
              book_id,
              audio_url,
              caption,
              created_at,
              audiobooks (
                id,
                title,
                author,
                cover_url
              )
            `)
            .order('created_at', { ascending: false }),
          supabase.from('likes').select('book_id').eq('user_id', session.user.id),
          supabase.from('likes').select('book_id'),
          supabase.from('reviews').select('book_id')
        ])

        if (shortsRes.error) throw shortsRes.error

        const feedShorts = (shortsRes.data || []).filter((short) => short.audiobooks && short.audio_url)
        const likeCounts = {}
        const reviewCounts = {}

        ;(allLikesRes.data || []).forEach((item) => {
          likeCounts[item.book_id] = (likeCounts[item.book_id] || 0) + 1
        })

        ;(reviewCountsRes.data || []).forEach((item) => {
          reviewCounts[item.book_id] = (reviewCounts[item.book_id] || 0) + 1
        })

        setShorts(feedShorts)
        setLikedBooks(userLikesRes.data?.map((item) => item.book_id) || [])
        setLikeCountsMap(likeCounts)
        setReviewCountsMap(reviewCounts)
      } catch (error) {
        console.error('Failed to load shorts feed', error)
      } finally {
        setLoading(false)
      }
    }

    fetchShorts()
  }, [router, supabase])

  useEffect(() => {
    if (!userInteracted) return

    audioRefs.current.forEach((audio, index) => {
      if (!audio) return

      audio.muted = isMuted

      if (index === activeIndex && isPlaying) {
        const playPromise = audio.play()
        if (playPromise !== undefined) {
          playPromise.catch(() => {})
        }
      } else {
        audio.pause()
      }
    })
  }, [activeIndex, isPlaying, isMuted, userInteracted])

  useEffect(() => {
    if (!userInteracted) return
    const activeAudio = audioRefs.current[activeIndex]
    if (activeAudio) activeAudio.currentTime = 0
  }, [activeIndex, userInteracted])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!userInteracted || shorts.length === 0) return

      if (event.code === 'Space') {
        event.preventDefault()
        setIsPlaying((prev) => !prev)
      }

      if (event.code === 'ArrowDown') {
        event.preventDefault()
        scrollToShort(activeIndex + 1)
      }

      if (event.code === 'ArrowUp') {
        event.preventDefault()
        scrollToShort(activeIndex - 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, shorts.length, userInteracted])

  const scrollToShort = (index) => {
    const boundedIndex = Math.max(0, Math.min(index, shorts.length - 1))
    itemRefs.current[boundedIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleScroll = () => {
    if (!containerRef.current) return
    const scrollPosition = containerRef.current.scrollTop
    const windowHeight = window.innerHeight
    const currentIndex = Math.max(0, Math.min(Math.round(scrollPosition / windowHeight), shorts.length - 1))

    if (currentIndex !== activeIndex) {
      setActiveIndex(currentIndex)
      setIsPlaying(true)
    }
  }

  const handleLoadedMetadata = (shortId, event) => {
    const audio = event.target
    if (!audio) return
    setDurationMap((prev) => ({ ...prev, [shortId]: audio.duration || 0 }))
  }

  const handleTimeUpdate = (shortId, event) => {
    const audio = event.target
    if (!audio) return
    const duration = audio.duration || 0
    const currentTime = audio.currentTime || 0
    setProgressMap((prev) => ({ ...prev, [shortId]: duration ? (currentTime / duration) * 100 : 0 }))
  }

  const togglePlayState = () => setIsPlaying((prev) => !prev)

  const toggleLike = async (bookId) => {
    if (!userId) return

    const isLiked = likedBooks.includes(bookId)
    setLikedBooks((prev) => isLiked ? prev.filter((id) => id !== bookId) : [...prev, bookId])
    setLikeCountsMap((prev) => ({ ...prev, [bookId]: (prev[bookId] || 0) + (isLiked ? -1 : 1) }))

    try {
      if (isLiked) {
        const { error } = await supabase.from('likes').delete().match({ user_id: userId, book_id: bookId })
        if (error) throw error
      } else {
        const { error } = await supabase.from('likes').insert([{ user_id: userId, book_id: bookId }])
        if (error) throw error
      }
    } catch (error) {
      setLikedBooks((prev) => isLiked ? [...prev, bookId] : prev.filter((id) => id !== bookId))
      setLikeCountsMap((prev) => ({ ...prev, [bookId]: (prev[bookId] || 0) + (isLiked ? 1 : -1) }))
    }
  }

  const openComments = async (short) => {
    setActiveCommentShort(short)
    setLoadingComments(true)

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('book_id', short.book_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCommentReviews(data || [])
    } catch (error) {
      setCommentReviews([])
    } finally {
      setLoadingComments(false)
    }
  }

  const closeComments = () => {
    setActiveCommentShort(null)
    setCommentReviews([])
  }

  const shareShort = async (short) => {
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/player?id=${short.book_id}` : ''
    try {
      if (navigator.share) {
        await navigator.share({
          title: short.audiobooks?.title,
          text: short.caption || `Listen to ${short.audiobooks?.title}`,
          url: shareUrl
        })
        return
      }

      await navigator.clipboard.writeText(shareUrl)
      alert('Short link copied to clipboard.')
    } catch (error) {}
  }

  const openFullBook = (bookId) => {
    router.push(`/player?id=${bookId}`)
  }

  if (loading) return <div className="h-screen bg-black flex items-center justify-center"><Loader /></div>

  if (!userInteracted) {
    return (
      <div
        className="h-screen bg-[#050404] flex flex-col items-center justify-center text-center p-6 space-y-6"
        style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
      >
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&display=swap');
        `}</style>
        <Headphones className="w-16 h-16 text-[#e50914] animate-pulse" />
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Enter The Feed</h1>
        <p className="text-neutral-400 font-bold text-sm uppercase tracking-widest max-w-xs">Tap below to unlock playback, swipe through hooks, and control the reels feed.</p>
        <button
          onClick={() => setUserInteracted(true)}
          className="bg-[#e50914] hover:bg-[#b81d24] text-white px-8 py-4 rounded-full font-black uppercase tracking-widest transition-all transform active:scale-95 shadow-[0_0_20px_rgba(229,9,20,0.4)]"
        >
          Initialize Audio
        </button>
        <button onClick={() => router.push('/dashboard')} className="mt-8 text-neutral-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">
          Return to Dashboard
        </button>
      </div>
    )
  }

  if (shorts.length === 0) {
    return (
      <div
        className="h-screen bg-[#050404] flex flex-col items-center justify-center text-center p-6 space-y-4"
        style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
      >
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&display=swap');
        `}</style>
        <button onClick={() => router.push('/dashboard')} className="absolute top-6 left-6 text-white bg-white/10 p-3 rounded-full hover:bg-white hover:text-black transition-colors"><ChevronLeft /></button>
        <p className="text-white font-black text-xl uppercase tracking-widest">Feed Empty</p>
        <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">No shorts detected in database.</p>
      </div>
    )
  }

  return (
    <div
      className="bg-black h-screen w-full overflow-hidden relative"
      style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&display=swap');
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="absolute top-0 left-0 w-full z-50 p-5 sm:p-6 flex justify-between items-center pointer-events-none">
        <button onClick={() => router.push('/dashboard')} className="pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 text-white p-3 rounded-full hover:bg-white hover:text-black transition-colors shadow-lg">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <span className="text-white font-black uppercase tracking-[0.3em] text-xs sm:text-sm drop-shadow-lg">Shorts</span>
          <p className="text-[10px] sm:text-xs text-white/50 font-bold tracking-[0.24em] uppercase mt-1">{activeIndex + 1} / {shorts.length}</p>
        </div>
        <button onClick={() => setIsMuted((prev) => !prev)} className="pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 text-white p-3 rounded-full hover:bg-white hover:text-black transition-colors shadow-lg">
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
      >
        {shorts.map((short, index) => {
          const isActive = index === activeIndex
          const book = short.audiobooks
          const isLiked = likedBooks.includes(short.book_id)
          const likeCount = likeCountsMap[short.book_id] || 0
          const reviewCount = reviewCountsMap[short.book_id] || 0
          const progress = progressMap[short.id] || 0
          const duration = durationMap[short.id] || 0

          return (
            <div
              key={short.id}
              ref={(element) => { itemRefs.current[index] = element }}
              className="h-screen w-full snap-start relative flex items-center justify-center bg-neutral-900 group"
            >
              <audio
                ref={(element) => { audioRefs.current[index] = element }}
                src={short.audio_url}
                loop
                playsInline
                muted={isMuted}
                onLoadedMetadata={(event) => handleLoadedMetadata(short.id, event)}
                onTimeUpdate={(event) => handleTimeUpdate(short.id, event)}
              />

              <div className="absolute inset-0 z-0">
                <img src={book.cover_url} alt="" className="w-full h-full object-cover opacity-30 scale-110 blur-3xl" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-[#050404] opacity-95" />
              </div>

              <div className="absolute top-0 left-0 right-0 h-1 z-30 bg-white/10">
                <div className="h-full bg-white transition-all duration-150" style={{ width: `${progress}%` }} />
              </div>

              <div className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center justify-center cursor-pointer" onClick={togglePlayState}>
                <motion.div
                  animate={{ scale: isActive && isPlaying ? 1.04 : 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                  className="w-52 sm:w-72 aspect-[4/5] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.72)] border border-white/10 relative"
                >
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  <div className={`absolute inset-0 bg-black/45 flex items-center justify-center transition-opacity duration-300 ${!isPlaying && isActive ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-full">
                      <Play className="w-10 h-10 text-white fill-current ml-1" />
                    </div>
                  </div>
                </motion.div>

                <div className="mt-5 flex items-center gap-3 rounded-full border border-white/10 bg-black/35 px-4 py-2 backdrop-blur-md">
                  <button onClick={(event) => { event.stopPropagation(); togglePlayState() }} className="text-white">
                    {isPlaying && isActive ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-[0.28em] text-white/80">
                    {duration ? `${Math.round(duration)}s audio hook` : 'Audio hook'}
                  </span>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 w-full p-6 pb-8 md:pb-12 z-20 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="bg-[#e50914] text-white text-[9px] font-black px-2 py-1 rounded-sm tracking-widest uppercase shadow-md">Featured Hook</div>
                  <div className="bg-white/10 text-white text-[9px] font-black px-2 py-1 rounded-sm tracking-widest uppercase shadow-md">
                    {reviewCount} reviews
                  </div>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase leading-none drop-shadow-md">{book.title}</h2>
                <p className="text-neutral-300 text-sm font-bold uppercase tracking-wider drop-shadow-md">By {book.author}</p>
                {short.caption && <p className="text-white/80 text-sm max-w-md font-medium leading-relaxed mt-2 drop-shadow-md">"{short.caption}"</p>}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => openFullBook(short.book_id)}
                    className="bg-white text-black py-3 px-6 rounded-full font-black text-xs uppercase tracking-widest w-max flex items-center gap-2 hover:bg-neutral-200 transition-colors active:scale-95 shadow-xl"
                  >
                    <Play className="w-4 h-4 fill-current" /> Open Full Player
                  </button>
                  <button
                    onClick={() => openComments(short)}
                    className="bg-white/10 text-white py-3 px-5 rounded-full font-black text-xs uppercase tracking-widest w-max flex items-center gap-2 hover:bg-white/20 transition-colors active:scale-95 backdrop-blur-md"
                  >
                    <MessageCircle className="w-4 h-4" /> View Comments
                  </button>
                </div>
              </div>

              <div className="absolute right-4 bottom-24 z-30 flex flex-col gap-6 items-center">
                <button onClick={() => toggleLike(short.book_id)} className="flex flex-col items-center gap-1 group pointer-events-auto">
                  <div className={`backdrop-blur-md p-3 rounded-full border transition-colors shadow-lg ${isLiked ? 'bg-[#e50914] border-[#e50914]' : 'bg-black/40 border-white/10 group-hover:bg-[#e50914]'}`}>
                    <Heart className={`w-6 h-6 text-white ${isLiked ? 'fill-current' : ''}`} />
                  </div>
                  <span className="text-white text-[10px] font-bold tracking-widest drop-shadow-md">{likeCount}</span>
                </button>

                <button onClick={() => openComments(short)} className="flex flex-col items-center gap-1 group pointer-events-auto">
                  <div className="bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/10 group-hover:bg-white group-hover:text-black transition-colors shadow-lg">
                    <MessageCircle className="w-6 h-6 text-white group-hover:text-black" />
                  </div>
                  <span className="text-white text-[10px] font-bold tracking-widest drop-shadow-md">{reviewCount}</span>
                </button>

                <button onClick={() => shareShort(short)} className="flex flex-col items-center gap-1 group pointer-events-auto">
                  <div className="bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/10 group-hover:bg-white group-hover:text-black transition-colors shadow-lg">
                    <Share2 className="w-6 h-6 text-white group-hover:text-black" />
                  </div>
                  <span className="text-white text-[10px] font-bold tracking-widest drop-shadow-md">Share</span>
                </button>

                <button onClick={() => openFullBook(short.book_id)} className={`mt-4 w-12 h-12 rounded-full overflow-hidden border-2 border-neutral-800 shadow-xl pointer-events-auto ${isActive && isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover scale-150" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <AnimatePresence>
        {activeCommentShort && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/70 backdrop-blur-md p-4 sm:p-6 flex justify-end"
            onClick={closeComments}
          >
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md h-full rounded-[28px] border border-white/10 bg-[#0d0d0d] p-6 flex flex-col"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-white/40">Comments</p>
                  <h3 className="mt-2 text-2xl font-black text-white tracking-tight">{activeCommentShort.audiobooks?.title}</h3>
                </div>
                <button onClick={closeComments} className="h-11 w-11 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white hover:text-black transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 flex-1 overflow-y-auto space-y-4 pr-1">
                {loadingComments ? (
                  <div className="h-full flex items-center justify-center text-white/60 font-bold uppercase tracking-[0.24em] text-xs">Loading Reviews</div>
                ) : commentReviews.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-white/55">
                    No reviews yet for this audiobook.
                  </div>
                ) : (
                  commentReviews.map((review, index) => (
                    <div key={`${review.user_id || 'review'}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">Listener</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`w-3.5 h-3.5 ${star <= review.rating ? 'fill-current text-[#ffd166]' : 'text-white/15'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-white/70">{review.comment_text || 'Loved this one.'}</p>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => openFullBook(activeCommentShort.book_id)}
                className="mt-5 bg-white text-black py-3 px-5 rounded-full font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" /> Open Full Player
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { createClient } from '../utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChevronLeft,
  Star,
  Play,
  Pause,
  ListOrdered,
  Volume2,
  VolumeX,
  MoreHorizontal,
  Maximize2,
  SkipBack,
  SkipForward,
  Shuffle,
  Plus,
  Disc3,
  Users
} from 'lucide-react'
import { motion } from 'framer-motion'
import Loader from '../Loader'

const DEFAULT_PLAYER_PALETTE = {
  primary: [10, 108, 108],
  secondary: [5, 45, 49],
  accent: [215, 247, 245]
}

const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)))
const mixColors = (left, right, ratio) => left.map((value, index) => clampChannel(value * (1 - ratio) + right[index] * ratio))
const rgbValue = (color) => color.map(clampChannel).join(', ')

function PlayerContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookId = searchParams.get('id')

  const [loading, setLoading] = useState(true)
  const [activeBook, setActiveBook] = useState(null)
  const [bookChapters, setBookChapters] = useState([])
  const [bookReviews, setBookReviews] = useState([])
  const [userId, setUserId] = useState(null)
  const [currentActiveChapter, setCurrentActiveChapter] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTimeSec, setCurrentTimeSec] = useState(0)
  const [durationSec, setDurationSec] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [ratingHover, setRatingHover] = useState(0)
  const [ratingValue, setRatingValue] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [playerPalette, setPlayerPalette] = useState(DEFAULT_PLAYER_PALETTE)
  const [isSavedToLibrary, setIsSavedToLibrary] = useState(false)
  const [isTogglingLibrary, setIsTogglingLibrary] = useState(false)
  const [isShuffleOn, setIsShuffleOn] = useState(false)
  const [shuffledChapterIds, setShuffledChapterIds] = useState([])
  const [showAllEpisodes, setShowAllEpisodes] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const audioRef = useRef(null)
  const playPromiseRef = useRef(null)
  const heroSectionRef = useRef(null)
  const episodesSectionRef = useRef(null)
  const reviewsSectionRef = useRef(null)

  useEffect(() => {
    async function fetchBookData() {
      if (!bookId) {
        router.push('/dashboard')
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/auth')
          return
        }

        setUserId(session.user.id)

        const { data: bookData, error: bookError } = await supabase.from('audiobooks').select('*').eq('id', bookId).single()
        if (bookError || !bookData) throw bookError || new Error('Book not found')
        setActiveBook(bookData)

        const { data: savedData } = await supabase.from('user_library').select('book_id').eq('user_id', session.user.id).eq('book_id', bookId).maybeSingle()
        setIsSavedToLibrary(Boolean(savedData?.book_id))

        const { data: chapData } = await supabase.from('chapters').select('*').eq('book_id', bookId).order('chapter_number', { ascending: true })
        if (chapData && chapData.length > 0) {
          setBookChapters(chapData)
          setCurrentActiveChapter(chapData[0])
        } else if (bookData.audio_url) {
          const standalone = {
            id: bookData.id,
            book_id: bookData.id,
            chapter_number: 1,
            title: 'Complete Audio',
            audio_url: bookData.audio_url,
            duration: 'FULL TRACK'
          }
          setBookChapters([standalone])
          setCurrentActiveChapter([standalone])
        }

        const { data: reviewsData } = await supabase.from('reviews').select('*').eq('book_id', bookId).order('created_at', { ascending: false })
        if (reviewsData) {
          setBookReviews(reviewsData)
          const myReview = reviewsData.find((review) => review.user_id === session.user.id)
          if (myReview) {
            setRatingValue(myReview.rating)
            setCommentText(myReview.comment_text || '')
          }
        }
      } catch (error) {
        console.error(error)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchBookData()
  }, [bookId, router, supabase])

  useEffect(() => {
    if (!currentActiveChapter || !audioRef.current) return

    setCurrentTimeSec(0)
    setDurationSec(0)
    audioRef.current.load()
    const playPromise = audioRef.current.play()
    playPromiseRef.current = playPromise
    if (playPromise !== undefined) {
      playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    }
  }, [currentActiveChapter])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    if (!activeBook?.cover_url) {
      setPlayerPalette(DEFAULT_PLAYER_PALETTE)
      return
    }

    let cancelled = false
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.referrerPolicy = 'no-referrer'

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 24
        canvas.height = 24
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Canvas context unavailable')

        context.drawImage(image, 0, 0, 24, 24)
        const { data } = context.getImageData(0, 0, 24, 24)

        let redTotal = 0
        let greenTotal = 0
        let blueTotal = 0
        let visiblePixels = 0
        let accentColor = DEFAULT_PLAYER_PALETTE.accent
        let accentScore = -1

        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3]
          if (alpha < 140) continue

          const red = data[index]
          const green = data[index + 1]
          const blue = data[index + 2]

          redTotal += red
          greenTotal += green
          blueTotal += blue
          visiblePixels += 1

          const maxValue = Math.max(red, green, blue)
          const minValue = Math.min(red, green, blue)
          const saturation = maxValue === 0 ? 0 : (maxValue - minValue) / maxValue
          const brightness = (red + green + blue) / 3
          const score = saturation * 1.4 + brightness / 255

          if (score > accentScore) {
            accentScore = score
            accentColor = [red, green, blue]
          }
        }

        if (!visiblePixels) throw new Error('No visible pixels available')

        const averageColor = [
          redTotal / visiblePixels,
          greenTotal / visiblePixels,
          blueTotal / visiblePixels
        ]

        const primary = mixColors(averageColor, [255, 255, 255], 0.12)
        const secondary = mixColors(averageColor, [0, 0, 0], 0.78)
        const accent = mixColors(accentColor, [255, 255, 255], 0.18)

        if (!cancelled) {
          setPlayerPalette({ primary, secondary, accent })
        }
      } catch (error) {
        if (!cancelled) setPlayerPalette(DEFAULT_PLAYER_PALETTE)
      }
    }

    image.onerror = () => {
      if (!cancelled) setPlayerPalette(DEFAULT_PLAYER_PALETTE)
    }

    image.src = activeBook.cover_url

    return () => {
      cancelled = true
    }
  }, [activeBook?.cover_url])

  const buildShuffledChapterOrder = (startChapterId) => {
    const chapterIds = bookChapters.map((chapter) => chapter.id)
    if (chapterIds.length <= 1) return chapterIds

    const remainingIds = chapterIds.filter((chapterId) => chapterId !== startChapterId)
    for (let index = remainingIds.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1))
      const currentValue = remainingIds[index]
      remainingIds[index] = remainingIds[randomIndex]
      remainingIds[randomIndex] = currentValue
    }

    return startChapterId ? [startChapterId, ...remainingIds] : remainingIds
  }

  const getPlaybackOrderIds = () => {
    if (isShuffleOn && shuffledChapterIds.length === bookChapters.length) return shuffledChapterIds
    return bookChapters.map((chapter) => chapter.id)
  }

  const getChapterById = (chapterId) => bookChapters.find((chapter) => chapter.id === chapterId)

  useEffect(() => {
    if (!isShuffleOn || bookChapters.length === 0) return
    if (shuffledChapterIds.length === bookChapters.length) return
    setShuffledChapterIds(buildShuffledChapterOrder(currentActiveChapter?.id))
  }, [bookChapters, isShuffleOn, shuffledChapterIds.length, currentActiveChapter?.id])

  const setChapterAsCurrent = (chapter, options = {}) => {
    if (!chapter) return
    const { rebuildShuffleQueue = false } = options
    if (rebuildShuffleQueue && isShuffleOn) {
      setShuffledChapterIds(buildShuffledChapterOrder(chapter.id))
    }
    setCurrentActiveChapter(chapter)
  }

  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (!audio) return
    setCurrentTimeSec(audio.currentTime)
  }

  const handleLoadedMetadata = () => {
    const audio = audioRef.current
    if (!audio) return
    setDurationSec(audio.duration || 0)
    audio.playbackRate = playbackRate
    audio.volume = isMuted ? 0 : volume
  }

  const handleAudioEnded = () => {
    const playbackOrderIds = getPlaybackOrderIds()
    const currentIndex = playbackOrderIds.findIndex((chapterId) => chapterId === currentActiveChapter?.id)
    if (currentIndex >= 0 && currentIndex < playbackOrderIds.length - 1) {
      setChapterAsCurrent(getChapterById(playbackOrderIds[currentIndex + 1]))
      return
    }

    setIsPlaying(false)
    setCurrentTimeSec(0)
    if (audioRef.current) audioRef.current.currentTime = 0
  }

  const togglePlayPause = (event) => {
    if (event) event.stopPropagation()
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      const playPromise = audio.play()
      playPromiseRef.current = playPromise
      if (playPromise !== undefined) playPromise.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
      return
    }

    if (playPromiseRef.current) {
      playPromiseRef.current.then(() => {
        audio.pause()
        setIsPlaying(false)
      }).catch(() => {
        audio.pause()
        setIsPlaying(false)
      })
      return
    }

    audio.pause()
    setIsPlaying(false)
  }

  const handleSpeedToggle = () => {
    const rates = [0.75, 1, 1.25, 1.5, 2]
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length]
    setPlaybackRate(nextRate)
    if (audioRef.current) audioRef.current.playbackRate = nextRate
  }

  const handleVolumeChange = (event) => {
    const nextVolume = parseFloat(event.target.value)
    setVolume(nextVolume)
    if (nextVolume > 0 && isMuted) setIsMuted(false)
    if (audioRef.current) {
      audioRef.current.volume = nextVolume
      audioRef.current.muted = nextVolume === 0
    }
  }

  const toggleMute = () => {
    const nextMutedState = !isMuted
    setIsMuted(nextMutedState)
    if (audioRef.current) audioRef.current.muted = nextMutedState
  }

  const handleChapterSelect = (chapter, options = {}) => {
    const { forcePlay = false } = options
    if (currentActiveChapter?.id === chapter.id && !forcePlay) {
      togglePlayPause()
      return
    }
    setChapterAsCurrent(chapter, { rebuildShuffleQueue: isShuffleOn })
  }

  const handleSeekChange = (event) => {
    const nextTime = Number(event.target.value)
    setCurrentTimeSec(nextTime)
    if (audioRef.current) audioRef.current.currentTime = nextTime
  }

  const handleSeekBy = (amount) => {
    const audio = audioRef.current
    if (!audio) return
    const nextTime = Math.min(Math.max(audio.currentTime + amount, 0), durationSec || 0)
    audio.currentTime = nextTime
    setCurrentTimeSec(nextTime)
  }

  const handleChapterStep = (direction) => {
    const playbackOrderIds = getPlaybackOrderIds()
    const currentIndex = playbackOrderIds.findIndex((chapterId) => chapterId === currentActiveChapter?.id)
    if (currentIndex < 0) return
    const nextChapter = getChapterById(playbackOrderIds[currentIndex + direction])
    if (nextChapter) setChapterAsCurrent(nextChapter)
  }

  const handleToggleShuffle = () => {
    if (bookChapters.length <= 1) return
    if (isShuffleOn) {
      setIsShuffleOn(false)
      setShuffledChapterIds([])
      return
    }

    setShuffledChapterIds(buildShuffledChapterOrder(currentActiveChapter?.id))
    setIsShuffleOn(true)
  }

  const handleChapterDropdownChange = (event) => {
    const nextChapter = getChapterById(event.target.value)
    if (nextChapter) handleChapterSelect(nextChapter, { forcePlay: true })
  }

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSharePlayer = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) {
        await navigator.share({ title: activeBook?.title, text: `Listen to ${activeBook?.title}`, url: shareUrl })
        return
      }

      await navigator.clipboard.writeText(shareUrl)
      alert('Player link copied to clipboard.')
    } catch (error) {}
  }

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        return
      }
      await document.exitFullscreen()
    } catch (error) {}
  }

  const handleToggleLibrary = async () => {
    if (!userId || isTogglingLibrary) return

    const nextSavedState = !isSavedToLibrary
    setIsTogglingLibrary(true)
    setIsSavedToLibrary(nextSavedState)

    try {
      if (nextSavedState) {
        const { error } = await supabase.from('user_library').insert([{ user_id: userId, book_id: bookId }])
        if (error) throw error
      } else {
        const { error } = await supabase.from('user_library').delete().match({ user_id: userId, book_id: bookId })
        if (error) throw error
      }
    } catch (error) {
      setIsSavedToLibrary(!nextSavedState)
      alert('Could not update your library right now.')
    } finally {
      setIsTogglingLibrary(false)
    }
  }

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00'
    const minutes = Math.floor(secs / 60)
    const seconds = Math.floor(secs % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  const handleSubmitReview = async (event) => {
    event.preventDefault()
    if (ratingValue === 0) return alert('Please select a star rating first.')

    setIsSubmittingReview(true)
    try {
      const payload = { user_id: userId, book_id: bookId, rating: ratingValue, comment_text: commentText.trim() }
      const { error } = await supabase.from('reviews').upsert(payload, { onConflict: 'user_id, book_id' })
      if (error) throw error

      setBookReviews((prev) => {
        const filtered = prev.filter((review) => review.user_id !== userId)
        return [{ ...payload, created_at: new Date().toISOString() }, ...filtered]
      })
    } catch (error) {
      alert('Could not save review.')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const playbackOrderIds = getPlaybackOrderIds()
  const avgRating = bookReviews.length > 0 ? (bookReviews.reduce((acc, review) => acc + review.rating, 0) / bookReviews.length).toFixed(1) : 'NEW'
  const currentChapterIndex = playbackOrderIds.findIndex((chapterId) => chapterId === currentActiveChapter?.id)
  const reviewPreview = bookReviews.slice(0, 2)
  const chapterCountLabel = bookChapters.length === 1 && bookChapters[0]?.title === 'Complete Audio' ? 'Standalone audio' : `${bookChapters.length} chapters`
  const heroColor = mixColors(playerPalette.primary, playerPalette.accent, 0.22)
  const midColor = mixColors(playerPalette.primary, playerPalette.secondary, 0.42)
  const visibleEpisodes = showAllEpisodes ? bookChapters : bookChapters.slice(0, 4)

  if (loading || !activeBook) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: `rgb(${rgbValue(DEFAULT_PLAYER_PALETTE.secondary)})` }}>
        <Loader />
      </div>
    )
  }

  return (
    <div className="min-h-screen overflow-hidden text-white" style={{ backgroundColor: `rgb(${rgbValue(playerPalette.secondary)})` }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        html {
          scroll-behavior: smooth;
        }
        body {
          font-family: 'Outfit', sans-serif;
          background: #031416;
        }
        .player-range {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        .player-range::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 999px;
          background: linear-gradient(to right, #ffffff 0%, #ffffff var(--progress, 0%), rgba(255,255,255,0.22) var(--progress, 0%), rgba(255,255,255,0.22) 100%);
        }
        .player-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          margin-top: -5px;
          border-radius: 999px;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.14);
          cursor: pointer;
        }
        .volume-range {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        .volume-range::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 999px;
          background: linear-gradient(to right, #ffffff 0%, #ffffff var(--volume, 0%), rgba(255,255,255,0.18) var(--volume, 0%), rgba(255,255,255,0.18) 100%);
        }
        .volume-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          margin-top: -4px;
          border-radius: 999px;
          background: #ffffff;
          cursor: pointer;
        }
      `}</style>

      {currentActiveChapter && (
        <audio
          ref={audioRef}
          src={currentActiveChapter.audio_url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={handleAudioEnded}
        />
      )}

      <div className="relative min-h-screen overflow-y-auto pb-40">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at top, rgba(${rgbValue(playerPalette.accent)}, 0.30), transparent 30%), radial-gradient(circle at bottom, rgba(${rgbValue(playerPalette.primary)}, 0.42), transparent 28%), radial-gradient(circle at left, rgba(${rgbValue(heroColor)}, 0.18), transparent 34%)`
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, rgba(${rgbValue(heroColor)}, 0.94) 0%, rgba(${rgbValue(midColor)}, 0.90) 42%, rgba(${rgbValue(playerPalette.secondary)}, 0.98) 100%)`
            }}
          />
          <div
            className="absolute inset-0 opacity-35 blur-3xl"
            style={{
              backgroundImage: `url(${activeBook.cover_url})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover'
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,14,16,0.08),rgba(2,14,16,0.62),rgba(2,14,16,0.88))]" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen max-w-[1500px] flex-col px-4 pb-8 pt-3 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between rounded-[28px] border border-white/10 bg-black/10 px-4 py-3 backdrop-blur-sm">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white hover:text-[#062629]"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold tracking-tight sm:text-2xl">{activeBook.title}</p>
                <p className="truncate text-xs uppercase tracking-[0.28em] text-white/60">{activeBook.author}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-white/80">
              <button onClick={() => scrollToSection(heroSectionRef)} className="hidden h-10 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium transition hover:bg-white/10 sm:flex">
                <Disc3 className="mr-2 h-4 w-4" />
                Now Playing
              </button>
              <button onClick={() => scrollToSection(reviewsSectionRef)} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10">
                <Users className="h-4 w-4" />
              </button>
              <button onClick={handleSharePlayer} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10">
                <MoreHorizontal className="h-4 w-4" />
              </button>
              <button onClick={handleToggleFullscreen} className={`flex h-10 w-10 items-center justify-center rounded-full border transition hover:bg-white/10 ${isFullscreen ? 'border-white/40 bg-white/12 text-white' : 'border-white/10 bg-white/5'}`}>
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </header>

          <main className="flex-1 pt-8 sm:pt-10">
            <section ref={heroSectionRef} className="grid items-center gap-10 lg:grid-cols-[1fr_minmax(320px,620px)_1fr]">
              <div className="hidden lg:block" />

              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="mx-auto w-full max-w-[620px]"
              >
                <div className="rounded-[34px] border border-white/12 bg-black/10 p-3 shadow-[0_40px_120px_rgba(0,0,0,0.34)] backdrop-blur-sm">
                  <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
                    <img
                      src={activeBook.cover_url}
                      alt={activeBook.title}
                      className="aspect-square w-full object-cover"
                    />
                  </div>
                </div>

                <div className="px-2 pt-6 text-center">
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <span className="rounded-full border border-white/15 bg-black/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                      {activeBook.genre_slug || 'Featured'}
                    </span>
                    <span className="rounded-full border border-white/15 bg-black/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                      {chapterCountLabel}
                    </span>
                    <span className="flex items-center gap-1 rounded-full border border-white/15 bg-black/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                      <Star className="h-3.5 w-3.5 fill-current text-[#ffd166]" />
                      {avgRating}
                    </span>
                  </div>
                  <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{activeBook.title}</h1>
                  <p className="mt-2 text-sm uppercase tracking-[0.34em] text-white/60">{activeBook.author}</p>
                  {activeBook.description && (
                    <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
                      {activeBook.description}
                    </p>
                  )}
                </div>
              </motion.div>

              <div className="hidden lg:block" />
            </section>

            <section className="mx-auto mt-10 grid max-w-6xl gap-6 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="rounded-[30px] border border-white/10 bg-[#1d1c1c]/92 p-7 shadow-[0_20px_80px_rgba(0,0,0,0.28)]"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-semibold tracking-tight">About this title</h2>
                  <button onClick={handleToggleLibrary} disabled={isTogglingLibrary} className={`flex h-11 w-11 items-center justify-center rounded-full border transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60 ${isSavedToLibrary ? 'border-white/30 bg-white text-black' : 'border-white/10 bg-white/5 text-white/80'}`}>
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-5 text-base leading-8 text-white/72">
                  {activeBook.description || 'An immersive audio experience with a cinematic full-screen player and a focused listening flow.'}
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.26em] text-white/45">Current chapter</p>
                    <p className="mt-2 text-lg font-semibold">{currentActiveChapter?.title || 'Not selected'}</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.26em] text-white/45">Community rating</p>
                    <p className="mt-2 text-lg font-semibold">{avgRating} <span className="text-sm font-normal text-white/55">from {bookReviews.length} reviews</span></p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                ref={episodesSectionRef}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.16 }}
                className="rounded-[30px] border border-white/10 bg-[#1d1c1c]/92 p-7 shadow-[0_20px_80px_rgba(0,0,0,0.28)]"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-semibold tracking-tight">Episodes</h2>
                  <button onClick={() => setShowAllEpisodes((prev) => !prev)} className="text-sm font-semibold text-white/55 transition hover:text-white">
                    {showAllEpisodes ? 'Show less' : 'Show all'}
                  </button>
                </div>

                {bookChapters.length > 1 && (
                  <div className="mt-5">
                    <label className="mb-2 block text-xs uppercase tracking-[0.28em] text-white/40">Jump to chapter</label>
                    <select
                      value={currentActiveChapter?.id || ''}
                      onChange={handleChapterDropdownChange}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                    >
                      {bookChapters.map((chapter) => (
                        <option key={chapter.id} value={chapter.id} className="bg-[#171717] text-white">
                          {`Chapter ${chapter.chapter_number}: ${chapter.title}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {bookChapters.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-white/55">
                    No audio indexed for this title yet.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {visibleEpisodes.map((chapter) => {
                      const isCurrent = currentActiveChapter?.id === chapter.id
                      return (
                        <button
                          key={chapter.id}
                          onClick={() => handleChapterSelect(chapter)}
                          className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition ${
                            isCurrent
                              ? 'border-white/18 bg-white/10'
                              : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/25 text-sm font-semibold text-white/78">
                            {isCurrent && isPlaying ? <Pause className="h-4 w-4 fill-current" /> : chapter.chapter_number}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold">{chapter.title}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.26em] text-white/45">
                              Chapter {chapter.chapter_number}
                            </p>
                          </div>
                          <Play className="h-4 w-4 text-white/45" />
                        </button>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            </section>

            <section className="mx-auto mt-6 grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <motion.div
                ref={reviewsSectionRef}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="rounded-[30px] border border-white/10 bg-[#171717]/92 p-7"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold tracking-tight">Community reviews</h2>
                  <div className="flex items-center gap-2 text-sm text-white/55">
                    <Users className="h-4 w-4" />
                    {bookReviews.length}
                  </div>
                </div>

                <form onSubmit={handleSubmitReview} className="mt-5 space-y-4">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-7 w-7 cursor-pointer transition ${star <= (ratingHover || ratingValue) ? 'fill-current text-[#ffd166]' : 'text-white/20'}`}
                        onMouseEnter={() => setRatingHover(star)}
                        onMouseLeave={() => setRatingHover(0)}
                        onClick={() => setRatingValue(star)}
                      />
                    ))}
                  </div>
                  <textarea
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="Add a quick thought about the listening experience"
                    className="h-28 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
                  />
                  <button
                    disabled={isSubmittingReview}
                    type="submit"
                    className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#d7f7f5] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmittingReview ? 'Saving...' : 'Save review'}
                  </button>
                </form>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.24 }}
                className="rounded-[30px] border border-white/10 bg-[#171717]/92 p-7"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold tracking-tight">Listener notes</h2>
                  <ListOrdered className="h-5 w-5 text-white/45" />
                </div>

                <div className="mt-5 space-y-4">
                  {reviewPreview.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-white/55">
                      Reviews will appear here after the first listener shares feedback.
                    </div>
                  ) : (
                    reviewPreview.map((review, index) => (
                      <div key={`${review.user_id || 'review'}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.04] p-5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">Listener</p>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className={`h-3.5 w-3.5 ${star <= review.rating ? 'fill-current text-[#ffd166]' : 'text-white/15'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-white/68">
                          {review.comment_text || 'Loved the atmosphere and pacing throughout the story.'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </section>
          </main>
        </div>
      </div>

      {currentActiveChapter && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/96 px-4 py-4 backdrop-blur-2xl"
        >
          <div className="mx-auto grid max-w-[1700px] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,720px)_minmax(0,1fr)] lg:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <img src={activeBook.cover_url} alt={activeBook.title} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-medium tracking-tight">{activeBook.title}</p>
                <p className="truncate text-sm text-white/58">{activeBook.author}</p>
              </div>
              <button onClick={handleToggleLibrary} disabled={isTogglingLibrary} className={`hidden h-10 w-10 items-center justify-center rounded-full border text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 md:flex ${isSavedToLibrary ? 'border-white/30 bg-white/15 text-white' : 'border-white/10'}`}>
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col items-center">
              <div className="mb-3 flex items-center gap-4">
                <button onClick={handleToggleShuffle} className={`transition hover:text-white ${isShuffleOn ? 'text-white' : 'text-white/55'}`}>
                  <Shuffle className="h-4 w-4" />
                </button>
                <button
                  onClick={() => currentChapterIndex > 0 ? handleChapterStep(-1) : handleSeekBy(-15)}
                  className="text-white/75 transition hover:text-white"
                >
                  <SkipBack className="h-6 w-6" />
                </button>
                <button
                  onClick={togglePlayPause}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black transition hover:scale-[1.02] hover:bg-[#d7f7f5]"
                >
                  {isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="h-7 w-7 fill-current translate-x-0.5" />}
                </button>
                <button
                  onClick={() => currentChapterIndex < playbackOrderIds.length - 1 ? handleChapterStep(1) : handleSeekBy(15)}
                  className="text-white/75 transition hover:text-white"
                >
                  <SkipForward className="h-6 w-6" />
                </button>
                <button onClick={handleSpeedToggle} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white">
                  {playbackRate}x
                </button>
              </div>

              <div className="flex w-full max-w-[680px] items-center gap-3 text-sm text-white/72">
                <span className="w-10 text-right tabular-nums">{formatTime(currentTimeSec)}</span>
                <input
                  type="range"
                  min="0"
                  max={durationSec || 0}
                  value={Math.min(currentTimeSec, durationSec || 0)}
                  onChange={handleSeekChange}
                  className="player-range h-6 w-full cursor-pointer"
                  style={{ '--progress': `${durationSec ? (currentTimeSec / durationSec) * 100 : 0}%` }}
                />
                <span className="w-10 tabular-nums">{formatTime(durationSec)}</span>
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.28em] text-white/38">
                Chapter {currentActiveChapter.chapter_number} • {currentActiveChapter.title}
              </p>
            </div>

            <div className="flex items-center justify-end gap-4">
              {bookChapters.length > 1 ? (
                <select
                  value={currentActiveChapter?.id || ''}
                  onChange={handleChapterDropdownChange}
                  className="hidden rounded-full border border-white/10 bg-transparent px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/75 outline-none transition hover:bg-white/10 md:block"
                >
                  {bookChapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id} className="bg-black text-white">
                      {`Chapter ${chapter.chapter_number}`}
                    </option>
                  ))}
                </select>
              ) : (
                <button onClick={() => scrollToSection(episodesSectionRef)} className="hidden rounded-full border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/55 transition hover:bg-white/10 hover:text-white md:block">
                  {bookChapters.length} tracks
                </button>
              )}
              <button onClick={() => scrollToSection(reviewsSectionRef)} className="hidden rounded-full border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/55 transition hover:bg-white/10 hover:text-white lg:block">
                Reviews {bookReviews.length}
              </button>
              <button onClick={toggleMute} className="text-white/72 transition hover:text-white">
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="volume-range hidden w-28 cursor-pointer lg:block"
                style={{ '--volume': `${(isMuted ? 0 : volume) * 100}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default function DedicatedPlayerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#052d31" }}>
        <Loader />
      </div>
    }>
      <PlayerContent />
    </Suspense>
  )
}
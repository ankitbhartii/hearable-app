'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, UploadCloud, ImageIcon, Film, Type, User, FileText, ListOrdered, BookOpen, Disc, Layers, PlaySquare } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AdminConsole() {
  const supabase = createClient()
  const router = useRouter()

  // System States
  const [activeTab, setActiveTab] = useState('book') 
  const [existingBooks, setExistingBooks] = useState([])
  const [publishing, setPublishing] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [isError, setIsError] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatusString, setUploadStatusString] = useState('')

  // Book Form States
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [genreSlug, setGenreSlug] = useState('fantasy')
  const [description, setDescription] = useState('')
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [bookFormat, setBookFormat] = useState('episodic') 
  const [masterAudioFile, setMasterAudioFile] = useState(null)

  // Chapter Form States
  const [selectedBookId, setSelectedBookId] = useState('')
  const [chapterNumber, setChapterNumber] = useState('')
  const [chapterTitle, setChapterTitle] = useState('')
  const [audioFile, setAudioFile] = useState(null)

  // Shorts Form States
  const [selectedBookIdForShort, setSelectedBookIdForShort] = useState('')
  const [shortCaption, setShortCaption] = useState('')
  const [shortAudioFile, setShortAudioFile] = useState(null)

  const fetchBooks = async () => {
    const { data } = await supabase.from('audiobooks').select('id, title').order('created_at', { ascending: false })
    if (data) {
      setExistingBooks(data)
      if (data.length > 0) {
        if (!selectedBookId) setSelectedBookId(data[0].id)
        if (!selectedBookIdForShort) setSelectedBookIdForShort(data[0].id)
      }
    }
  }

  useEffect(() => {
    async function checkAdminAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return; }
      fetchBooks()
    }
    checkAdminAuth()
  }, [router, supabase])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
    }
  }

  // ==========================================
  // PUBLISH MASTER BOOK RECORD 
  // ==========================================
  const handlePublishBook = async (e) => {
    e.preventDefault()
    if (!coverFile) { setIsError(true); setStatusMessage('COVER ARTWORK IS REQUIRED.'); return; }
    if (bookFormat === 'single' && !masterAudioFile) { setIsError(true); setStatusMessage('AUDIO FILE REQUIRED FOR STANDALONE FORMAT.'); return; }

    setPublishing(true); setIsError(false); setStatusMessage(null); setUploadProgress(0);

    try {
      setUploadStatusString('SECURING ARTWORK SIGNATURE...')
      const imgSignRes = await fetch('/api/cloudinary-sign', { method: 'POST' })
      const imgSignData = await imgSignRes.json()

      setUploadStatusString('UPLOADING COVER ARTWORK...')
      const imgFormData = new FormData()
      imgFormData.append('file', coverFile)
      imgFormData.append('api_key', imgSignData.apiKey)
      imgFormData.append('timestamp', imgSignData.timestamp)
      imgFormData.append('signature', imgSignData.signature)
      imgFormData.append('folder', 'audiobooks')

      const imgUploadRes = await fetch(`https://api.cloudinary.com/v1_1/${imgSignData.cloudName}/image/upload`, { method: 'POST', body: imgFormData })
      const imgUploadData = await imgUploadRes.json()
      
      let finalAudioUrl = 'EPISODIC_SERIES' 

      if (bookFormat === 'single') {
        setUploadStatusString('STREAMING MASTER AUDIO TO CDN...')
        const audioSignRes = await fetch('/api/cloudinary-sign', { method: 'POST' })
        const audioSignData = await audioSignRes.json()

        const audioFormData = new FormData()
        audioFormData.append('file', masterAudioFile)
        audioFormData.append('api_key', audioSignData.apiKey)
        audioFormData.append('timestamp', audioSignData.timestamp)
        audioFormData.append('signature', audioSignData.signature)
        audioFormData.append('folder', 'audiobooks')

        const cloudinaryAudioResponse = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('POST', `https://api.cloudinary.com/v1_1/${audioSignData.cloudName}/video/upload`, true)
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100)
              setUploadProgress(pct)
              setUploadStatusString(`AUDIO STREAM: ${pct}%`)
            }
          }
          xhr.onload = () => { 
            if (xhr.status === 200) {
              resolve(JSON.parse(xhr.responseText))
            } else { 
              try {
                const errorDetail = JSON.parse(xhr.responseText)
                reject(new Error(errorDetail.error.message || 'Cloudinary rejected the file.'))
              } catch {
                reject(new Error('Cloudinary stream rejected: File too large or network timeout.'))
              }
            } 
          }
          xhr.onerror = () => reject(new Error('Network connection dropped.'))
          xhr.send(audioFormData)
        })
        finalAudioUrl = cloudinaryAudioResponse.secure_url
      }

      setUploadStatusString('COMMITTING BOOK TO DATABASE...')
      const payload = {
        title: title.trim(),
        author: author.trim(),
        cover_url: imgUploadData.secure_url,
        genre_slug: genreSlug,
        description: description.trim() || null,
        audio_url: finalAudioUrl
      }

      const { error: dbError } = await supabase.from('audiobooks').insert([payload])
      if (dbError) throw dbError

      setIsError(false)
      
      if (bookFormat === 'single') setStatusMessage('SUCCESS: STANDALONE AUDIOBOOK DEPLOYED.')
      else { setStatusMessage('SUCCESS: SERIES RECORD CREATED.'); setActiveTab('chapter'); }
      
      setTitle(''); setAuthor(''); setDescription(''); setCoverFile(null); setCoverPreview(null); setMasterAudioFile(null);
      fetchBooks();

    } catch (err) {
      setIsError(true)
      setStatusMessage('REJECTION: ' + err.message.toUpperCase())
    } finally {
      setPublishing(false)
      setUploadStatusString('')
      setUploadProgress(0)
    }
  }

  // ==========================================
  // PUBLISH CHAPTER NODE
  // ==========================================
  const handlePublishChapter = async (e) => {
    e.preventDefault()
    if (!audioFile || !selectedBookId) { setIsError(true); setStatusMessage('AUDIO FILE AND PARENT BOOK REQUIRED.'); return; }

    setPublishing(true); setIsError(false); setStatusMessage(null); setUploadProgress(0);

    try {
      setUploadStatusString('SECURING AUDIO SIGNATURE...')
      const audioSignRes = await fetch('/api/cloudinary-sign', { method: 'POST' })
      const audioSignData = await audioSignRes.json()

      const audioFormData = new FormData()
      audioFormData.append('file', audioFile)
      audioFormData.append('api_key', audioSignData.apiKey)
      audioFormData.append('timestamp', audioSignData.timestamp)
      audioFormData.append('signature', audioSignData.signature)
      audioFormData.append('folder', 'audiobooks')

      setUploadStatusString('STREAMING CHAPTER AUDIO...')
      const cloudinaryResponse = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${audioSignData.cloudName}/video/upload`, true)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            setUploadProgress(pct)
            setUploadStatusString(`CLOUDINARY STREAM: ${pct}%`)
          }
        }
        xhr.onload = () => { 
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText))
          } else { 
            try {
              const errorDetail = JSON.parse(xhr.responseText)
              reject(new Error(errorDetail.error.message || 'Cloudinary rejected the file.'))
            } catch {
              reject(new Error('Cloudinary stream rejected: File too large or network timeout.'))
            }
          } 
        }
        xhr.onerror = () => reject(new Error('Network connection dropped.'))
        xhr.send(audioFormData)
      })

      setUploadStatusString('LINKING CHAPTER...')
      const payload = {
        book_id: selectedBookId,
        chapter_number: parseInt(chapterNumber),
        title: chapterTitle.trim() || `Chapter ${chapterNumber}`,
        audio_url: cloudinaryResponse.secure_url
      }

      const { error: dbError } = await supabase.from('chapters').insert([payload])
      if (dbError) throw dbError

      setIsError(false)
      setStatusMessage(`SUCCESS: CHAPTER ${chapterNumber} SECURED.`)
      setChapterNumber(prev => String(parseInt(prev) + 1)) 
      setChapterTitle('')
      setAudioFile(null)

    } catch (err) {
      setIsError(true)
      setStatusMessage('REJECTION: ' + err.message.toUpperCase())
    } finally {
      setPublishing(false)
      setUploadStatusString('')
      setUploadProgress(0)
    }
  }

  // ==========================================
  // PUBLISH AUDIO SHORT / REEL HOOK
  // ==========================================
  const handlePublishShort = async (e) => {
    e.preventDefault()
    if (!shortAudioFile || !selectedBookIdForShort) { setIsError(true); setStatusMessage('AUDIO HOOK AND PARENT BOOK REQUIRED.'); return; }

    setPublishing(true); setIsError(false); setStatusMessage(null); setUploadProgress(0);

    try {
      setUploadStatusString('SECURING SHORTS SIGNATURE...')
      const audioSignRes = await fetch('/api/cloudinary-sign', { method: 'POST' })
      const audioSignData = await audioSignRes.json()

      const audioFormData = new FormData()
      audioFormData.append('file', shortAudioFile)
      audioFormData.append('api_key', audioSignData.apiKey)
      audioFormData.append('timestamp', audioSignData.timestamp)
      audioFormData.append('signature', audioSignData.signature)
      audioFormData.append('folder', 'audiobooks')

      setUploadStatusString('STREAMING SHORT MEDIA...')
      const cloudinaryResponse = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${audioSignData.cloudName}/video/upload`, true)
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            setUploadProgress(pct)
            setUploadStatusString(`CDN STREAM: ${pct}%`)
          }
        }
        
        xhr.onload = () => { 
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText))
          } else { 
            try {
              const errorDetail = JSON.parse(xhr.responseText)
              reject(new Error(errorDetail.error.message || 'Cloudinary rejected the file.'))
            } catch {
              reject(new Error('Cloudinary stream rejected: File too large or network timeout.'))
            }
          } 
        }
        
        xhr.onerror = () => reject(new Error('Network connection dropped.'))
        xhr.send(audioFormData)
      })

      setUploadStatusString('COMMITTING TO FEED...')
      const payload = {
        book_id: selectedBookIdForShort,
        caption: shortCaption.trim() || null,
        audio_url: cloudinaryResponse.secure_url
      }

      const { error: dbError } = await supabase.from('shorts').insert([payload])
      if (dbError) throw dbError

      setIsError(false)
      setStatusMessage(`SUCCESS: AUDIO HOOK DEPLOYED TO FEED.`)
      
      setShortCaption('')
      setShortAudioFile(null)

    } catch (err) {
      setIsError(true)
      setStatusMessage('REJECTION: ' + err.message.toUpperCase())
    } finally {
      setPublishing(false)
      setUploadStatusString('')
      setUploadProgress(0)
    }
  }

  return (
    <div 
      className="min-h-screen bg-[#141414] text-white antialiased pb-24 select-none overflow-x-hidden"
      style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&display=swap');
      `}</style>

      <header className="bg-gradient-to-b from-black to-transparent backdrop-blur-md px-6 md:px-12 py-5 flex justify-between items-center sticky top-0 z-40 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-[#e50914] text-3xl font-bold drop-shadow-[0_0_12px_rgba(229,9,20,0.4)]">🎧</span>
          <span className="text-xl md:text-2xl font-[900] tracking-tighter text-white">DEV_CONTROL_PANEL</span>
          <span className="bg-[#e50914] text-white text-[8px] font-[900] px-1.5 py-0.5 rounded-sm ml-2 tracking-widest uppercase">V4.0 (FEED MANAGER)</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-5 py-3 border border-white/10 rounded-md hover:bg-white/5 transition-colors">
          <LayoutDashboard className="h-4 w-4" /> <span>Return to Dashboard</span>
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#181818]/60 border border-white/10 rounded-2xl backdrop-blur-md shadow-2xl overflow-hidden">
          
          {/* Tab Navigation */}
          <div className="flex border-b border-white/10">
            <button onClick={() => setActiveTab('book')} className={`flex-1 py-5 text-xs sm:text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'book' ? 'bg-[#e50914] text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}>
              <BookOpen className="w-4 h-4 hidden sm:block" /> Master Book
            </button>
            <button onClick={() => setActiveTab('chapter')} className={`flex-1 py-5 text-xs sm:text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'chapter' ? 'bg-[#e50914] text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}>
              <ListOrdered className="w-4 h-4 hidden sm:block" /> Chapters
            </button>
            <button onClick={() => setActiveTab('short')} className={`flex-1 py-5 text-xs sm:text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'short' ? 'bg-[#e50914] text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}>
              <PlaySquare className="w-4 h-4 hidden sm:block" /> Upload Shorts
            </button>
          </div>

          <div className="p-8 md:p-12 space-y-8">
            {statusMessage && (
              <div className={`p-4 border-l-4 text-xs font-bold uppercase tracking-wider rounded-r-md ${isError ? 'bg-[#e50914]/20 border-[#e50914] text-white' : 'bg-white/5 border-neutral-500 text-neutral-300'}`}>
                {statusMessage}
              </div>
            )}

            {publishing && uploadProgress > 0 && (
              <div className="border border-white/10 bg-black/40 p-5 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-xs font-mono font-bold text-[#e50914] tracking-widest">
                  <span>{uploadStatusString}</span> <span>[{uploadProgress}%]</span>
                </div>
                <div className="w-full h-2 bg-neutral-900 overflow-hidden rounded-full">
                  <div className="h-full bg-[#e50914] transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* TAB 1: BOOK FORM */}
            {activeTab === 'book' && (
              <form onSubmit={handlePublishBook} className="space-y-6">
                <div className="bg-black/40 p-1.5 rounded-xl border border-white/10 flex">
                  <button type="button" onClick={() => setBookFormat('single')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${bookFormat === 'single' ? 'bg-white text-black shadow-md' : 'text-neutral-500 hover:text-white'}`}><Disc className="w-4 h-4" /> Standalone (Movie)</button>
                  <button type="button" onClick={() => setBookFormat('episodic')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all ${bookFormat === 'episodic' ? 'bg-white text-black shadow-md' : 'text-neutral-500 hover:text-white'}`}><Layers className="w-4 h-4" /> Episodic (Series)</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2"><label className="flex items-center gap-2 font-bold text-xs text-neutral-400 uppercase tracking-widest"><Type className="w-3.5 h-3.5" /> Book Title *</label><input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-black/40 text-white p-4 border-2 border-neutral-800 rounded-xl focus:border-[#e50914] focus:outline-none uppercase text-sm font-bold" /></div>
                  <div className="space-y-2"><label className="flex items-center gap-2 font-bold text-xs text-neutral-400 uppercase tracking-widest"><User className="w-3.5 h-3.5" /> Author Name *</label><input type="text" required value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full bg-black/40 text-white p-4 border-2 border-neutral-800 rounded-xl focus:border-[#e50914] focus:outline-none uppercase text-sm font-bold" /></div>
                </div>
                <div className="space-y-2">
                  <label className="font-bold text-xs text-neutral-400 uppercase tracking-widest">Category Genre *</label>
                  <select value={genreSlug} onChange={(e) => setGenreSlug(e.target.value)} className="w-full bg-black/40 text-white p-4 border-2 border-neutral-800 rounded-xl focus:border-[#e50914] focus:outline-none uppercase text-sm font-bold cursor-pointer">
                    <option value="fantasy">Fantasy</option><option value="science-fiction">Science Fiction</option><option value="mystery-crime">Mystery & Crime</option><option value="self-help">Self-Help</option><option value="history">History</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 font-bold text-xs text-neutral-400 uppercase tracking-widest"><ImageIcon className="w-3.5 h-3.5" /> Cover Art Image *</label>
                  <div className="flex items-center gap-6 bg-black/30 p-5 rounded-xl border border-white/5">
                    {coverPreview ? <img src={coverPreview} className="h-20 w-16 object-cover rounded-md shadow-lg" /> : <div className="h-20 w-16 bg-neutral-900 rounded-md flex items-center justify-center"><ImageIcon className="text-neutral-600" /></div>}
                    <input type="file" accept="image/*" onChange={handleImageChange} id="cover-file" className="hidden" />
                    <label htmlFor="cover-file" className="bg-neutral-800 hover:bg-neutral-700 px-4 py-3 rounded-md cursor-pointer text-xs font-bold uppercase tracking-widest transition-colors">Choose Image</label>
                  </div>
                </div>
                {bookFormat === 'single' && (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 font-bold text-xs text-[#e50914] uppercase tracking-widest"><Film className="w-3.5 h-3.5" /> Single Master Audio File *</label>
                    <div className="relative w-full bg-[#e50914]/10 border-2 border-[#e50914]/30 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-[#e50914] transition-colors">
                      <input type="file" required={bookFormat === 'single'} accept="audio/*" onChange={(e) => setMasterAudioFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                      <UploadCloud className="h-8 w-8 text-[#e50914] mb-2" />
                      <p className="font-bold text-sm text-white uppercase tracking-wide">{masterAudioFile ? masterAudioFile.name : 'BROWSE FULL LENGTH AUDIO'}</p>
                    </div>
                  </div>
                )}
                <div className="space-y-2"><label className="flex items-center gap-2 font-bold text-xs text-neutral-400 uppercase tracking-widest"><FileText className="w-3.5 h-3.5" /> Description</label><textarea rows="3" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-black/40 text-white p-4 border-2 border-neutral-800 rounded-xl focus:border-[#e50914] focus:outline-none uppercase text-sm font-bold resize-none" /></div>
                <button type="submit" disabled={publishing} className="w-full bg-[#e50914] hover:bg-[#b81d24] py-4 rounded-md font-bold text-sm uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(229,9,20,0.25)]">{publishing ? 'PROCESSING...' : (bookFormat === 'single' ? 'Deploy Standalone Asset' : '1. Create Series Master Record')}</button>
              </form>
            )}

            {/* TAB 2: CHAPTER FORM */}
            {activeTab === 'chapter' && (
              <form onSubmit={handlePublishChapter} className="space-y-6">
                <div className="space-y-2">
                  <label className="font-bold text-xs text-neutral-400 uppercase tracking-widest">Select Target Book *</label>
                  {existingBooks.length === 0 ? (
                    <div className="p-4 bg-white/5 text-neutral-400 text-sm border-2 border-dashed border-neutral-800 rounded-xl uppercase font-bold text-center">No Books Found.</div>
                  ) : (
                    <select value={selectedBookId} onChange={(e) => setSelectedBookId(e.target.value)} className="w-full bg-black/40 text-white p-4 border-2 border-neutral-800 rounded-xl focus:border-[#e50914] focus:outline-none uppercase text-sm font-bold cursor-pointer">
                      {existingBooks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                    </select>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2"><label className="font-bold text-xs text-neutral-400 uppercase tracking-widest">Chapter Number *</label><input type="number" min="1" required value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} placeholder="E.G., 1" className="w-full bg-black/40 text-white p-4 border-2 border-neutral-800 rounded-xl focus:border-[#e50914] focus:outline-none text-sm font-bold" /></div>
                  <div className="space-y-2"><label className="font-bold text-xs text-neutral-400 uppercase tracking-widest">Chapter Title</label><input type="text" value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder="E.G., THE BEGINNING" className="w-full bg-black/40 text-white p-4 border-2 border-neutral-800 rounded-xl focus:border-[#e50914] focus:outline-none uppercase text-sm font-bold" /></div>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 font-bold text-xs text-neutral-400 uppercase tracking-widest"><Film className="w-3.5 h-3.5" /> Chapter Audio Media *</label>
                  <div className="relative w-full bg-black/40 border-2 border-neutral-800 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-[#e50914]/50 transition-colors">
                    <input type="file" required accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                    <UploadCloud className="h-8 w-8 text-neutral-500 mb-2" />
                    <p className="font-bold text-sm text-white uppercase tracking-wide">{audioFile ? audioFile.name : 'BROWSE LOCAL AUDIO FILE'}</p>
                  </div>
                </div>
                <button type="submit" disabled={publishing || existingBooks.length === 0} className="w-full bg-white text-black hover:bg-neutral-200 py-4 rounded-md font-extrabold text-sm uppercase tracking-wider transition-all disabled:opacity-30">{publishing ? 'STREAMING...' : '2. Append Chapter to Book'}</button>
              </form>
            )}

            {/* TAB 3: SHORTS / HOOKS FORM (NEW) */}
            {activeTab === 'short' && (
              <form onSubmit={handlePublishShort} className="space-y-6">
                <div className="bg-gradient-to-r from-[#e50914]/20 to-transparent p-4 border-l-4 border-[#e50914] rounded-r-md mb-6">
                  <p className="text-xs font-bold text-white uppercase tracking-widest">Feed Optimization Engine</p>
                  <p className="text-neutral-400 text-[10px] uppercase tracking-wider mt-1">Upload 15-60 second audio hooks to populate the vertical scrolling discovery feed.</p>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-xs text-neutral-400 uppercase tracking-widest">Link to Master Book *</label>
                  {existingBooks.length === 0 ? (
                    <div className="p-4 bg-white/5 text-neutral-400 text-sm border-2 border-dashed border-neutral-800 rounded-xl uppercase font-bold text-center">No Books Found.</div>
                  ) : (
                    <select value={selectedBookIdForShort} onChange={(e) => setSelectedBookIdForShort(e.target.value)} className="w-full bg-black/40 text-white p-4 border-2 border-neutral-800 rounded-xl focus:border-[#e50914] focus:outline-none uppercase text-sm font-bold cursor-pointer">
                      {existingBooks.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                    </select>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-xs text-neutral-400 uppercase tracking-widest">Promotional Caption</label>
                  <input type="text" value={shortCaption} onChange={(e) => setShortCaption(e.target.value)} placeholder="E.G., THE MOMENT EVERYTHING CHANGED..." className="w-full bg-black/40 text-white p-4 border-2 border-neutral-800 rounded-xl focus:border-[#e50914] focus:outline-none font-bold text-sm" />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 font-bold text-xs text-neutral-400 uppercase tracking-widest"><PlaySquare className="w-3.5 h-3.5" /> Short Audio Hook *</label>
                  <div className="relative w-full bg-black/40 border-2 border-[#e50914]/30 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-[#e50914] transition-colors">
                    <input type="file" required accept="audio/*" onChange={(e) => setShortAudioFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                    <UploadCloud className="h-8 w-8 text-[#e50914] mb-2" />
                    <p className="font-bold text-sm text-white uppercase tracking-wide">{shortAudioFile ? shortAudioFile.name : 'BROWSE 30-SEC AUDIO CLIP'}</p>
                  </div>
                </div>

                <button type="submit" disabled={publishing || existingBooks.length === 0} className="w-full bg-[#e50914] text-white hover:bg-[#b81d24] py-4 rounded-md font-extrabold text-sm uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(229,9,20,0.25)] disabled:opacity-30">
                  {publishing ? 'STREAMING...' : 'Deploy to Feed'}
                </button>
              </form>
            )}

          </div>
        </motion.div>
      </main>
    </div>
  )
}
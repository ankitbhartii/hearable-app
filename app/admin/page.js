'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, PlusCircle, UploadCloud, ImageIcon, Film, Type, User, Mic, Clock, FileText } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AdminConsole() {
  const supabase = createClient()
  const router = useRouter()

  // Form State Definitions (Defaults cleanly to 'fantasy')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [narrator, setNarrator] = useState('')
  const [duration, setDuration] = useState('')
  const [genreSlug, setGenreSlug] = useState('fantasy')
  const [description, setDescription] = useState('')
  
  // Physical File States
  const [audioFile, setAudioFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatusString, setUploadStatusString] = useState('')

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

  // Process Local Audio File
  const handleAudioChange = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    const fileType = selectedFile.type
    if (fileType.includes('audio') || selectedFile.name.endsWith('.mp3') || selectedFile.name.endsWith('.wav')) {
      setAudioFile(selectedFile)
      setIsError(false)
      setStatusMessage(`AUDIO CAPTURED: ${selectedFile.name.toUpperCase()}`)
    } else {
      setAudioFile(null)
      setIsError(true)
      setStatusMessage('INVALID FORMAT. SYSTEM ONLY ACCEPTS AUDIO STREAMS.')
    }
  }

  // Process Local Image File
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      setCoverFile(file)
      setCoverPreview(URL.createObjectURL(file))
      setIsError(false)
      setStatusMessage(`ARTWORK CAPTURED: ${file.name.toUpperCase()}`)
    } else {
      setCoverFile(null)
      setCoverPreview(null)
      setIsError(true)
      setStatusMessage('INVALID FORMAT. PLEASE UPLOAD AN IMAGE FILE.')
    }
  }

  // Execute Dual Cloudinary Upload and Supabase Insert
  const handlePublish = async (e) => {
    e.preventDefault()
    
    if (!audioFile) {
      setIsError(true)
      setStatusMessage('CRITICAL NULL FILE: PLEASE ATTACH AN AUDIO FILE.')
      return
    }

    setPublishing(true)
    setStatusMessage(null)
    setIsError(false)
    setUploadProgress(0)

    try {
      let finalCoverUrl = null

      // 1. UPLOAD COVER ARTWORK TO CLOUDINARY (IF PROVIDED)
      if (coverFile) {
        setUploadStatusString('SECURING ARTWORK SIGNATURE...')
        const imgSignRes = await fetch('/api/cloudinary-sign', { method: 'POST' })
        if (!imgSignRes.ok) throw new Error('Failed to negotiate image security signature.')
        const imgSignData = await imgSignRes.json()

        setUploadStatusString('UPLOADING COVER ARTWORK...')
        const imgFormData = new FormData()
        imgFormData.append('file', coverFile)
        imgFormData.append('api_key', imgSignData.apiKey)
        imgFormData.append('timestamp', imgSignData.timestamp)
        imgFormData.append('signature', imgSignData.signature)
        imgFormData.append('folder', 'audiobooks')

        const imgUploadRes = await fetch(`https://api.cloudinary.com/v1_1/${imgSignData.cloudName}/image/upload`, {
          method: 'POST',
          body: imgFormData
        })
        const imgUploadData = await imgUploadRes.json()
        if (!imgUploadRes.ok) throw new Error('Cloudinary rejected the image file.')
        
        finalCoverUrl = imgUploadData.secure_url
      }

      // 2. UPLOAD AUDIO BINARY TO CLOUDINARY
      setUploadStatusString('SECURING AUDIO SIGNATURE...')
      const audioSignRes = await fetch('/api/cloudinary-sign', { method: 'POST' })
      if (!audioSignRes.ok) throw new Error('Failed to negotiate audio security signature.')
      const audioSignData = await audioSignRes.json()

      const audioFormData = new FormData()
      audioFormData.append('file', audioFile)
      audioFormData.append('api_key', audioSignData.apiKey)
      audioFormData.append('timestamp', audioSignData.timestamp)
      audioFormData.append('signature', audioSignData.signature)
      audioFormData.append('folder', 'audiobooks')

      setUploadStatusString('STREAMING AUDIO TO CLOUDINARY CDN...')
      
      const cloudinaryResponse = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const uploadUrl = `https://api.cloudinary.com/v1_1/${audioSignData.cloudName}/video/upload`
        
        xhr.open('POST', uploadUrl, true)

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(percentage)
            setUploadStatusString('CLOUDINARY AUDIO STREAMING: ' + percentage + '% COMPLETED')
          }
        }

        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error('Cloudinary rejected stream with status: ' + xhr.status))
          }
        }
        
        xhr.onerror = () => reject(new Error('Cloudinary network connection broken.'))
        xhr.send(audioFormData)
      })

      const finalAudioUrl = cloudinaryResponse.secure_url
      setUploadStatusString('COMMITTING METADATA TO SUPABASE CATALOG...')

      // 3. COMMIT EVERYTHING TO SUPABASE
      const payload = {
        title: title.trim(),
        author: author.trim(),
        narrator: narrator.trim() || null,
        cover_url: finalCoverUrl,
        audio_url: finalAudioUrl, 
        duration: duration.trim() || null,
        genre_slug: genreSlug,
        description: description.trim() || null
      }

      const { error: dbError } = await supabase.from('audiobooks').insert([payload])

      if (dbError) throw dbError

      setIsError(false)
      setStatusMessage('SUCCESS: ASSETS SECURED IN CLOUDINARY AND PUBLISHED TO DATABASE.')
      
      // Flush fields cleanly
      setTitle('')
      setAuthor('')
      setNarrator('')
      setDuration('')
      setCoverFile(null)
      setCoverPreview(null)
      setAudioFile(null)
      setDescription('')
      setUploadProgress(0)

    } catch (err) {
      console.warn('Pipeline fault:', err)
      setIsError(true)
      const safeErrorText = err?.message || err?.details || String(err)
      setStatusMessage('REJECTION: ' + safeErrorText.toUpperCase())
    } finally {
      setPublishing(false)
      setUploadStatusString('')
    }
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white font-['Hanken_Grotesk'] antialiased pb-24 select-none transition-colors duration-300">
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&display=swap');
      `}</style>

      {/* ================= BRANDING NAVIGATION HEADER ================= */}
      <header className="bg-gradient-to-b from-black to-transparent backdrop-blur-md px-6 md:px-12 py-5 flex justify-between items-center sticky top-0 z-40 border-b border-white/5">
        <div className="flex items-center gap-2 select-none">
          <span className="text-[#e50914] text-3xl font-bold drop-shadow-[0_0_12px_rgba(229,9,20,0.4)]">🎧</span>
          <span className="text-xl md:text-2xl font-[900] tracking-tighter text-white antialiased">DEV_CONTROL_PANEL</span>
          <span className="bg-[#e50914] text-white text-[8px] font-[900] px-1.5 py-0.5 rounded-sm ml-2 tracking-widest uppercase">V2.026</span>
        </div>
        
        <button 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-5 py-3 border border-white/10 rounded-md hover:bg-white/5 transition-colors group"
        >
          <LayoutDashboard className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Return to Dashboard</span>
        </button>
      </header>

      {/* ================= FORM BODY PANELS ================= */}
      <main className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.8 }}
          className="bg-[#181818]/60 border border-white/10 p-8 md:p-12 rounded-2xl backdrop-blur-md shadow-2xl space-y-10"
        >
          
          <div className="border-b border-white/10 pb-6 flex items-center gap-3">
            <PlusCircle className="h-6 w-6 text-[#e50914]" />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white uppercase antialiased">
              Upload Audio & Art to Cloudinary
            </h2>
          </div>

          {/* Dynamic Action Response Banner */}
          {statusMessage && (
            <div className={`p-4 border-l-4 text-xs font-bold uppercase tracking-wider rounded-r-md shadow-md transition-all ${
              isError ? 'bg-[#e50914]/20 border-[#e50914] text-white' : 'bg-white/5 border-neutral-500 text-neutral-300'
            }`}>
              {statusMessage}
            </div>
          )}

          {/* Progress Slider Track Module */}
          {publishing && uploadProgress > 0 && (
            <div className="border border-white/10 bg-black/40 p-5 rounded-xl space-y-3 shadow-xl">
              <div className="flex justify-between items-center text-xs font-mono font-bold text-[#e50914] uppercase tracking-widest">
                <span>{uploadStatusString}</span>
                <span>[{uploadProgress}%]</span>
              </div>
              <div className="w-full h-2 bg-neutral-900 overflow-hidden relative rounded-full">
                <div 
                  className="h-full bg-[#e50914] transition-all duration-150 ease-out shadow-[0_0_10px_#e50914]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Primary Input Fields Processing Package */}
          <form onSubmit={handlePublish} className="space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-bold text-xs text-neutral-400 uppercase tracking-widest">
                  <Type className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Book Title Field *</span>
                </label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.G., THE DIGITAL FRONTIER" className="w-full bg-black/40 text-white placeholder-neutral-700 font-bold p-4 border-2 border-neutral-800 rounded-xl focus:outline-none focus:ring-0 focus:border-[#e50914] focus:bg-black transition-all uppercase tracking-wide text-sm" />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 font-bold text-xs text-neutral-400 uppercase tracking-widest">
                  <User className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Author Name Field *</span>
                </label>
                <input type="text" required value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="E.G., ANKIT SINGH" className="w-full bg-black/40 text-white placeholder-neutral-700 font-bold p-4 border-2 border-neutral-800 rounded-xl focus:outline-none focus:ring-0 focus:border-[#e50914] focus:bg-black transition-all uppercase tracking-wide text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-bold text-xs text-neutral-400 uppercase tracking-widest">
                  <Mic className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Narrator Voice Engine</span>
                </label>
                <input type="text" value={narrator} onChange={(e) => setNarrator(e.target.value)} placeholder="E.G., ECHO VOICE V2" className="w-full bg-black/40 text-white placeholder-neutral-700 font-bold p-4 border-2 border-neutral-800 rounded-xl focus:outline-none focus:ring-0 focus:border-[#e50914] focus:bg-black transition-all uppercase tracking-wide text-sm" />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 font-bold text-xs text-neutral-400 uppercase tracking-widest">
                  <Clock className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Audiobook Duration</span>
                </label>
                <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="E.G., 5H 45M" className="w-full bg-black/40 text-white placeholder-neutral-700 font-bold p-4 border-2 border-neutral-800 rounded-xl focus:outline-none focus:ring-0 focus:border-[#e50914] focus:bg-black transition-all uppercase tracking-wide text-sm" />
              </div>
            </div>

            {/* Artwork Capture Nodes */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 font-bold text-xs text-neutral-400 uppercase tracking-widest">
                <ImageIcon className="w-3.5 h-3.5 text-neutral-600" />
                <span>Cover Art Image (Local File)</span>
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-black/30 p-5 rounded-xl border border-white/5">
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover Preview" className="h-20 w-16 object-cover rounded-md border border-white/10 shadow-lg flex-shrink-0" />
                ) : (
                  <div className="h-20 w-16 bg-neutral-900 border border-neutral-800 rounded-md flex items-center justify-center flex-shrink-0 text-neutral-600">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
                <div className="relative w-full flex items-center gap-4">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageChange}
                    id="cover-file-upload"
                    className="hidden"
                  />
                  <label
                    htmlFor="cover-file-upload"
                    className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold uppercase tracking-widest px-4 py-3 rounded-md cursor-pointer transition-colors shadow-md flex-shrink-0"
                  >
                    Choose Image File
                  </label>
                  <span className="text-xs text-neutral-500 uppercase tracking-wider truncate max-w-xs">
                    {coverFile ? coverFile.name : 'No image chosen'}
                  </span>
                </div>
              </div>
            </div>

            {/* Drag and Drop Binary Audio Dropzone */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 font-bold text-xs text-neutral-400 uppercase tracking-widest">
                <Film className="w-3.5 h-3.5 text-neutral-600" />
                <span>Audio Media (Local File) *</span>
              </label>
              <div className="group relative w-full bg-black/40 border-2 border-neutral-800 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#e50914]/50 transition-all duration-300">
                <input 
                  type="file"
                  accept=".mp3,audio/mpeg,audio/mp3,.wav,audio/wav,audio/x-wav"
                  onChange={handleAudioChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-20"
                />
                <div className="p-4 bg-neutral-900 rounded-full text-neutral-500 group-hover:text-[#e50914] group-hover:bg-neutral-900/50 transition-all duration-300 shadow-xl">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <p className="mt-4 font-bold text-sm text-neutral-200 tracking-wide uppercase">
                  {audioFile ? `SELECTED: ${audioFile.name.toUpperCase()}` : 'DRAG AND DROP OR CLICK TO BROWSE LOCAL AUDIO'}
                </p>
                <p className="mt-1 text-[11px] text-neutral-500 font-bold tracking-widest uppercase">
                  FILE WILL STREAM DIRECTLY TO CLOUDINARY GLOBAL EDGE NETWORK
                </p>
              </div>
            </div>

            {/* Target Category Select Menu (Synced precisely to your current database) */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-bold text-xs text-neutral-400 uppercase tracking-widest">
                <span>Target Category Genre Mapping *</span>
              </label>
              <div className="relative">
                <select 
                  value={genreSlug} 
                  onChange={(e) => setGenreSlug(e.target.value)} 
                  className="w-full bg-black/40 text-white font-bold p-4 border-2 border-neutral-800 rounded-xl focus:outline-none focus:ring-0 focus:border-[#e50914] focus:bg-black transition-all appearance-none cursor-pointer uppercase tracking-wide text-sm"
                >
                  <optgroup label="Fiction Categories">
                    <option value="fantasy">Fantasy</option>
                    <option value="science-fiction">Science Fiction</option>
                    <option value="mystery-crime">Mystery & Crime</option>
                    <option value="romance">Romance</option>
                    <option value="thriller-suspense">Thriller & Suspense</option>
                    <option value="historical-fiction">Historical Fiction</option>
                    <option value="horror">Horror</option>
                    <option value="literary-fiction">Literary Fiction</option>
                  </optgroup>
                  
                  <optgroup label="Nonfiction Categories">
                    <option value="biography-autobiography">Biography & Autobiography</option>
                    <option value="memoir">Memoir</option>
                    <option value="self-help">Self-Help</option>
                    <option value="history">History</option>
                    <option value="essays-poetry">Essays & Poetry</option>
                  </optgroup>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 font-bold text-xs text-neutral-400 uppercase tracking-widest">
                <FileText className="w-3.5 h-3.5 text-neutral-600" />
                <span>Book Summary / Description</span>
              </label>
              <textarea rows="4" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="PROVIDE A BRIEF NARRATIVE SUMMARY" className="w-full bg-black/40 text-white placeholder-neutral-700 font-bold p-4 border-2 border-neutral-800 rounded-xl focus:outline-none focus:ring-0 focus:border-[#e50914] focus:bg-black transition-all uppercase tracking-wide text-sm resize-none min-h-[120px]" />
            </div>

            {/* Execution Trigger Button */}
            <div className="pt-4 border-t border-white/5 flex justify-end">
              <button 
                type="submit" 
                disabled={publishing} 
                className="bg-[#e50914] hover:bg-[#b81d24] text-white font-bold text-sm uppercase tracking-wider px-10 py-4 rounded-md transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 min-w-[240px] flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(229,9,20,0.25)]"
              >
                <span>{publishing ? 'STREAMING ASSETS...' : 'Publish Audiobook'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, PlusCircle, UploadCloud, ImageIcon } from 'lucide-react'

export default function AdminConsole() {
  const supabase = createClient()
  const router = useRouter()

  // Form State Definitions
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [narrator, setNarrator] = useState('')
  const [duration, setDuration] = useState('')
  const [genreSlug, setGenreSlug] = useState('sci-fi-fantasy')
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

        // Note: Images go to /image/upload
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
        // Note: Audio goes to /video/upload in Cloudinary REST API
        const uploadUrl = `https://api.cloudinary.com/v1_1/${audioSignData.cloudName}/video/upload`
        
        xhr.open('POST', uploadUrl, true)

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(percentage)
            setUploadStatusString(`CLOUDINARY AUDIO STREAMING: ${percentage}% COMPLETED`)
          }
        }

        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error(`Cloudinary rejected stream with status: ${xhr.status}`))
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
        cover_url: finalCoverUrl, // Now saving the secure Cloudinary image link!
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
      setStatusMessage(`REJECTION: ${safeErrorText.toUpperCase()}`)
    } finally {
      setPublishing(false)
      setUploadStatusString('')
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
              Upload Audio & Art to Cloudinary
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

          {/* Visual Percentage Progress Bar Module */}
          {publishing && uploadProgress > 0 && (
            <div className="border-4 border-[#050404] bg-[#050404] p-4 rounded-[0.25rem] space-y-3">
              <div className="flex justify-between items-center text-xs font-mono font-black text-[#FEBB0F] uppercase tracking-widest">
                <span>{uploadStatusString}</span>
                <span>[{uploadProgress}%]</span>
              </div>
              <div className="w-full h-4 bg-zinc-800 border-2 border-white overflow-hidden relative rounded-[0.125rem]">
                <div 
                  className="h-full bg-[#FEBB0F] transition-all duration-150 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
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
                <label className="block font-black text-xs uppercase tracking-widest text-[#050404]">Narrator Voice Engine</label>
                <input type="text" value={narrator} onChange={(e) => setNarrator(e.target.value)} placeholder="E.G., ECHO VOICE V2" className="w-full bg-[#f3f3f4] border-4 border-[#050404] px-4 py-3 font-bold text-[#050404] outline-none focus:bg-white rounded-[0.25rem] transition-colors" />
              </div>

              <div className="space-y-2">
                <label className="block font-black text-xs uppercase tracking-widest text-[#050404]">Audiobook Duration</label>
                <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="E.G., 5H 45M" className="w-full bg-[#f3f3f4] border-4 border-[#050404] px-4 py-3 font-bold text-[#050404] outline-none focus:bg-white rounded-[0.25rem] transition-colors" />
              </div>
            </div>

            {/* NEW: Local Image Upload Field */}
            <div className="space-y-2">
              <label className="block font-black text-xs uppercase tracking-widest text-[#050404]">
                Cover Art Image (Local File)
              </label>
              <div className="flex items-center gap-4">
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover Preview" className="h-16 w-16 object-cover border-4 border-[#050404] rounded-[0.125rem] flex-shrink-0" />
                ) : (
                  <div className="h-16 w-16 bg-[#f3f3f4] border-4 border-dashed border-[#050404] rounded-[0.125rem] flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-6 w-6 text-[#050404]" />
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full bg-[#f3f3f4] border-4 border-[#050404] px-4 py-3 font-bold text-[#050404] outline-none focus:bg-white rounded-[0.25rem] transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-[0.125rem] file:border-2 file:border-[#050404] file:text-xs file:font-black file:uppercase file:bg-[#FEBB0F] file:text-[#050404] hover:file:bg-[#050404] hover:file:text-white cursor-pointer"
                />
              </div>
            </div>

            {/* Drag and Drop Audio File Picker */}
            <div className="space-y-2">
              <label className="block font-black text-xs uppercase tracking-widest text-[#050404]">
                Audio Media (Local File) *
              </label>
              <div className="relative w-full bg-[#f3f3f4] border-4 border-dashed border-[#050404] hover:bg-zinc-50 transition-colors rounded-[0.25rem] p-6 text-center flex flex-col items-center justify-center group cursor-pointer">
                <input 
                  type="file"
                  accept=".mp3,audio/mpeg,audio/mp3,.wav,audio/wav,audio/x-wav"
                  onChange={handleAudioChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-20"
                />
                <UploadCloud className="h-10 w-10 text-[#050404] mb-2 group-hover:text-[#B70504] transition-colors" />
                <p className="font-bold text-sm text-[#050404]">
                  {audioFile ? `SELECTED: ${audioFile.name.toUpperCase()}` : 'DRAG AND DROP OR CLICK TO BROWSE LOCAL AUDIO'}
                </p>
                <p className="text-[10px] text-zinc-500 font-bold tracking-wider mt-1 uppercase">
                  FILE WILL STREAM DIRECTLY TO CLOUDINARY GLOBAL EDGE NETWORK
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-black text-xs uppercase tracking-widest text-[#050404]">Target Category Genre Mapping *</label>
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
              <label className="block font-black text-xs uppercase tracking-widest text-[#050404]">Book Summary / Description</label>
              <textarea rows="4" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="PROVIDE A BRIEF NARRATIVE SUMMARY" className="w-full bg-[#f3f3f4] border-4 border-[#050404] px-4 py-3 font-bold text-[#050404] outline-none focus:bg-white rounded-[0.25rem] resize-none transition-colors" />
            </div>

            <button type="submit" disabled={publishing} className="w-full bg-[#B70504] hover:bg-[#050404] text-white border-4 border-[#050404] font-['Hanken_Grotesk'] font-black text-sm uppercase tracking-widest py-4 rounded-[0.25rem] flex items-center justify-center gap-2 transition-colors disabled:opacity-40">
              <span>{publishing ? 'STREAMING ASSETS TO CLOUDINARY...' : 'Publish Audiobook'}</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
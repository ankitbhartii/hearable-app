'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, User, UploadCloud, Save, ArrowLeft, Camera, FileText } from 'lucide-react'
import { motion } from 'framer-motion'
import Loader from '../Loader'

export default function ProfileDashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  
  // Profile State
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  
  // Upload State
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [isError, setIsError] = useState(false)

  // 1. Authenticate and Fetch Existing Profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        
        if (authError || !session) {
          router.push('/auth')
          return
        }

        setUserId(session.user.id)

        // Fetch existing profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileData) {
          setUsername(profileData.username || '')
          setBio(profileData.bio || '')
          setAvatarUrl(profileData.avatar_url || '')
          setAvatarPreview(profileData.avatar_url || null)
        }
      } catch (error) {
        console.error('Profile load error:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [router, supabase])

  // 2. Handle Local File Selection
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
      setIsError(false)
      setStatusMessage(`AVATAR QUEUED: ${file.name.toUpperCase()}`)
    }
  }

  // 3. Execute Save (Cloudinary + Supabase)
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setStatusMessage('COMMITTING IDENTITY MATRIX...')
    setIsError(false)

    try {
      let finalAvatarUrl = avatarUrl

      // If they selected a new image, stream it to Cloudinary first
      if (avatarFile) {
        setStatusMessage('SECURING CLOUDINARY SIGNATURE...')
        const imgSignRes = await fetch('/api/cloudinary-sign', { method: 'POST' })
        if (!imgSignRes.ok) throw new Error('Failed to negotiate image security signature.')
        const imgSignData = await imgSignRes.json()

        setStatusMessage('STREAMING AVATAR TO EDGE NETWORK...')
        const imgFormData = new FormData()
        imgFormData.append('file', avatarFile)
        imgFormData.append('api_key', imgSignData.apiKey)
        imgFormData.append('timestamp', imgSignData.timestamp)
        imgFormData.append('signature', imgSignData.signature)
        imgFormData.append('folder', 'avatars')

        const imgUploadRes = await fetch(`https://api.cloudinary.com/v1_1/${imgSignData.cloudName}/image/upload`, {
          method: 'POST',
          body: imgFormData
        })
        const imgUploadData = await imgUploadRes.json()
        if (!imgUploadRes.ok) throw new Error('Cloudinary rejected the avatar image.')
        
        finalAvatarUrl = imgUploadData.secure_url
      }

      setStatusMessage('UPDATING SUPABASE RECORDS...')

      // Upsert (Update or Insert) the profile data
      const payload = {
        id: userId,
        username: username.trim(),
        bio: bio.trim(),
        avatar_url: finalAvatarUrl,
        updated_at: new Date()
      }

      const { error: dbError } = await supabase.from('profiles').upsert([payload])
      if (dbError) throw dbError

      setAvatarUrl(finalAvatarUrl)
      setAvatarFile(null)
      setIsError(false)
      setStatusMessage('SUCCESS: USER IDENTITY UPDATED.')

    } catch (err) {
      console.warn('Profile save fault:', err)
      setIsError(true)
      setStatusMessage(`REJECTION: ${String(err.message || err).toUpperCase()}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-[#141414] flex items-center justify-center p-6"><Loader /></div>

  return (
    <div className="min-h-screen bg-[#141414] text-white font-['Hanken_Grotesk'] antialiased pb-24 select-none transition-colors duration-300">
      
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@500;600;700;800;900&display=swap');
      `}</style>

      {/* ================= CINEMATIC BAR NAVIGATION ================= */}
      <nav className="sticky top-0 z-50 bg-gradient-to-b from-black/90 to-transparent backdrop-blur-md px-6 md:px-12 py-5 flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-2 select-none">
          <span className="text-[#e50914] text-3xl font-bold drop-shadow-[0_0_12px_rgba(229,9,20,0.4)]">🎧</span>
          <span className="font-['Anton'] text-2xl tracking-wider text-white">USER_IDENTITY</span>
        </div>

        <button 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-5 py-3 border border-white/10 rounded-md hover:bg-white/5 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Return to Dashboard</span>
        </button>
      </nav>

      {/* ================= MAIN PROFILE EDITOR CONTAINER ================= */}
      <main className="max-w-3xl mx-auto px-6 py-12 relative z-10">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.8 }}
          className="bg-[#181818]/60 border border-white/10 p-8 md:p-12 rounded-2xl backdrop-blur-md shadow-2xl space-y-10"
        >
          {/* Header Title Section */}
          <div className="border-b border-white/10 pb-6 flex items-center gap-3">
            <User className="text-[#e50914] w-6 h-6" />
            <h2 className="font-['Anton'] text-3xl md:text-4xl uppercase tracking-wider text-white leading-none">
              Customize Profile
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

          <form onSubmit={handleSaveProfile} className="space-y-8">
            
            {/* AVATAR IMAGE FRAME UPLOADER */}
            <div className="flex flex-col sm:flex-row items-center gap-8 bg-black/30 p-6 rounded-xl border border-white/5">
              <div className="relative group w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-neutral-900 border border-white/10 flex items-center justify-center cursor-pointer">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover transition-opacity group-hover:opacity-70" />
                ) : (
                  <div className="text-neutral-600 group-hover:text-neutral-400 transition-colors">
                    <User className="w-12 h-12 stroke-[1.5]" />
                  </div>
                )}
                
                {/* Micro-interaction Hover Shutter Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1">
                  <Camera className="w-5 h-5 text-white" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-300">Upload</span>
                </div>
                
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <h4 className="font-bold text-sm tracking-wide text-neutral-200 uppercase">Public Avatar Display</h4>
                <p className="text-xs text-neutral-500 max-w-sm leading-relaxed">
                  Click the viewport frame to select a custom image square. Files are safely managed and deployed through Cloudinary's global CDN.
                </p>
              </div>
            </div>

            {/* INPUT FIELD: USERNAME */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 font-bold text-xs text-neutral-400 uppercase tracking-widest">
                <span>Display Username</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="E.G., ECHO_READER_99"
                className="w-full bg-black/40 text-white placeholder-neutral-700 font-bold p-4 border-2 border-neutral-800 rounded-xl focus:outline-none focus:ring-0 focus:border-[#e50914] focus:bg-black transition-all uppercase tracking-wide text-sm"
              />
            </div>

            {/* INPUT FIELD: BIO SIGNATURE */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 font-bold text-xs text-neutral-400 uppercase tracking-widest">
                <FileText className="w-3.5 h-3.5 text-neutral-500" />
                <span>Personal Bio / Signature</span>
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="TELL THE COMMUNITY ABOUT YOURSELF..."
                className="w-full bg-black/40 text-white placeholder-neutral-700 font-bold p-4 border-2 border-neutral-800 rounded-xl focus:outline-none focus:ring-0 focus:border-[#e50914] focus:bg-black transition-all uppercase tracking-wide text-sm resize-none min-h-[120px]"
              />
            </div>

            {/* FORM SUBMISSION CONTROLS */}
            <div className="pt-4 border-t border-white/5 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#e50914] hover:bg-[#b81d24] text-white font-['Anton'] text-xl uppercase tracking-wider px-8 py-4 rounded-md transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 min-w-[200px] flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(229,9,20,0.25)]"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Updating Identity..." : "Save Profile Identity"}</span>
              </button>
            </div>

          </form>
        </motion.div>
        
      </main>
    </div>
  )
}
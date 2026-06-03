'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, User, UploadCloud, Save } from 'lucide-react'
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
        imgFormData.append('folder', 'avatars') // Dedicated folder for users

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
      setAvatarFile(null) // Clear file state after successful upload
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

  if (loading) return <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-6"><Loader /></div>

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#050404] font-['Hanken_Grotesk'] antialiased pb-24 select-none">
      
      {/* Top Stark Navigation Header Strip */}
      <header className="border-b-4 border-[#050404] bg-[#FEBB0F] px-6 py-6 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <h1 className="font-['Anton'] text-4xl uppercase tracking-tighter text-[#050404] leading-none">
            USER_IDENTITY
          </h1>
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
      <main className="max-w-2xl mx-auto px-6 py-12">
        
        <div className="bg-white border-4 border-[#050404] p-6 md:p-10 rounded-[0.25rem] space-y-8 shadow-[8px_8px_0px_0px_rgba(5,4,4,1)]">
          
          <div className="border-b-4 border-[#050404] pb-3 flex items-center gap-2">
            <User className="h-8 w-8 text-[#B70504] stroke-[3]" />
            <h2 className="font-['Anton'] text-3xl uppercase tracking-tight text-[#050404] leading-none">
              Customize Profile
            </h2>
          </div>

          {/* Dynamic Action Response Banner */}
          {statusMessage && (
            <div className={`p-4 border-4 border-[#050404] text-xs font-black uppercase tracking-wider rounded-[0.125rem] whitespace-normal break-words ${
              isError ? 'bg-[#B70504] text-white' : 'bg-[#050404] text-white'
            }`}>
              {statusMessage}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-8">
            
            {/* Avatar Upload Section */}
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start pb-6 border-b-4 border-dashed border-[#050404]">
              
              {/* Massive Avatar Preview Frame */}
              <div className="relative h-40 w-40 flex-shrink-0 bg-[#f3f3f4] border-[6px] border-[#050404] overflow-hidden rounded-[0.5rem] flex items-center justify-center group">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-16 w-16 text-zinc-300" />
                )}
                <div className="absolute inset-0 bg-[#B70504]/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white pointer-events-none">
                  <UploadCloud className="h-8 w-8 mb-1" />
                  <span className="text-[10px] font-black tracking-widest uppercase">Replace</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
              </div>

              <div className="space-y-2 w-full text-center md:text-left">
                <h3 className="font-black text-sm uppercase tracking-widest text-[#050404]">Public Avatar</h3>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                  Click the frame to upload a custom image. Files are securely processed through Cloudinary's global CDN.
                </p>
              </div>
            </div>

            {/* User Data Fields */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block font-black text-xs uppercase tracking-widest text-[#050404]">
                  Display Username
                </label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="E.G., ECHO_READER_99"
                  className="w-full bg-[#f3f3f4] border-4 border-[#050404] px-4 py-3 font-bold text-[#050404] outline-none focus:bg-white rounded-[0.25rem] transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="block font-black text-xs uppercase tracking-widest text-[#050404]">
                  Personal Bio / Signature
                </label>
                <textarea 
                  rows="3" 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="TELL THE COMMUNITY ABOUT YOURSELF..."
                  className="w-full bg-[#f3f3f4] border-4 border-[#050404] px-4 py-3 font-bold text-[#050404] outline-none focus:bg-white rounded-[0.25rem] resize-none transition-colors"
                />
              </div>
            </div>

            {/* Hard-Impact Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#050404] hover:bg-[#B70504] text-white border-4 border-[#050404] font-['Hanken_Grotesk'] font-black text-sm uppercase tracking-widest py-4 rounded-[0.25rem] flex items-center justify-center gap-3 transition-colors disabled:opacity-40"
            >
              <Save className="h-5 w-5 stroke-[3]" />
              <span>{saving ? 'UPDATING SYSTEMS...' : 'Save Profile Identity'}</span>
            </button>

          </form>

        </div>
      </main>
    </div>
  )
}
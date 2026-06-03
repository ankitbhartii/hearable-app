import { v2 as cloudinary } from 'cloudinary'
import { NextResponse } from 'next/server'

// Configure the backend SDK
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST() {
  try {
    const timestamp = Math.round((new Date).getTime() / 1000)
    
    // We are putting audio files into an 'audiobooks' folder in Cloudinary
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: 'audiobooks',
      },
      process.env.CLOUDINARY_API_SECRET
    )

    // Return everything the frontend needs to make the direct upload
    return NextResponse.json({ 
      timestamp, 
      signature, 
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    })
  } catch (error) {
    console.error('Cloudinary Signature Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
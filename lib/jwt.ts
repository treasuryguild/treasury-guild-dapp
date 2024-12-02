// lib/jwt.ts
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET!

export function generateToken(userId: string) {
  return jwt.sign(
    { 
      sub: userId,
      role: 'authenticated',
      aud: 'authenticated'
    }, 
    JWT_SECRET,
    { 
      expiresIn: '24h',
      algorithm: 'HS256'
    }
  )
}
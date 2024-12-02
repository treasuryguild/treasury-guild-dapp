// pages/api/auth/wallet/verify.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyWalletSignature } from '../../../../lib/auth'
import { generateToken } from '../../../../lib/jwt'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  
  const { walletAddress, signature } = req.body
  const result = await verifyWalletSignature(walletAddress, signature)
  
  if (result.success) {
    const token = generateToken(result.userId)
    res.json({ 
      success: true, 
      token,
      user: {
        id: result.userId,
        wallet_address: walletAddress
      }
    })
  } else {
    res.json({ success: false })
  }
}
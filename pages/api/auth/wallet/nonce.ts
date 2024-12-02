// pages/api/auth/wallet/nonce.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { handleWalletLogin } from '../../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  
  const { walletAddress } = req.body
  const result = await handleWalletLogin(walletAddress)
  res.json(result)
}
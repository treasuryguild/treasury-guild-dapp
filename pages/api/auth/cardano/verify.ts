// pages/api/auth/cardano/verify.ts
import { SignJWT } from 'jose';
import type { NextApiRequest, NextApiResponse } from 'next';
import { checkSignature, generateNonce } from '@meshsdk/core';
import { supabase } from '../../../../lib/supabase';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userAddress, signature } = req.body;

    // Get user and their stored nonce
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select()
      .eq('wallet_address', userAddress)
      .single();

    if (fetchError || !user || !user.nonce) {
      return res.status(400).json({ message: 'Invalid user or nonce' });
    }

    // Verify the signature
    const isValid = checkSignature(user.nonce, signature, userAddress);
    console.log("Signature valid:", isValid);

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    // Generate a new nonce for next time
    const newNonce = generateNonce('Sign to login to YourApp: ');

    // Update user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        nonce: newNonce,
        verified: true,
      })
      .eq('wallet_address', userAddress);

    if (updateError) throw updateError;

    // Generate JWT using jose
    const token = await new SignJWT({ walletAddress: userAddress })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(new TextEncoder().encode(JWT_SECRET));

    console.log("Sending token back to client");
    return res.status(200).json({ token });
    
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
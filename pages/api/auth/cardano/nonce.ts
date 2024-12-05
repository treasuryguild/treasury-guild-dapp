// pages/api/auth/cardano/nonce.ts
import { generateNonce } from '@meshsdk/core';
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userAddress } = req.body;

    if (!userAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }

    // Generate a new nonce
    const nonce = generateNonce('Sign to login to YourApp: ');

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select()
      .eq('wallet_address', userAddress)
      .single();

    if (!existingUser) {
      // Create new user if they don't exist
      const { error } = await supabase
        .from('users')
        .insert([
          {
            wallet_address: userAddress,
            nonce,
            verified: false,
          }
        ]);

      if (error) throw error;
    } else {
      // Update existing user's nonce
      const { error } = await supabase
        .from('users')
        .update({ nonce })
        .eq('wallet_address', userAddress);

      if (error) throw error;
    }

    return res.status(200).json({ nonce });
  } catch (error) {
    console.error('Nonce generation error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
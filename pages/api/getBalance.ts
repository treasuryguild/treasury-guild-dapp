// ../pages/api/getBalance.ts

import { NextApiRequest, NextApiResponse } from 'next';

interface WalletRequest extends NextApiRequest {
  body: {
    wallet: string;
  };
}

interface AddressInfo {
  balance: number;
  // Add other fields from the API response if needed
}

interface KoiosRequestBody {
  _addresses: string[];
}

// In your API route, add some logging:
export default async function handler(
    req: WalletRequest,
    res: NextApiResponse
  ) {
    console.log('🚀 API ROUTE CALLED 🚀');
    console.log('Method:', req.method);
    
    if (req.method === 'POST') {
      console.log('🔑 Received wallet address:', req.body.wallet);
    const wallet: string = req.body.wallet;
    const url = "https://api.koios.rest/api/v1/address_info?select=balance";
    const data: KoiosRequestBody = {
      _addresses: [wallet],
    };

    // Log to check if the API key is present
    console.log('API Key present:', !!process.env.KOIOS_API_KEY);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.KOIOS_API_KEY}`
        },
        body: JSON.stringify(data)
      });

      // Log the response status
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const responseData: AddressInfo[] = await response.json();
      res.status(200).json(responseData);
    } catch (error) {
      console.error('Full error:', error);
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'An unknown error occurred' });
      }
    }
  } else {
    res.status(405).end();
  }
}
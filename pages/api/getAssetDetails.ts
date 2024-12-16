// ../pages/api/getAssetDetails.ts

import type { NextApiRequest, NextApiResponse } from 'next';

interface AssetRequestBody {
  transformedArray: string[];
}

interface AssetInfoRequest {
  _asset_list: string[];
}

interface AssetInfoResponse {
  [key: string]: any;  
}

interface ErrorResponse {
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AssetInfoResponse[] | ErrorResponse>
) {
  if (req.method === 'POST') {
    const { transformedArray } = req.body as AssetRequestBody;
    const url = "https://api.koios.rest/api/v1/asset_info";
    
    const data: AssetInfoRequest = {
      _asset_list: transformedArray,
    };

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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData: AssetInfoResponse[] = await response.json();
      res.status(200).json(responseData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ message: errorMessage });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(); // Method Not Allowed
  }
}
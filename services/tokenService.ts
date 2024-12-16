// services/tokenService.ts
import { supabase } from "../lib/supabase";
import {setTokenTypes} from "../utils/setTokenTypes"

interface TokenBalance {
  unit: string;
  quantity: string;
}

interface TokenDetails {
  unit: string;
  policy_id: string;
  asset_name: string;
  fingerprint?: string;
  decimals?: number;
}

interface TokenUpdate {
  unit: string;
  policy_id: string;
  asset_name: string;
  ticker?: string;
  asset_type?: string;
  decimals: number;
  fingerprint?: string;
}

interface KoiosAssetInfo {
  policy_id: string;
  asset_name: string;
  asset_name_ascii: string;
  fingerprint: string;
  minting_tx_hash: string;
  total_supply: string;
  mint_cnt: number;
  burn_cnt: number;
  creation_time: number;
  minting_tx_metadata?: {
    [key: string]: any;
  };
}

async function fetchAssetDetails(units: string[]): Promise<KoiosAssetInfo[]> {
    try {
      console.log('Sending request for units:', units.length);
      
      const response = await fetch('/api/getAssetDetails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transformedArray: units }),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log('Successfully fetched details for', data.length, 'assets');
      return data;
    } catch (error) {
      console.error('Detailed fetch error:', error);
      return [];
    }
  }

export async function processWalletTokens(balance: TokenBalance[]) {
  try {
    // Skip the first item (lovelace) as it's the native token
    const nonNativeTokens = balance.slice(1);
    
    // Get all units for Koios API request
    const units = nonNativeTokens.map(token => token.unit);
    
    // Fetch additional details from Koios
    const assetDetails = await fetchAssetDetails(units);
    
    // Create a map for quick lookup
    const assetDetailsMap = new Map(
      assetDetails.map(asset => [`${asset.policy_id}${asset.asset_name}`, asset])
    );
    
    // Transform tokens to the required format
    const transformedTokens = nonNativeTokens.map(token => {
      const { unit } = token;
      
      // Policy ID is the first 56 characters of the unit
      const policy_id = unit.slice(0, 56);
      
      // Asset name is the remaining hex after policy ID
      const asset_name_hex = unit.slice(56);
      
      // Try to get additional details from Koios response
      const koiosDetails = assetDetailsMap.get(unit);
      
      // Convert hex to UTF-8 string if possible
      let asset_name = '';
      try {
        // Use Koios ASCII name if available, otherwise convert hex
        asset_name = koiosDetails?.asset_name_ascii || hexToUtf8(asset_name_hex);
      } catch (error) {
        asset_name = asset_name_hex;
      }

      let displayname = asset_name;
      let name = asset_name;

      // Get metadata if available
      const metadata = koiosDetails?.minting_tx_metadata;
      let decimals = 0;
      let tokenType = 'unknown';

      // Try to extract decimals and other metadata if available
      if (metadata) {
        // Look for decimals in common metadata formats
        decimals = metadata[721]?.[policy_id]?.[asset_name]?.decimals || 
                  metadata[721]?.decimals ||
                  metadata?.decimals || 
                  0;
                  
        // You might want to add logic here to determine token type
        // based on metadata patterns or other characteristics
        tokenType = determineTokenType(metadata);
      }

      return {
        unit,
        policy_id,
        asset_name,
        displayname,
        name,
        decimals,
        tokenType,
        fingerprint: koiosDetails?.fingerprint || generateFingerprint(policy_id, asset_name_hex),
        total_supply: koiosDetails?.total_supply,
        creation_time: koiosDetails?.creation_time,
      };
    });

    // Use setTokenTypes to save to database
    const status = await setTokenTypes(transformedTokens);
    return status;
  } catch (error) {
    console.error('Error processing wallet tokens:', error);
    throw error;
  }
}

// Helper function to determine token type based on metadata
function determineTokenType(metadata: any): string {
  if (!metadata) return 'unknown';
  
  // Add your logic here to determine token type
  // This is a simple example - you might want to make this more sophisticated
  if (metadata[721]?.['NFT']) return 'nft';
  if (metadata[721]?.['FT']) return 'ft';
  
  return 'unknown';
}

// Helper function to convert hex to UTF-8
function hexToUtf8(hex: string): string {
  let str = '';
  try {
    for (let i = 0; i < hex.length; i += 2) {
      const charCode = parseInt(hex.substr(i, 2), 16);
      str += String.fromCharCode(charCode);
    }
    return str;
  } catch (error) {
    console.error('Error converting hex to UTF-8:', error);
    return hex; // Return original hex if conversion fails
  }
}

// Helper function to generate fingerprint (placeholder - implement according to your needs)
function generateFingerprint(policyId: string, assetNameHex: string): string {
  // Implement your fingerprint generation logic here
  // This is a placeholder - you should implement the actual algorithm you want to use
  return `${policyId}_${assetNameHex}`;
}

export async function getTokenDetails(unit: string) {
  try {
    const { data, error } = await supabase
      .from("tokens")
      .select("*")
      .eq("unit", unit)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching token details:', error);
    throw error;
  }
}
// auth-context.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BrowserWallet } from '@meshsdk/core';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AuthContextType {
  user: UserProfile | null;
  connectWallet: () => Promise<void>;
  connectDiscord: () => Promise<void>;
  connectGithub: () => Promise<void>;
  setPrimaryWallet: (address: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    checkUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data: linkedProfile, error: linkError } = await supabase
        .from('user_profiles')
        .select('profile_id')
        .eq('auth_id', userId)
        .maybeSingle();
        
      console.log('Linked profile:', linkedProfile);
  
      const profileId = linkedProfile?.profile_id || userId;
      console.log('Using profile ID:', profileId);
  
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();
        
      console.log('Found profile:', profile);
  
      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }
  
      if (profile) {
        console.log('Setting user profile:', profile);
        setUser(profile);
      } else {
        console.log('No profile found, setting user to null');
        setUser(null);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setUser(null);
    }
  };

  const connectWallet = async () => {
    try {
      console.log('Starting wallet connection...');
      const wallet = await BrowserWallet.enable('nami');
      const address = await wallet.getChangeAddress();
      console.log('Got wallet address:', address);
  
      // First check if this wallet exists in any profile - do this BEFORE session check
      console.log('Checking for existing profiles with wallet...');
      const { data: existingProfiles, error: existingProfileError } = await supabase.rpc(
        'get_profile_by_wallet_address',
        { wallet_address: address }
      );
      console.log('Existing profiles:', existingProfiles);
  
      if (existingProfileError) {
        console.error('Error checking existing profiles:', existingProfileError);
        throw existingProfileError;
      }
  
      // If wallet exists in a profile, sign in anonymously and link to that profile
      if (existingProfiles && existingProfiles.length > 0) {
        console.log('Found existing profile:', existingProfiles[0]);
        
        // Sign in anonymously
        const { data: { session: anonSession }, error: anonError } = await supabase.auth.signInAnonymously();
        console.log('Created anonymous session:', anonSession);
   
        if (anonError) {
          console.error('Error signing in anonymously:', anonError);
          throw anonError;
        }
  
        console.log('Anonymous session created:', anonSession?.user.id);
        
        // Create link between the anonymous user and the existing profile
        const { data: linkData, error: linkError } = await supabase
          .from('user_profiles')
          .insert({
            auth_id: anonSession?.user.id,
            profile_id: existingProfiles[0].id
          })
          .select()
          .single();
  
        if (linkError) {
          console.error('Error creating user_profiles link:', linkError);
          throw linkError;
        }
  
        console.log('Created user_profiles link:', linkData);
        
        await fetchUserProfile(existingProfiles[0].id);
        return;
      }
  
      // If no existing profile found, create new anonymous session
      const { data: { session: newAnonSession }, error: newAnonError } = await supabase.auth.signInAnonymously();
  
      if (newAnonError) {
        console.error('Error creating new anonymous session:', newAnonError);
        throw newAnonError;
      }
  
      if (!newAnonSession?.user?.id) {
        throw new Error('Failed to create anonymous session');
      }
  
      console.log('New anonymous session created:', newAnonSession.user.id);
  
      // Create new profile with wallet
      const { data: newProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert([{
          id: newAnonSession.user.id,
          wallets: [{ address, isPrimary: true }]
        }])
        .select()
        .single();
  
      if (createProfileError) {
        console.error('Error creating new profile:', createProfileError);
        throw createProfileError;
      }
  
      console.log('Created new profile:', newProfile);
  
      // Create initial user_profiles link
      const { error: initialLinkError } = await supabase
        .from('user_profiles')
        .insert({
          auth_id: newAnonSession.user.id,
          profile_id: newAnonSession.user.id
        });
  
      if (initialLinkError) {
        console.error('Error creating initial user_profiles link:', initialLinkError);
        throw initialLinkError;
      }
  
      await fetchUserProfile(newAnonSession.user.id);
  
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  };

  const connectDiscord = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          scopes: 'identify guilds.members.read'
        }
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error connecting Discord:', error);
      throw error;
    }
  };

  const connectGithub = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github'
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error connecting Github:', error);
      throw error;
    }
  };

  const setPrimaryWallet = async (address: string) => {
    try {
      if (!user) throw new Error('No user logged in');

      const updatedWallets = user.wallets.map(wallet => ({
        ...wallet,
        isPrimary: wallet.address === address
      }));

      const { error } = await supabase
        .from('profiles')
        .update({ wallets: updatedWallets })
        .eq('id', user.id);

      if (error) throw error;
      
      await fetchUserProfile(user.id);
    } catch (error) {
      console.error('Error setting primary wallet:', error);
      throw error;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      connectWallet,
      connectDiscord,
      connectGithub,
      setPrimaryWallet,
      logout,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
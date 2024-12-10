// contexts/auth-context.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BrowserWallet } from '@meshsdk/core';
import { AuthContextType, User } from '../types/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          const provider = session.user.app_metadata.provider;
          if (provider === 'discord' || provider === 'github') {
            await handleOAuthProfile(session.user, provider);
          }
        }
        await fetchUserProfile(session.user.id);
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
      const { data: linkedProfile, error: linkError } = await supabase
        .from('user_profiles')
        .select('profile_id')
        .eq('auth_id', userId)
        .maybeSingle();

      const profileId = linkedProfile?.profile_id || userId;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

      if (error) throw error;
      if (profile) setUser(profile);
      else setUser(null);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setUser(null);
    }
  };

  const handleOAuthProfile = async (providerUser: any, provider: 'discord' | 'github') => {
    try {
      const providerId = providerUser.id;
      const username = providerUser.user_metadata?.full_name || 
                      providerUser.user_metadata?.preferred_username ||
                      providerUser.user_metadata?.user_name;

      // First check if this auth_id already has a profile link
      const { data: existingLink } = await supabase
        .from('user_profiles')
        .select('profile_id')
        .eq('auth_id', providerUser.id)
        .maybeSingle();

      if (existingLink?.profile_id) {
        await fetchUserProfile(existingLink.profile_id);
        return;
      }

      // Check if there's an existing profile with this provider ID
      const { data: existingProfiles, error: existingProfileError } = await supabase
        .from('profiles')
        .select('*')
        .or(`${provider}_id.eq.${providerId}`);

      if (existingProfileError) throw existingProfileError;

      if (existingProfiles && existingProfiles.length > 0) {
        // Link current auth to existing profile
        const { error: linkError } = await supabase
          .from('user_profiles')
          .insert({
            auth_id: providerUser.id,
            profile_id: existingProfiles[0].id
          });

        if (linkError) throw linkError;
        
        await fetchUserProfile(existingProfiles[0].id);
        return;
      }

      // Create new profile if none exists
      const newProfile = {
        id: providerUser.id,
        [`${provider}_id`]: providerId,
        [`${provider}_username`]: username,
        wallets: []
      };

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single();

      if (profileError) throw profileError;

      // Create initial user_profiles link
      const { error: linkError } = await supabase
        .from('user_profiles')
        .insert({
          auth_id: providerUser.id,
          profile_id: providerUser.id
        });

      if (linkError) throw linkError;

      await fetchUserProfile(providerUser.id);
    } catch (error) {
      console.error('Error in handleOAuthProfile:', error);
      throw error;
    }
  };

  const connectWallet = async (provider: string = 'nami') => {
    try {
      const wallet = await BrowserWallet.enable(provider);
      const address = await wallet.getChangeAddress();
  
      // Check if this wallet exists in any profile
      const { data: existingProfiles, error: existingProfileError } = await supabase.rpc(
        'get_profile_by_wallet_address',
        { wallet_address: address }
      );
  
      if (existingProfileError) throw existingProfileError;
  
      // If wallet exists in a profile, sign in anonymously and link to that profile
      if (existingProfiles && existingProfiles.length > 0) {
        const { data: { session: anonSession }, error: anonError } = 
          await supabase.auth.signInAnonymously();
   
        if (anonError) throw anonError;
  
        // Create link between the anonymous user and the existing profile
        const { error: linkError } = await supabase
          .from('user_profiles')
          .insert({
            auth_id: anonSession?.user.id,
            profile_id: existingProfiles[0].id
          });
  
        if (linkError) throw linkError;
        
        await fetchUserProfile(existingProfiles[0].id);
        return;
      }
  
      // If no existing profile found, create new anonymous session
      const { data: { session: newAnonSession }, error: newAnonError } = 
        await supabase.auth.signInAnonymously();
  
      if (newAnonError) throw newAnonError;
  
      if (!newAnonSession?.user?.id) {
        throw new Error('Failed to create anonymous session');
      }
  
      // Create new profile with wallet
      const { data: newProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert([{
          id: newAnonSession.user.id,
          wallets: [{ address, isPrimary: true }]
        }])
        .select()
        .single();
  
      if (createProfileError) throw createProfileError;
  
      // Create initial user_profiles link
      const { error: initialLinkError } = await supabase
        .from('user_profiles')
        .insert({
          auth_id: newAnonSession.user.id,
          profile_id: newAnonSession.user.id
        });
  
      if (initialLinkError) throw initialLinkError;
  
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
          scopes: 'identify guilds.members.read',
          redirectTo: `${window.location.origin}/auth/callback`
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
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
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
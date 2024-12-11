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
      console.log('Auth state change:', event, session?.user?.id);
      
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          try {
            // First fetch the current user profile
            const currentProfile = await fetchUserProfile(session.user.id);
            
            // Then handle OAuth connections if applicable
            const provider = session.user.app_metadata.provider;
            if (provider === 'discord' || provider === 'github') {
              console.log('Handling OAuth with current profile:', currentProfile);
              await handleOAuthProfile(session.user, provider, currentProfile);
            }
          } catch (error) {
            console.error('Error in auth state change handler:', error);
          }
        } else {
          // For other events, just fetch the profile
          await fetchUserProfile(session.user.id);
        }
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
      
      // First get the linked profile if one exists
      const { data: linkedProfile, error: linkError } = await supabase
        .from('user_profiles')
        .select('profile_id')
        .eq('auth_id', userId)
        .maybeSingle();
  
      if (linkError) {
        console.error('Error fetching linked profile:', linkError);
        throw linkError;
      }
  
      console.log('Found linked profile:', linkedProfile);
  
      // Determine which profile ID to use
      const profileId = linkedProfile?.profile_id || userId;
      console.log('Using profile ID:', profileId);
  
      // Fetch the actual profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();
  
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }
  
      if (profile) {
        console.log('Found profile:', profile);
        
        // If we found a profile with no wallets array, initialize it
        if (!profile.wallets) {
          profile.wallets = [];
        }
        
        console.log('Setting user with profile:', profile);
        setUser(profile);
      } else {
        console.log('No profile found for ID:', profileId);
        setUser(null);
      }
  
      return profile;  // Return the profile for chaining if needed
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setUser(null);
      throw error;  // Re-throw to handle in calling function if needed
    }
  };

  const handleOAuthProfile = async (
    providerUser: any, 
    provider: 'discord' | 'github',
    currentProfile: User | null
  ) => {
    try {
      console.log('Provider User:', providerUser);
      console.log('Provider Metadata:', providerUser.user_metadata);
      
      const providerId = providerUser.user_metadata?.provider_id || providerUser.id;
      const username = provider === 'discord' 
        ? providerUser.user_metadata?.custom_claims?.global_name || 
          providerUser.user_metadata?.custom_claims?.username ||
          providerUser.user_metadata?.full_name
        : providerUser.user_metadata?.user_name || 
          providerUser.user_metadata?.preferred_username;
  
      console.log('Extracted Provider ID:', providerId);
      console.log('Extracted Username:', username);
      console.log('Current profile:', currentProfile);
  
      // First check if we have a current profile
      if (currentProfile?.id) {
        console.log('Existing profile found, updating:', currentProfile.id);
        
        // Update existing profile with new OAuth info
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            [`${provider}_id`]: providerId,
            [`${provider}_username`]: username
          })
          .eq('id', currentProfile.id);
  
        if (updateError) {
          console.error('Error updating profile:', updateError);
          throw updateError;
        }
  
        // Link new auth to existing profile
        const { error: linkError } = await supabase
          .from('user_profiles')
          .insert({
            auth_id: providerUser.id,
            profile_id: currentProfile.id
          });
  
        if (linkError && !linkError.message.includes('unique constraint')) {
          console.error('Error linking auth:', linkError);
          throw linkError;
        }
  
        await fetchUserProfile(currentProfile.id);
        return;
      }
  
      // Check if this auth_id already has a profile link
      const { data: existingLink } = await supabase
        .from('user_profiles')
        .select('profile_id')
        .eq('auth_id', providerUser.id)
        .maybeSingle();
  
      console.log('Existing link check:', existingLink);
  
      if (existingLink?.profile_id) {
        console.log('Found existing profile link:', existingLink.profile_id);
        // Update the existing profile with latest provider info
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            [`${provider}_id`]: providerId,
            [`${provider}_username`]: username
          })
          .eq('id', existingLink.profile_id);
  
        if (updateError) throw updateError;
        
        await fetchUserProfile(existingLink.profile_id);
        return;
      }
  
      // Check if there's an existing profile with this provider ID
      const { data: existingProfiles, error: existingProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq(`${provider}_id`, providerId)
        .maybeSingle();
  
      console.log('Existing profile check:', existingProfiles);
  
      if (existingProfileError) throw existingProfileError;
  
      if (existingProfiles) {
        console.log('Found existing profile:', existingProfiles);
        // Update existing profile with latest info
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            [`${provider}_username`]: username
          })
          .eq('id', existingProfiles.id);
  
        if (updateError) throw updateError;
  
        // Link current auth to existing profile
        const { error: linkError } = await supabase
          .from('user_profiles')
          .insert({
            auth_id: providerUser.id,
            profile_id: existingProfiles.id
          });
  
        if (linkError && !linkError.message.includes('unique constraint')) {
          throw linkError;
        }
        
        await fetchUserProfile(existingProfiles.id);
        return;
      }
  
      console.log('No existing profile found, creating new one');
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
  
      // If user is already authenticated (e.g., via Discord)
      if (user?.id) {
        // Check if this wallet is already connected to any profile
        const { data: existingProfiles, error: existingProfileError } = await supabase.rpc(
          'get_profile_by_wallet_address',
          { wallet_address: address }
        );
  
        if (existingProfileError) throw existingProfileError;
  
        // If wallet exists in another profile, throw error
        if (existingProfiles && existingProfiles.length > 0 && existingProfiles[0].id !== user.id) {
          throw new Error('Wallet already connected to another account');
        }
  
        // Add wallet to current user's profile
        const updatedWallets = [...(user.wallets || [])];
        if (!updatedWallets.some(w => w.address === address)) {
          updatedWallets.push({
            address,
            isPrimary: updatedWallets.length === 0 // Make primary if it's the first wallet
          });
  
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ wallets: updatedWallets })
            .eq('id', user.id);
  
          if (updateError) throw updateError;
        }
  
        await fetchUserProfile(user.id);
        return;
      }
  
      // If no user is logged in, proceed with anonymous auth flow
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
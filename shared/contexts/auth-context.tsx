// contexts/auth-context.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BrowserWallet } from '@meshsdk/core';
import { AuthContextType, User } from '../types/auth';

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
  
      console.log(`Extracted ${provider} ID:`, providerId);
      console.log(`Extracted ${provider} username:`, username);
  
      // First check if there's a profile that already has this provider ID
      const { data: existingProfileWithProvider } = await supabase
        .from('profiles')
        .select('*')
        .eq(`${provider}_id`, providerId)
        .maybeSingle();
  
      if (existingProfileWithProvider) {
        console.log('Found existing profile with this provider:', existingProfileWithProvider);
        
        // Update username if needed
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            [`${provider}_username`]: username
          })
          .eq('id', existingProfileWithProvider.id);
  
        if (updateError) throw updateError;
  
        // Link the auth if not already linked
        const { error: linkError } = await supabase
          .from('user_profiles')
          .insert({
            auth_id: providerUser.id,
            profile_id: existingProfileWithProvider.id
          });
  
        if (linkError && !linkError.message.includes('unique constraint')) {
          throw linkError;
        }
  
        await fetchUserProfile(existingProfileWithProvider.id);
        return;
      }
  
      // Get the stored profile info from previous OAuth connection
      const storedProfileJson = localStorage.getItem('previousProfile');
      const storedProfile = storedProfileJson ? JSON.parse(storedProfileJson) : null;
      console.log('Found stored profile:', storedProfile);
  
      if (storedProfile) {
        console.log('Linking with stored profile:', storedProfile.id);
        
        // Update the stored profile with the new provider info
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            [`${provider}_id`]: providerId,
            [`${provider}_username`]: username
          })
          .eq('id', storedProfile.id);
  
        if (updateError) {
          console.error('Error updating profile:', updateError);
          throw updateError;
        }
  
        // Create link between OAuth auth and stored profile
        const { error: linkError } = await supabase
          .from('user_profiles')
          .insert({
            auth_id: providerUser.id,
            profile_id: storedProfile.id
          });
  
        if (linkError && !linkError.message.includes('unique constraint')) {
          console.error('Error linking auth:', linkError);
          throw linkError;
        }
  
        // Clear the stored profile
        localStorage.removeItem('previousProfile');
  
        await fetchUserProfile(storedProfile.id);
        return;
      }
  
      // If we get here, create a new profile
      console.log('Creating new profile');
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
  
      if (profileError) {
        console.error('Error creating profile:', profileError);
        throw profileError;
      }
  
      // Create initial user_profiles link
      const { error: linkError } = await supabase
        .from('user_profiles')
        .insert({
          auth_id: providerUser.id,
          profile_id: providerUser.id
        });
  
      if (linkError) {
        console.error('Error creating profile link:', linkError);
        throw linkError;
      }
  
      console.log('Successfully created new profile');
      await fetchUserProfile(providerUser.id);
    } catch (error) {
      console.error('Error in handleOAuthProfile:', error);
      // Clear stored profile on error
      localStorage.removeItem('previousProfile');
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
  
        // Add wallet to current user's profile with provider information
        const updatedWallets = [...(user.wallets || [])];
        if (!updatedWallets.some(w => w.address === address)) {
          updatedWallets.push({
            address,
            provider, // Save the provider name
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
  
      // For anonymous auth flow, create new profile with wallet and provider
      const { data: existingProfiles, error: existingProfileError } = await supabase.rpc(
        'get_profile_by_wallet_address',
        { wallet_address: address }
      );
  
      if (existingProfileError) throw existingProfileError;
  
      if (existingProfiles && existingProfiles.length > 0) {
        const { data: { session: anonSession }, error: anonError } = 
          await supabase.auth.signInAnonymously();
   
        if (anonError) throw anonError;
  
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
  
      const { data: { session: newAnonSession }, error: newAnonError } = 
        await supabase.auth.signInAnonymously();
  
      if (newAnonError) throw newAnonError;
  
      if (!newAnonSession?.user?.id) {
        throw new Error('Failed to create anonymous session');
      }
  
      // Create new profile with wallet including provider information
      const { data: newProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert([{
          id: newAnonSession.user.id,
          wallets: [{
            address,
            provider, // Save the provider name
            isPrimary: true
          }]
        }])
        .select()
        .single();
  
      if (createProfileError) throw createProfileError;
  
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
      // Store current user profile before Discord connection
      if (user) {
        // Store in localStorage since we'll lose state during OAuth redirect
        localStorage.setItem('previousProfile', JSON.stringify({
          id: user.id,
          discord_id: user.discord_id,
          github_id: user.github_id,
          wallets: user.wallets
        }));
      }
  
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
      // Store current user profile before GitHub connection
      if (user) {
        localStorage.setItem('previousProfile', JSON.stringify({
          id: user.id,
          discord_id: user.discord_id,
          github_id: user.github_id,
          wallets: user.wallets
        }));
      }
  
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
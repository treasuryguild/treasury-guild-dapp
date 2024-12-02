import { useWallet } from '@meshsdk/react';
import { useSession } from '@supabase/auth-helpers-react';

export default function MyComponent() {
  const { wallet, connected } = useWallet();
  const session = useSession();

  return (
    <div>
      {connected && <div>Wallet Connected!</div>}
      {session && <div>User Logged In!</div>}
    </div>
  );
}
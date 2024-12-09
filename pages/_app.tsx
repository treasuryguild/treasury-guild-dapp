// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { MeshProvider } from "@meshsdk/react";
import { AuthProvider } from '../contexts/auth-context';
import Navbar from "../components/Navbar";

function MyApp({ Component, pageProps }: AppProps) {
  

  return (
    <AuthProvider>
      <MeshProvider>
        <Navbar />
        <Component {...pageProps} />
      </MeshProvider>
    </AuthProvider>
  );
}

export default MyApp;
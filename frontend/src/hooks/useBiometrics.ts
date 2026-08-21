/* Hook: biometría — BANCA NEN
   Simula la verificación biométrica (Face ID / huella) que en la
   app móvil se resuelve con expo-local-authentication. */
import { useState } from "react";

export function useBiometrics() {
  const [supported] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined" && "credentials" in navigator;
    } catch {
      return false;
    }
  });
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);

  const authenticate = async (): Promise<boolean> => {
    setChecking(true);
    await new Promise((r) => setTimeout(r, 900));
    setChecking(false);
    setVerified(true);
    return true;
  };

  const reset = () => setVerified(false);

  return { supported, verified, checking, authenticate, reset };
}

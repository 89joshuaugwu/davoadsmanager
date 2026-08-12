import { auth } from "@/lib/firebase";

async function callVault(action: "encrypt" | "decrypt", value: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const token = await user.getIdToken();
  const res = await fetch("/api/vault", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, value }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Vault request failed");
  return data.result as string;
}

export const encryptPassword = (plainText: string) => callVault("encrypt", plainText);
export const decryptPassword = (cipherText: string) => callVault("decrypt", cipherText);

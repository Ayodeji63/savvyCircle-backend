import { createPublicClient, createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// Ensure this is securely set in your environment variables
const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
    throw new Error("Private key is not set in environment variables");
}

export const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http()
});

export const account = privateKeyToAccount(privateKey);

export const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http()
});

export const address = account.address;

// Log the account address to verify it's set correctly
console.log("Account address:", account.address);
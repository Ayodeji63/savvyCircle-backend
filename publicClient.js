import { createPublicClient, createWalletClient, http } from "viem";
import { scrollSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export const publicClient = createPublicClient({
    chain: scrollSepolia,
    transport: http()
})
const account = privateKeyToAccount(process.env.PRIVATE_KEY);
export const walletClient = createWalletClient({
    account,
    chain: scrollSepolia,
    transport: http()
})
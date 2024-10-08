import { Markup } from "telegraf/markup";
import { publicClient } from "../../publicClient";
import { sendMessage } from "./Telegram";
const ETHERSCAN_BASE_URL = "https://sepolia.base.dev/tx/";

const unwatch = publicClient.watchContractEvent({
    address: contractAddress,
    abi: abi,
    eventName: 'SavingsDeposited',
    onLogs: async (logs) => {
        try {
            await handleSavingsDepositedEvent(logs);
        } catch (error) {
            console.error('Error handling SavingsDeposited event:', error);
        }
    }
});

export async function handleSavingsDepositedEvent(logs) {
    for (const log of logs) {
        const { groupId, member, amount } = log.args;
        const transactionHash = log.transactionHash;

        const chatId = Number(groupId);
        const formattedAmount = formatEther(amount);

        const message = `
<b>New Savings Deposit! 💰</b>

Member: <code>${member}</code>
Amount: <b>${formattedAmount} ETH</b>

Great job on contributing to your savings goal! 🎉
        `;

        const inlineKeyboard = Markup.inlineKeyboard([
            [Markup.button.url('View Transaction', `${ETHERSCAN_BASE_URL}${transactionHash}`)]
        ]);

        try {
            await sendMessage(chatId, message, inlineKeyboard);
        } catch (error) {
            console.error(`Error sending message to group ${chatId}:`, error);
        }
    }
}

const repayLoanWatch = publicClient.watchContractEvent({
    address: contractAddress,
    abi: abi,
    eventName: 'LoanRepayment',
    onLogs: async (logs) => {
        try {
            await handleLoanRepaymentEvent(logs);
        } catch (error) {
            console.error('Error handling SavingsDeposited event:', error);
        }
    }
});



// LoanDistributed


export async function handleLoanRepaymentEvent(logs) {
    for (const log of logs) {
        const { groupId, borrower, amount } = log.args;
        const transactionHash = log.transactionHash;

        const chatId = Number(groupId);
        const formattedAmount = formatEther(amount);

        const message = `
<b>💰💰 New Loan Repayment! 💰💰</b>

Member: <code>${borrower}</code>
Amount: <b>${formattedAmount} ETH</b>

Great job on repaying back your loan! 🎉
        `;

        const inlineKeyboard = Markup.inlineKeyboard([
            [Markup.button.url('View Transaction', `${ETHERSCAN_BASE_URL}${transactionHash}`)]
        ]);

        try {
            await sendMessage(chatId, message, inlineKeyboard);
        } catch (error) {
            console.error(`Error sending message to group ${chatId}:`, error);
        }
    }
}


const watchLoanDisburse = publicClient.watchContractEvent({
    address: contractAddress,
    abi: abi,
    eventName: 'LoanDistributed',
    onLogs: async (logs) => {
        try {
            await handleLoanDistrubuteEvent(logs);
        } catch (error) {
            console.error('Error handling SavingsDeposited event:', error);
        }
    }
});


export async function handleLoanDistrubuteEvent(logs) {
    for (const log of logs) {
        const { groupId, borrower, loanAmount, isFirstBatch } = log.args;
        const transactionHash = log.transactionHash;

        const chatId = Number(groupId);
        const formattedAmount = formatEther(loanAmount);

        const message = `
<b>💰💰 New Loan Distrbuted! 💰💰</b>

Member: <code>${borrower}</code>
Amount: <b>${formattedAmount} ETH</b>

Loans given to ${borrower}! 🎉
        `;

        const inlineKeyboard = Markup.inlineKeyboard([
            [Markup.button.url('View Transaction', `${ETHERSCAN_BASE_URL}${transactionHash}`)]
        ]);

        try {
            await sendMessage(chatId, message, inlineKeyboard);
        } catch (error) {
            console.error(`Error sending message to group ${chatId}:`, error);
        }
    }
}
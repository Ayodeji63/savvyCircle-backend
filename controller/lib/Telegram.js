import { axiosInstance } from "./axios.js";
import { Web3 } from 'web3';
import { abi, contractAddress } from "../../contractAbi.js";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getUser, getUserByAddress } from "./getUser.js";
import { tokenAbi, tokenAddress } from "../../token.js";
import { Markup, Telegraf } from "telegraf";
import { publicClient, walletClient, account } from "../../publicClient.js";
import { formatEther, parseEther } from "viem";
import { inlineKeyboard } from "telegraf/markup";
import { json } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: `${__dirname}/.env` });

const TOKEN = process.env.TOKEN;
const bot = new Telegraf(TOKEN);
const web_link = "https://savvy-circle.vercel.app/";

const ETHERSCAN_BASE_URL = "https://sepolia.base.dev/tx/";

// Bot command handlers
bot.command('start', handleLaunchCommand);
bot.command('create', handleCreateGroup);
bot.command('join', handleJoinGroup);
bot.on('new_chat_members', handleNewMember);
bot.on('message', (ctx) => handleMessage(ctx.message));
bot.command('savvy', handleSavvyCommand);


// Blockchain event listeners
const unwatchSavingsDeposited = publicClient.watchContractEvent({
    address: contractAddress,
    abi: abi,
    eventName: 'SavingsDeposited',
    onLogs: handleSavingsDepositedEvent
});

const unwatchLoanRepayment = publicClient.watchContractEvent({
    address: contractAddress,
    abi: abi,
    eventName: 'LoanRepayment',
    onLogs: handleLoanRepaymentEvent
});

const unwatchLoanDistributed = publicClient.watchContractEvent({
    address: contractAddress,
    abi: abi,
    eventName: 'LoanDistributed',
    onLogs: handleLoanDistrubuteEvent
});

// Start the bot
bot.launch();
console.log('Bot is running');

// Handler functions
async function handleSavingsDepositedEvent(logs) {
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

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.url('View Transaction', `${ETHERSCAN_BASE_URL}${transactionHash}`)]
        ]);

        await sendMessage(chatId, message, keyboard);
    }
}

async function handleLoanRepaymentEvent(logs) {
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

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.url('View Transaction', `${ETHERSCAN_BASE_URL}${transactionHash}`)]
        ]);

        await sendMessage(chatId, message, keyboard);
    }
}

async function handleLoanDistrubuteEvent(logs) {
    for (const log of logs) {
        const { groupId, borrower, loanAmount, isFirstBatch } = log.args;
        const transactionHash = log.transactionHash;
        const chatId = Number(groupId);
        const formattedAmount = formatEther(loanAmount);

        const message = `
<b>💰💰 New Loan Distributed! 💰💰</b>

Member: <code>${borrower}</code>
Amount: <b>${formattedAmount} ETH</b>

Loans given to ${borrower}! 🎉
        `;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.url('View Transaction', `${ETHERSCAN_BASE_URL}${transactionHash}`)]
        ]);

        await sendMessage(chatId, message, keyboard);
    }
}

async function sendMessage(chatId, messageText, keyboard) {
    try {
        await bot.telegram.sendMessage(chatId, messageText, {
            parse_mode: 'HTML',
            ...keyboard
        });
        console.log(`Successfully sent message to chat ${chatId}`);
    } catch (error) {
        console.error(`Error sending message to chat ${chatId}:`, error);
    }
}

function handleLaunchCommand(ctx) {
    const chatId = ctx.chat.id;
    const keyboard = Markup.keyboard([
        [Markup.button.webApp('Open Web App', web_link)]
    ]).resize();

    return ctx.reply("Ready to start your savings journey? Click the button below to launch the SavvyCircle app!", keyboard);
}

async function handleCreateGroup(ctx) {
    const groupName = ctx.chat.title;
    const chatId = ctx.chat.id;
    const name = ctx.from.username;

    const userAddress = process.env.INITIAL_OWNER;

    try {
        const address = account?.address;

        const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: abi,
            functionName: 'createGroup',
            args: [groupName, userAddress, Number(chatId)]
        });

        const hash = await walletClient.writeContract(request);
        console.log(`Transaction receipt:`, hash);

        if (hash) {
            return ctx.reply(`Group "${groupName}" created successfully! Transaction hash ${hash}`);
        }
    } catch (error) {
        console.error('Error creating group:', error);

        let errorMessage = "An error occurred while creating the group. Please try again.";

        if (error.message.includes("gas")) {
            errorMessage = "Transaction failed due to insufficient gas. Please try again with a higher gas limit.";
        } else if (error.message.includes("revert")) {
            errorMessage = "Transaction reverted. Please check contract conditions and parameters.";
        } else if (String(error.cause).includes("already in group")) {
            errorMessage = "Request reverted: Group already created";
        }

        return ctx.reply(errorMessage);
    }
}

async function handleJoinGroup(ctx) {
    const groupName = ctx.chat.title;
    const chatId = ctx.chat.id;
    const name = ctx.from.username;

    try {
        const user = await getUser(name);
        const address = user.address;

        const data = await publicClient.readContract({
            address: contractAddress,
            abi: abi,
            functionName: 'getUserGroups',
            args: [String(address)]
        });

        if (data.includes(BigInt(chatId))) {
            return ctx.reply(`${name}, you're already a member of this group. No need to join again! Check your app for more details`);
        }

        const tx = await publicClient.simulateContract({
            address: tokenAddress,
            abi: tokenAbi,
            functionName: 'transfer',
            args: [address, parseEther('100000')],
            account
        });

        const txhash = await walletClient.writeContract(tx.request);

        setTimeout(async () => {
            const { request } = await publicClient.simulateContract({
                address: contractAddress,
                abi: abi,
                functionName: 'joinGroup',
                args: [chatId, address]
            });

            const hash = await walletClient.writeContract(request);
            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            return ctx.reply(`Welcome ${name}! You've successfully joined "${groupName}". Check your app for more details. Transaction hash: ${hash}`);
        }, 3000);

    } catch (error) {
        console.error('Error joining group:', error);

        let errorMessage = `Oops! We encountered an issue while trying to add ${name} to the group. `;

        if (error.message.includes("gas")) {
            errorMessage += "It seems there might be a network congestion. Please try again in a few minutes.";
        } else if (error.message.includes("revert")) {
            errorMessage += "The operation couldn't be completed due to contract restrictions. This could be because the group is full or you don't meet certain criteria to join.";
        } else if (String(error.cause).includes("already in group")) {
            errorMessage += "It looks like you're already a member of this group. No need to join again!";
        } else {
            errorMessage += "We're not sure what went wrong. Please try again later or contact support if the issue persists.";
        }

        return ctx.reply(errorMessage);
    }
}

function handleNewMember(ctx) {
    const newMembers = ctx.message.new_chat_members;
    const chatId = ctx.chat.id;
    const chatTitle = ctx.chat.title || "this group";

    newMembers.forEach(member => {
        const welcomeMessage = `
<b>Welcome to ${chatTitle}, ${member.first_name}!</b> 🎉

We're excited to have you join our SavvyCircle community. Here's how you can get started:

1. Type /help for help
2. Use /create to create a group
3. Use /join to become a part of an existing group

If you need any help, just ask! Happy saving! 💰
        `;

        ctx.reply(welcomeMessage, { parse_mode: 'HTML' });
    });
}

function handleMessage(message) {
    if (message?.new_chat_members && message?.new_chat_members.length > 0) {
        return handleNewMember({ message, chat: message.chat });
    }

    const messageText = message?.text || "";

    if (messageText.charAt(0) === "/") {
        const command = messageText.split('@')[0].substr(1).toLowerCase();
        switch (command) {
            case "start":
                return handleLaunchCommand({ chat: message.chat });
            case "create":
                return handleCreateGroup({ chat: message.chat, from: message.from });
            case "join":
                return handleJoinGroup({ chat: message.chat, from: message.from });
            default:
                return bot.telegram.sendMessage(message.chat.id, "Unknown command");
        }
    }
}

function handleSavvyCommand(ctx) {
    return ctx.reply('Ready to get savvy with your finances? Click below to open SavvyCircle:',
        Markup.inlineKeyboard([
            [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyCircleBot/SavvyCircle')]
        ])
    );
}

export { handleMessage, sendMessage };
import { axiosInstance } from "./axios.js";
import { Web3 } from 'web3';
import { abi, contractAddress } from "../../contractAbi.js";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import getUser from "./getUser.js";
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
const web_link = "https://savvy-circle.vercel.app/" // Make sure this is the correct Web App URL


// Define the Etherscan base URL (change this if you're using a different network)

const ETHERSCAN_BASE_URL = "https://sepolia.base.dev/tx/";



const unwatch = publicClient.watchContractEvent({
    address: contractAddress,
    abi: abi,
    eventName: 'SavingsDeposited',
    onLogs: logs => {
        console.log(logs)
        handleSavingsDepositedEvent(logs)
    }
});

console.log(unwatch);

function handleSavingsDepositedEvent(logs) {
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
            sendMessage(chatId, message, inlineKeyboard);
        } catch (error) {
            console.error(`Error sending message to group ${chatId}:`, error);
        }
    }
}

const repayLoanWatch = publicClient.watchContractEvent({
    address: contractAddress,
    abi: abi,
    eventName: 'LoanRepayment',
    onLogs: logs => {

        console.log(logs);

        handleLoanRepaymentEvent(logs);

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
    onLogs: logs => {
        console.log(logs);

        handleLoanDistrubuteEvent(logs);

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

export async function sendMessage(chatId, messageText, keyboard) {
    try {
        console.log(`Attempting to send message to chat ${chatId}: "${messageText}"`);

        if (!messageText || messageText.trim() === '') {
            console.error(`Attempted to send an empty message to chat ${chatId}`);
            return Promise.reject(new Error('Message text cannot be empty'));
        }

        const payload = {
            chat_id: chatId,
            text: messageText,
            parse_mode: 'HTML'
        };

        if (keyboard) {
            payload.reply_markup = JSON.stringify(keyboard);
        }

        return axiosInstance.post("sendMessage", payload).then(response => {
            console.log(`Successfully sent message to chat ${chatId}`);
            return response;
        }).catch(error => {
            console.error(`Error sending message to chat ${chatId}:`, error.response?.data || error.message);
            throw error;
        });
    } catch (error) {
        console.log(error);
    }
}


function handleMessage(messageObj) {
    // Check if this is a new member join event
    if (messageObj?.new_chat_members && messageObj?.new_chat_members.length > 0) {
        return handleNewMember(messageObj);
    }

    const messageText = messageObj?.text || "";
    const name = messageObj?.from?.first_name;
    console.log(name);

    if (messageText.charAt(0) === "/") {
        const command = messageText.split('@')[0].substr(1).toLowerCase();
        switch (command) {
            case "start":
                return handleLaunchCommand(messageObj);
            case "create":
                return handleCreateGroup(messageObj);
            case "join":
                return handleJoinGroup(messageObj);
            default:
                return sendMessage(messageObj?.chat.id, "Unknown command");
        }
    }
}

// TODO: show users groups

function handleLaunchCommand(messageObj) {
    const chatType = messageObj?.chat.type;
    const chatId = messageObj?.chat.id;


    // In group chats, use the inline URL button
    const inlineKeyboard = {
        // inline_keyboard: [
        //     [{
        // text: "🚀 Launch SavvyCircle App",
        // url: web_link
        //     }]
        // ]
        keyboard: [
            [Markup.button.webApp('Open Web App', web_link)]
        ]
    };

    return axiosInstance.post("sendMessage", {
        chat_id: chatId,
        text: "Ready to start your savings journey? Click the button below to launch the SavvyCircle app!",
        reply_markup: JSON.stringify(inlineKeyboard),
        parse_mode: "HTML"
    });

}



async function handleCreateGroup(messageObj) {
    const groupName = messageObj?.chat.title;
    const chatId = messageObj?.chat.id;
    const name = messageObj?.from.username;
    console.log(`This is name ${name}`);

    const userAddress = process.env.INITIAL_OWNER;

    try {
        console.log(`User address is `, account?.address);
        const address = account?.address;

        const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: abi,
            functionName: 'createGroup',
            args: [groupName, userAddress, Number(chatId)]
        })

        const hash = await walletClient.writeContract(request);
        console.log(`Transaction receipt:`, hash);

        if (!hash) {
            return;
        }
        return sendMessage(messageObj?.chat.id, `Group "${groupName}" created successfully! Transaction hash ${hash}`);
    } catch (error) {
        console.error('Error creating group:',);
        console.error('Error creating group:', error);


        let errorMessage = "An error occurred while creating the group. Please try again.";

        if (error.message.includes("gas")) {
            errorMessage = "Transaction failed due to insufficient gas. Please try again with a higher gas limit.";
        } else if (error.message.includes("revert")) {
            errorMessage = "Transaction reverted. Please check contract conditions and parameters.";
        } else if (String(error.cause).includes("already in group")) {
            errorMessage = "Request reverted: Group already created";
        }

        return sendMessage(messageObj?.chat.id, errorMessage);
    }
}

async function handleJoinGroup(messageObj) {
    const groupName = messageObj?.chat.title;
    const chatId = messageObj?.chat.id;
    const name = messageObj?.from.username;
    console.log(`This is name ${name}`);

    try {
        const user = await getUser(name);
        const address = user.address;
        console.log(`Address is given as `, address);

        const data = await publicClient.readContract({
            address: contractAddress,
            abi: abi,
            functionName: 'getUserGroups',
            args: [String(address)]
        });

        console.log(`Data is given as`, data);

        if (data.includes(BigInt(chatId))) {
            console.log(data.includes(BigInt(chatId)));
            return sendMessage(messageObj?.chat.id, `${name}, you're already a member of this group. No need to join again!. Check your app for more details`);
        }

        const tx = await publicClient.simulateContract({
            address: tokenAddress,
            abi: tokenAbi,
            functionName: 'transfer',
            args: [address, parseEther('100000')],
            account
        })

        const txhash = await walletClient.writeContract(tx.request);
        console.log(`Transaction hash:`, txhash);

        setTimeout(async () => {
            const { request } = await publicClient.simulateContract({
                address: contractAddress,
                abi: abi,
                functionName: 'joinGroup',
                args: [chatId, address]
            });

            const hash = await walletClient.writeContract(request);
            console.log(`Transaction hash:`, hash);

            // Wait for the transaction to be mined
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            console.log(`Transaction receipt:`, receipt);

            return sendMessage(messageObj?.chat.id, `Welcome ${name}! You've successfully joined "${groupName}". Check your app for more details. Transaction hash: ${hash}`);
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

        return sendMessage(messageObj?.chat.id, errorMessage);
    }
}
function handleNewMember(messageObj) {
    const newMembers = messageObj?.new_chat_members;
    const chatId = messageObj?.chat.id;
    const chatTitle = messageObj?.chat.title || "this group";

    newMembers.forEach(member => {
        const welcomeMessage = `
<b>Welcome to ${chatTitle}, ${member.first_name}!</b> 🎉

We're excited to have you join our SavvyCircle community. Here's how you can get started:

1. Type /help for help
2. Use /create to create a groip
3. Use /join to become a part of an existing group

If you need any help, just ask! Happy saving! 💰
        `;

        sendMessage(chatId, welcomeMessage);
    });
}


// const unwatch = publicClient.watchContractEvent({
//     address: contractAddress,
//     abi: abi,
//     eventName: 'SavingsDeposited',
//     onLogs: logs => console.log(logs)
// })

// console.log(unwatch);

// memberJoinedEvents();

export { handleMessage };
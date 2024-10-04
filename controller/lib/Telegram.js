import { axiosInstance } from "./axios.js";
import { Web3 } from 'web3';
import { abi, contractAddress } from "../../contractAbi.js";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import getUser from "./getUser.js";
import { tokenAbi } from "../../token.js";
import { Markup, Telegraf } from "telegraf";
import { publicClient, walletClient } from "../../publicClient.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: `${__dirname}/.env` });


// const rpcUrl = "https://scroll-sepolia.g.alchemy.com/v2/3ui4skpB5vLfZtLX8pF7vyP3Vx7kHJ5t";
const rpcUrl = "https://sepolia-rpc.scroll.io";
const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl, { timeout: 400000000 }));
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
const contract = new web3.eth.Contract(abi, contractAddress);
const tokenAddress = "0x8de23bbe29028d6e646950db8d99ee92c821b5bb"
const token = new web3.eth.Contract(tokenAbi,)
web3.eth.accounts.wallet.add(account);
const TOKEN = process.env.TOKEN;
const bot = new Telegraf(TOKEN);
const web_link = "https://savvy-circle.vercel.app/" // Make sure this is the correct Web App URL




async function sendMessage(chatId, messageText) {
    try {
        console.log(`Attempting to send message to chat ${chatId}: "${messageText}"`);

        if (!messageText || messageText.trim() === '') {
            console.error(`Attempted to send an empty message to chat ${chatId}`);
            return Promise.reject(new Error('Message text cannot be empty'));
        }

        return axiosInstance.get("sendMessage", {
            chat_id: chatId,
            text: messageText,
            parse_mode: 'HTML'
        }).then(response => {
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

        const nonce = await web3.eth.getTransactionCount(account.address);

        const data = await publicClient.readContract({
            address: contractAddress,
            abi: abi,
            functionName: 'getUserGroups',
            args: [address]
        });

        console.log(`Data is given as`, data);

        if (data.includes(BigInt(chatId))) {
            console.log(data.includes(BigInt(chatId)));
            return sendMessage(messageObj?.chat.id, `${name}, you're already a member of this group. No need to join again!. Check your app for more details`);
        }

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


function memberJoinedEvents() {
    // First, check if the contract and the event exist
    if (contract && contract.events && contract.events.MemberJoined) {
        try {
            const eventSubscription = contract.events.MemberJoined({
                fromBlock: 'latest'
            })
                .on('data', function (event) {
                    console.log('Event received:', event);
                    console.log('Event data:', event.returnValues);
                })
                .on('changed', function (event) {
                    // Remove event from local database
                    console.log('Event changed:', event);
                })
                .on('error', function (error) {
                    console.error('Subscription error:', error);
                });

            console.log('Subscription successful');
        } catch (error) {
            console.error('Error setting up event listener:', error);
        }
    } else {
        console.error('Contract or MemberJoined event not found');
    }
}

// memberJoinedEvents();

export { handleMessage };
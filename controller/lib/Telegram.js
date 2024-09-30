import { axiosInstance } from "./axios.js";
import { Web3 } from 'web3';
import { abi, contractAddress } from "../../contractAbi.js";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import getUser from "./getUser.js";
import { tokenAbi } from "../../token.js";
import { Markup, Telegraf } from "telegraf";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: `${__dirname}/.env` });

const rpcUrl = "https://sepolia-rpc.scroll.io";
const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl, { timeout: 40000000 }));
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
const contract = new web3.eth.Contract(abi, contractAddress);
const tokenAddress = "0x8de23bbe29028d6e646950db8d99ee92c821b5bb"
const token = new web3.eth.Contract(tokenAbi,)
web3.eth.accounts.wallet.add(account);
const TOKEN = process.env.TOKEN;
const bot = new Telegraf(TOKEN);
const web_link = "https://savvy-circle.vercel.app/" // Make sure this is the correct Web App URL


function sendMessage(chatId, messageText) {
    if (!messageText || messageText.trim() === '') {
        console.error('Attempted to send an empty message');
        return Promise.reject(new Error('Message text cannot be empty'));
    }

    return axiosInstance.get("sendMessage", {
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML'
    }).catch(error => {
        console.error('Error sending message:', error.response?.data || error.message);
        throw error;
    });
}


function handleMessage(messageObj) {
    // Check if this is a new member join event
    if (messageObj?.new_chat_members && messageObj?.new_chat_members.length > 0) {
        return handleNewMember(messageObj);
    }

    const messageText = messageObj?.text || "";
    const name = messageObj?.from.first_name;
    console.log(name);

    if (messageText.charAt(0) === "/") {
        const command = messageText.substr(1);
        switch (command) {
            case "start":
                return handleLaunchCommand(messageObj)
            case "create":
                return handleCreateGroup(messageObj);
            case "join":
                return handleJoinGroup(messageObj)
            default:
                return sendMessage(messageObj?.chat.id, "I'm sorry, I didn't understand your command. Please try again");
        }
    } else {
        return sendMessage(messageObj?.chat.id, messageText);
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

        const user = await getUser(name);
        const address = user.address;
        const nonce = await web3.eth.getTransactionCount(account.address);
        const gasEstimate = await contract.methods.createGroup(groupName, userAddress, chatId).estimateGas({ from: account.address });

        const receipt = await contract.methods.createGroup(groupName, address, chatId).send({
            from: account.address,
            gas: '7000000', // Increase gas estimate by 20%
            nonce: nonce
        });

        console.log(`Transaction receipt:`, receipt);
        return sendMessage(messageObj?.chat.id, `Group "${groupName}" created successfully! Transaction hash: ${receipt.transactionHash}`);
    } catch (error) {
        console.error('Error creating group:', error);

        let errorMessage = "An error occurred while creating the group. Please try again.";

        if (error.message.includes("gas")) {
            errorMessage = "Transaction failed due to insufficient gas. Please try again with a higher gas limit.";
        } else if (error.message.includes("revert")) {
            errorMessage = "Transaction reverted. Please check contract conditions and parameters.";
        }

        return sendMessage(messageObj?.chat.id, errorMessage);
    }
}

async function handleJoinGroup(messageObj) {
    const groupName = messageObj?.chat.title;
    const chatId = messageObj?.chat.id;
    const name = messageObj?.from.username;
    console.log(`This is name ${name}`);


    // const userAddress = messageObj?.from.id.toString();
    try {
        // const nonce = await web3.eth.getTransactionCount(account.address);
        const user = await getUser(name);
        const address = user.address;
        console.log(`Address is given as `, address);

        const nonce = await web3.eth.getTransactionCount(account.address);


        const receipt = await contract.methods.joinGroup(chatId, address).send({
            from: account.address,
            gas: '7000000',
            nonce: nonce // Explicitly set the nonce in the transaction
        });

        console.log(`Transaction receipt:`, receipt);
        return sendMessage(messageObj?.chat.id, `You Join "${groupName}", check you app for more info! Transaction hash: ${receipt.transactionHash} `)
    } catch (error) {
        console.error('Error creating group:', error);
        return sendMessage(messageObj?.chat.id, "An error occurred while creating the group. Please try again.");
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

1. Type /start to begin your journey
2. Use /lauch to launch the app
3. Use /join to become a part of an existing group

If you need any help, just ask! Happy saving! 💰
        `;

        sendMessage(chatId, welcomeMessage);
    });
}

export { handleMessage };
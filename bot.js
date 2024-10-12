import { Telegraf, Markup } from 'telegraf';
import { getUser, getUserByAddress } from './controller/lib/getUser.js';
// import { publicClient, walletClient, account } from "../../publicClient.js";
import { formatEther, parseEther } from "viem";
import { publicClient, walletClient, account } from './publicClient.js';
import { abi, contractAddress } from './contractAbi.js';
import { tokenAbi, tokenAddress } from './token.js';
// import express, { json } from "express";

// Replace 'YOUR_BOT_TOKEN' with your actual bot token
const bot = new Telegraf(process.env.TOKEN);

const PORT = process.env.PORT || 8000;



// bot commands
bot.command('savvy', handleSavvyCommand);
bot.command('create', handleCreateGroup);
bot.command('join', handleJoinGroup);
bot.command('my-savings', handleMyGroupSavings);
bot.command('group-savings', handleGroupSavings);

bot.on('new_chat_members', async (ctx) => {
    const newMembers = ctx.message.new_chat_members;
    const botUser = await ctx.telegram.getMe();

    if (newMembers.some(member => member.id === botUser.id)) {
        const welcomeMessage = `
  Hello everyone! 👋 I'm SavvyCircle Bot, here to help you manage your group savings and loans.
  
  Here are some commands to get you started:
  /savvy - Open SavvyCircle app
  /create - Create a new savings group
  /join - Join an existing group
  /help - Show available commands and info
  
  Let's get savvy with our finances together! 💰
      `;

        ctx.reply(welcomeMessage, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyCircleBot/SavvyCircle')]
            ])
        });
    }
});


// Event listeners
const unwatchSavingsDeposited = publicClient.watchContractEvent({
    address: contractAddress,
    abi: abi,
    eventName: 'SavingsDeposited',
    pollingInterval: 3_500,
    onLogs: logs => {
        console.log(logs)
        handleSavingsDepositedEvent(logs)
    }
});

const unwatchLoanRepayment = publicClient.watchContractEvent({
    address: contractAddress,
    abi: abi,
    eventName: 'LoanRepayment',
    pollingInterval: 3_500,
    onLogs: logs => {
        console.log(logs)
        handleLoanRepaymentEvent(logs)
    }
});

const unwatchLoanDistributed = publicClient.watchContractEvent({
    address: contractAddress,
    abi: abi,
    eventName: 'LoanDistributed',
    pollingInterval: 3_500,
    onLogs: logs => {
        console.log(logs)
        handleLoanDistributedEvent(logs)
    }
});

// Event handlers
async function handleSavingsDepositedEvent(logs) {
    try {
        for (const log of logs) {
            const { groupId, member, amount } = log.args;
            const transactionHash = log.transactionHash;
            const chatId = Number(groupId);
            const formattedAmount = formatEther(amount);
            const user = await getUserByAddress(member);

            const message = `
<b>New Savings Deposit! 💰</b>

Member: <code>${user ? user.username : member}</code>
Amount: <b>${formattedAmount} NGNS</b>

Great job on contributing to your savings goal! 🎉
        `;
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.url('View Transaction', `https://sepolia.basescan.org/tx/${transactionHash}`)],
                [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyCircleBot/SavvyCircle')]
            ]);

            await bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML', ...keyboard });
        }
    } catch (error) {
        console.log(error);

    }
}

async function handleLoanRepaymentEvent(logs) {
    try {
        for (const log of logs) {
            const { groupId, borrower, amount } = log.args;
            const transactionHash = log.transactionHash;
            const chatId = Number(groupId);
            const formattedAmount = formatEther(String(amount));
            const user = await getUserByAddress(borrower);
            console.log(user)

            const message = `
<b>💰💰 New Loan Repayment! 💰💰</b>

Member: <code>${user ? user.username : borrower}</code>
Amount: <b>${formattedAmount} NGNS</b>

Great job on repaying back your loan! 🎉
        `;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.url('View Transaction', `https://sepolia.basescan.org/tx/${transactionHash}`)],
                [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyCircleBot/SavvyCircle')]
            ]);

            await bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML', ...keyboard });
        }
    } catch (error) {
        console.log(error);

    }
}

async function handleLoanDistributedEvent(logs) {
    try {
        for (const log of logs) {
            const { groupId, borrower, amount, isFirstBatch } = log.args;
            const transactionHash = log.transactionHash;
            const chatId = Number(groupId);
            const formattedAmount = formatEther(String(amount));
            const user = await getUserByAddress(borrower);
            console.log(user);
            const message = `
    <b>💰💰 New Loan Distributed! 💰💰</b>
    
    Member: <code>${user ? user.username : borrower}</code>
    Amount: <b>${formattedAmount} NGNS</b>
    
    Loans given to ${user ? user.username : borrower}! 🎉
            `;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.url('View Transaction', `https://sepolia.basescan.org/tx/${transactionHash}`)],
                [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyCircleBot/SavvyCircle')]
            ]);

            await bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML', ...keyboard });
        }
    } catch (error) {
        console.log(error);

    }
}


function handleSavvyCommand(ctx) {
    return ctx.reply('Ready to get savvy with your finances? Click below to open SavvyCircle:',
        Markup.inlineKeyboard([
            [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyCircleBot/SavvyCircle')]
        ])
    );
}

async function handleGroupSavings(ctx) {
    const groupName = ctx.chat.title;
    const chatId = ctx.chat.id;
    const name = ctx.from.username;

    try {
        const user = await getUser(name);
        const address = user.address;

        // Get group total savings
        const data = await publicClient.readContract({
            address: contractAddress,
            abi: abi,
            functionName: 'getGroupTotalSavings',
            args: [Number(chatId)]
        });

        const totalSavings = formatEther(data);

        // Get group member count
        // const memberCount = await publicClient.readContract({
        //     address: contractAddress,
        //     abi: abi,
        //     functionName: 'getGroupMemberCount',
        //     args: [Number(chatId)]
        // });

        const message = `
<b>📊 Group Savings Summary for ${groupName} 📊</b>

Total Group Savings: <b>${totalSavings} NGNS</b>
Number of Members: <b>${2}</b>

Keep growing together! 🌱💰
        `;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.url('View Details in SavvyCircle', 'https://t.me/SavvyCircleBot/SavvyCircle')]
        ]);

        await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });

    } catch (error) {
        console.error('Error fetching group savings:', error);

        let errorMessage = "Oops! We encountered an issue while fetching the group savings information. ";

        if (error.message.includes("group not found")) {
            errorMessage += "It seems this group is not registered in our system. Use the /create command to set up a new savings group.";
        } else if (error.message.includes("not a member")) {
            errorMessage += "You don't appear to be a member of this savings group. Use the /join command to become a member.";
        } else {
            errorMessage += "Please try again later or contact support if the issue persists.";
        }

        await ctx.reply(errorMessage);
    }
}

async function handleCreateGroup(ctx) {
    const groupName = ctx.chat.title;
    const chatId = ctx.chat.id;
    const name = ctx.from.username;


    const userAddress = process.env.INITIAL_OWNER;

    try {
        // const address = account?.address;
        const user = await getUser(name);
        const address = user.address;

        const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: abi,
            functionName: 'createGroup',
            args: [groupName, address, Number(chatId)]
        });

        const hash = await walletClient.writeContract(request);
        console.log(`Transaction receipt:`, hash);
        if (hash) {
            return ctx.reply(`Group "${groupName}" created successfully!. Open the app to set monthly contribution`, Markup.inlineKeyboard([
                [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyCircleBot/SavvyCircle')]
            ]));
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

async function handleMyGroupSavings(ctx) {
    const groupName = ctx.chat.title;
    const chatId = ctx.chat.id;
    const name = ctx.from.username;

    try {
        const user = await getUser(name);
        const address = user.address;

        const data = await publicClient.readContract({
            address: contractAddress,
            abi: abi,
            functionName: 'getMemberSavings',
            args: [Number(chatId), address]
        });

        const totalSavings = formatEther(data);

        const message = `
<b>💰 Your Savings in ${groupName} 💰</b>

Member: <code>${name}</code>
Total Savings: <b>${totalSavings} NGNS</b>

Keep up the great work! 🎉
        `;

        const keyboard = Markup.inlineKeyboard([
            [Markup.button.url('View Details in SavvyCircle', 'https://t.me/SavvyCircleBot/SavvyCircle')]
        ]);

        await ctx.reply(message, { parse_mode: 'HTML', ...keyboard });

    } catch (error) {
        console.error('Error fetching savings:', error);

        let errorMessage = "Oops! We encountered an issue while fetching your savings information. ";

        if (error.message.includes("user not found")) {
            errorMessage += "It seems you're not registered in our system. Please use the /join command to join the group first.";
        } else if (error.message.includes("not a member")) {
            errorMessage += "You don't appear to be a member of this savings group. Use the /join command to become a member.";
        } else {
            errorMessage += "Please try again later or contact support if the issue persists.";
        }

        await ctx.reply(errorMessage);
    }
}

async function handleJoinGroup(ctx) {
    const groupName = ctx.chat.title;
    const chatId = ctx.chat.id;
    const name = ctx.from.username;
    console.log(ctx.chat.id);


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
            return ctx.reply(`${name}, you're already a member of this group. No need to join again! Check your app for more details`, Markup.inlineKeyboard([
                [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyCircleBot/SavvyCircle')]
            ]));
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

            return ctx.reply(`Welcome ${name}! You've successfully joined "${groupName}"`, Markup.inlineKeyboard([
                [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyCircleBot/SavvyCircle')]
            ]))
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

bot.action(/opt\d+/, async (ctx) => {
    const option = ctx.match[0];
    await ctx.answerCbQuery();
    await ctx.reply(`You selected ${option}`);
});

bot.action('close', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
});
bot.launch({
    webhook: {
        // Public domain for webhook; e.g.: example.com
        domain: process.env.WEBHOOK_DOMAIN,

        // Port to listen on; e.g.: 8080
        port: PORT,

        // Optional path to listen for.
        // `bot.secretPathComponent()` will be used by default
    },
});


// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
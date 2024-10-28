import { Telegraf, Markup } from 'telegraf';
import { getUser, getUserByAddress } from './controller/lib/getUser.js';
// import { publicClient, walletClient, account } from "../../publicClient.js";
import { formatEther, parseEther } from "viem";
import { publicClient, walletClient, account } from './publicClient.js';
import { abi, contractAddress } from './contractAbi.js';
import { tokenAbi, tokenAddress, usdtAddress } from './token.js';
// import express, { json } from "express";

// Replace 'YOUR_BOT_TOKEN' with your actual bot token
const bot = new Telegraf(process.env.TOKEN);

const PORT = process.env.PORT || 8000;



// bot commands
bot.command('savvy', handleSavvyCommand);
bot.command('create', handleCreateGroup);
bot.command('join', handleJoinGroup);
bot.command('mySavings', handleMyGroupSavings);
bot.command('groupSavings', handleGroupSavings);
bot.command('savingToken', handleSavingToken);

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
  /mySavings - Show user total savings.
  /groupSavings - Show group savings
  
  Let's get savvy with our finances together! 💰
      `;

        ctx.reply(welcomeMessage, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')]
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
                [Markup.button.url('View Transaction', `https://sepolia-blockscout.lisk.com/tx/${transactionHash}`), Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')],

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
                [Markup.button.url('View Transaction', `https://sepolia-blockscout.lisk.com/tx/${transactionHash}`), Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')],

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
                [Markup.button.url('View Transaction', `https://sepolia-blockscout.lisk.com/tx/${transactionHash}`), Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')],

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
            [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')]
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
        console.log(`Total savings is`, totalSavings);

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
            [Markup.button.url('View Details in SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')]
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
        setTimeout(async () => {
            if (hash) {
                const tx = await publicClient.simulateContract({
                    address: tokenAddress,
                    abi: tokenAbi,
                    functionName: 'transfer',
                    args: [address, parseEther('20000')],
                    account
                });

                const hash2 = await walletClient.writeContract(tx.request);
                console.log(hash2);

                return ctx.reply(`Group "${groupName}" created successfully!. Open the app to set monthly contribution`, Markup.inlineKeyboard([
                    [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk'), Markup.button.url('View Transaction', `https://sepolia-blockscout.lisk.com/tx/${hash}`)]
                ]));
            }
        }, 3000);

    } catch (error) {
        console.error('Error creating group:', error);

        let errorMessage = "An error occurred while creating the group. Please try again.";

        if (error.message.includes("gas")) {
            errorMessage = "Transaction failed due to insufficient gas. Please try again with a higher gas limit.";
        } else if (error.message.includes("revert")) {
            if (error.shortMessage && error.shortMessage.includes("Already in group")) {
                errorMessage = "This group has already been created. You can proceed to join it.";
            } else {
                errorMessage = "Transaction reverted. Please check contract conditions and parameters.";
            }
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
            functionName: 'getMemeberSavings',
            args: [Number(chatId), address]
        });

        const totalSavings = formatEther(data);
        console.log(`Total savings is`, totalSavings);

        const message = `
<b>💰 Your Savings in ${groupName} 💰</b>

Member: <code>${name}</code>
Total Savings: <b>${totalSavings} NGNS</b>

Keep up the great work! 🎉
        `;
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')],

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


async function handleSavingToken(ctx) {
    const groupName = ctx.chat.title;
    const chatId = ctx.chat.id;
    const name = ctx.from.username;

    try {

        const user = await getUser(name);
        const address = user.address;

        const message = `
💰 Select an option for ${groupName} saving token 💰
        `;

        // Changed to callback_data buttons instead of text buttons
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('Naira (NGNS)', 'select_ngns')],
            [Markup.button.callback('US Dollar (USDT)', 'select_usdt')]
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

// Add these handlers in your bot setup
bot.action('select_ngns', async (ctx) => {
    // Handle NGNS selection
    const groupName = ctx.chat.title;
    const chatId = ctx.chat.id;
    const name = ctx.from.username;

    await ctx.answerCbQuery();
    console.log("You picked NGNS");

    try {
        const user = await getUser(name);
        const address = user.address;

        const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: abi,
            functionName: 'setGroupContributionToken',
            args: [Number(chatId), tokenAddress]
        });

        const hash2 = await walletClient.writeContract(request);
        console.log(hash2);



        const message = `
                <b>Group "${name}" savings token set successfully!. Open the app to start depositing</b>
                <b>💵 Enter the amount you want to save in NGNS:
        Format: /save <amount>
        
        Example: /save 100</b>
                
                        `;


        const keyboard = Markup.inlineKeyboard([
            [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')],
            [Markup.button.url('View Transaction', `https://sepolia-blockscout.lisk.com/tx/${hash2}`)]
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
});

bot.action('select_usdt', async (ctx) => {
    // Handle USDT selection
    await ctx.answerCbQuery();
    console.log("You picked USDT");
    const groupName = ctx.chat.title;
    const chatId = ctx.chat.id;
    const name = ctx.from.username;

    await ctx.answerCbQuery();

    try {
        const user = await getUser(name);
        const address = user.address;

        const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: abi,
            functionName: 'setGroupContributionToken',
            args: [Number(chatId), usdtAddress]
        });

        const hash2 = await walletClient.writeContract(request);
        console.log(hash2);

        const message = `
        <b>Group "${name}" savings token set successfully!. Open the app to start depositing</b>
        <b>💵 Enter the amount you want to save in USDT:
Format: /save <amount>

Example: /save 100</b>
        
                `;


        const keyboard = Markup.inlineKeyboard([
            [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')],
            [Markup.button.url('View Transaction', `https://sepolia-blockscout.lisk.com/tx/${hash2}`)]
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
});

bot.command('save', async (ctx) => {
    try {
        // Get the text after the command
        const text = ctx.message.text;
        // Split the text to get the amount
        const [command, amount] = text.split(' ');

        // Validate the amount
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            return ctx.reply('Please enter a valid amount.\nExample: /save 100');
        }

        const userId = ctx.from.id;
        const username = ctx.from.username;
        const chatId = ctx.chat.id;

        // You can now use this amount for your saving logic
        console.log(`User ${username} wants to save ${amount} USDT`);

        // Example confirmation message with approve/reject buttons
        const message = `
💰 Saving Confirmation

Amount: ${amount} USDT
User: @${username}

Please confirm your transaction.
`;

        const keyboard = Markup.inlineKeyboard([
            [
                Markup.button.callback('✅ Approve', `approve_save_${amount}`),
                Markup.button.callback('❌ Cancel', 'cancel_save')
            ]
        ]);

        await ctx.reply(message, {
            parse_mode: 'HTML',
            ...keyboard
        });

    } catch (error) {
        console.error('Error processing save command:', error);
        await ctx.reply('An error occurred while processing your request. Please try again.');
    }
});

// Handle the approval
bot.action(/^approve_save_(.+)$/, async (ctx) => {
    try {
        await ctx.answerCbQuery();

        const amount = ctx.match[1]; // Get the amount from the callback data
        const username = ctx.from.username;
        const chatId = ctx.chat.id;

        // Here you can implement your saving logic
        // For example, calling your contract or API

        const message = `
✅ Saving Request Initiated

Amount: ${amount} USDT
Status: Processing

Please complete the transaction in your wallet.
`;

        await ctx.editMessageText(message, { parse_mode: 'HTML' });

    } catch (error) {
        console.error('Error processing approval:', error);
        await ctx.reply('An error occurred while processing your approval. Please try again.');
    }
});

// Handle cancellation
bot.action('cancel_save', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        await ctx.editMessageText('❌ Saving request cancelled.', { parse_mode: 'HTML' });
    } catch (error) {
        console.error('Error cancelling save:', error);
        await ctx.reply('An error occurred while cancelling.');
    }
});

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
                [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')]
            ]));
        }

        const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: abi,
            functionName: 'joinGroup',
            args: [chatId, address]
        });

        const hash = await walletClient.writeContract(request);


        // const receipt = await publicClient.waitForTransactionReceipt({ hash });
        // console.log(receipt);


        setTimeout(async () => {
            const tx = await publicClient.simulateContract({
                address: tokenAddress,
                abi: tokenAbi,
                functionName: 'transfer',
                args: [address, parseEther('20000')],
                account
            });

            const txhash = await walletClient.writeContract(tx.request);

            return ctx.reply(`Welcome ${name}! You've successfully joined "${groupName}"`, Markup.inlineKeyboard([
                [Markup.button.url('Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk'), Markup.button.url('View Transaction', `https://sepolia-blockscout.lisk.com/tx/${hash}`)]
            ]))
        }, 2000);

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
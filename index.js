import { Telegraf, Markup, session } from 'telegraf';
import { getUser, getUserByAddress } from './controller/lib/getUser.js';
// import { publicClient, walletClient, account } from "../../publicClient.js";
import { formatEther, parseEther } from "viem";
import { publicClient, walletClient, account } from './publicClient.js';
import { abi, contractAddress } from './contractAbi.js';
import { tokenAbi, tokenAddress, usdtAddress } from './token.js';
// import express, { json } from "express";

// Replace 'YOUR_BOT_TOKEN' with your actual bot token
const bot = new Telegraf(process.env.TOKEN);
bot.use(session());

const PORT = process.env.PORT || 8000;



// bot commands
bot.command('savvy', handleSavvyCommand);
bot.command('create', handleCreateGroup);
bot.command('join', handleJoinGroup);
bot.command('mysavings', handleMyGroupSavings);
bot.command('groupsavings', handleGroupSavings);
bot.command('token', handleSavingToken);
bot.command('disburse', handleDisburse);


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
  /mysavings - Show user total savings.
  /groupsavings - Show group savings
  /token - Set group saving token
  /amount - Set group saving amount
  /disburse - Disburse loan for eligible members.
  
  Let's get savvy with our finances together! 💰
      `;

        ctx.reply(welcomeMessage, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.url('🏦 Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')]
            ])
        });
    }
});

bot.command('help', async (ctx) => {
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
  /mysavings - Show user total savings.
  /groupsavings - Show group savings
  /token - Set group saving token
  /amount - Set group saving amount
  /disburse - Disburse loan for eligible members.
  
  Let's get savvy with our finances together! 💰
      `;

        ctx.reply(welcomeMessage, {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.url('🏦 Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')]
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


            const data = await publicClient.readContract({
                address: contractAddress,
                abi: abi,
                functionName: 'groups',
                args: [Number(chatId)]
            });

            console.log('Group Data is given as', data);
            let sym = 'NGNS';
            if (data[15] == TOKENS.NGNS.address) {
                sym = TOKENS.NGNS.symbol
            } else if (data[15] == TOKENS.USDT.address) {
                sym = TOKENS.USDT.symbol
            }

            const message = `
<b>New Savings Deposit! 💰</b>

Member: <code>${user ? user.username : member}</code>
Amount: <b>${formattedAmount} ${sym}</b>

Great job on contributing to your savings goal! 🎉
        `;
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.url('🔍 View Transaction', `https://sepolia-blockscout.lisk.com/tx/${transactionHash}`), Markup.button.url('🏦 Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')],

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

            const data = await publicClient.readContract({
                address: contractAddress,
                abi: abi,
                functionName: 'groups',
                args: [Number(chatId)]
            });

            console.log('Group Data is given as', data);
            let sym = 'NGNS';
            if (data[15] == TOKENS.NGNS.address) {
                sym = TOKENS.NGNS.symbol
            } else if (data[15] == TOKENS.USDT.address) {
                sym = TOKENS.USDT.symbol
            }

            const message = `
<b>💰💰 New Loan Repayment! 💰💰</b>

Member: <code>${user ? user.username : borrower}</code>
Amount: <b>${formattedAmount} ${sym}</b>

Great job on repaying back your loan! 🎉
        `;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.url('🔍 View Transaction', `https://sepolia-blockscout.lisk.com/tx/${transactionHash}`), Markup.button.url('🏦 Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')],

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
            const data = await publicClient.readContract({
                address: contractAddress,
                abi: abi,
                functionName: 'groups',
                args: [Number(chatId)]
            });

            console.log('Group Data is given as', data);
            let sym = 'NGNS';
            if (data[15] == TOKENS.NGNS.address) {
                sym = TOKENS.NGNS.symbol
            } else if (data[15] == TOKENS.USDT.address) {
                sym = TOKENS.USDT.symbol
            }

            const message = `
    <b>💰💰 New Loan Distributed! 💰💰</b>
    
    Member: <code>${user ? user.username : borrower}</code>
    Amount: <b>${formattedAmount} ${sym}</b>
    
    Loans given to ${user ? user.username : borrower}! 🎉
            `;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.url('🔍 View Transaction', `https://sepolia-blockscout.lisk.com/tx/${transactionHash}`), Markup.button.url('🏦 Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')],

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
            [Markup.button.url('🏦 Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')]
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

        const groupData = await publicClient.readContract({
            address: contractAddress,
            abi: abi,
            functionName: 'groups',
            args: [Number(chatId)]
        });

        console.log('Group Data is given as', groupData);
        let sym = 'NGNS';
        if (groupData[15] == TOKENS.NGNS.address) {
            sym = TOKENS.NGNS.symbol
        } else if (groupData[15] == TOKENS.USDT.address) {
            sym = TOKENS.USDT.symbol
        }


        const message = `
<b>📊 Group Savings Summary for ${groupName} 📊</b>

Total Group Savings: <b>${totalSavings} ${sym}</b>
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

    try {
        const user = await getUser(name);
        const address = user.address;

        if (!address) {
            throw new Error('User address not found');
        }

        // Get current gas price and add a premium
        const gasPrice = await publicClient.getGasPrice();
        const gasPriceWithPremium = gasPrice * 120n / 100n; // 20% premium

        // Create group transaction with proper gas configuration
        const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: abi,
            functionName: 'createGroup',
            args: [groupName, address, Number(chatId)],
            account: walletClient.account,
            gas: await publicClient.estimateContractGas({
                address: contractAddress,
                abi: abi,
                functionName: 'createGroup',
                args: [groupName, address, Number(chatId)],
                account: walletClient.account
            }),
            maxFeePerGas: gasPriceWithPremium,
            maxPriorityFeePerGas: gasPriceWithPremium / 2n
        });

        const hash = await walletClient.writeContract(request);
        console.log(`Group creation transaction:`, hash);

        // Wait for group creation to be mined
        await publicClient.waitForTransactionReceipt({ hash });

        // Function to handle token transfers with proper gas management
        async function handleTokenTransfer(tokenAddr, amount, recipientAddr) {
            const currentGasPrice = await publicClient.getGasPrice();
            const adjustedGasPrice = currentGasPrice * 120n / 100n; // 20% premium

            const { request } = await publicClient.simulateContract({
                address: tokenAddr,
                abi: tokenAbi,
                functionName: 'transfer',
                args: [recipientAddr, parseEther(amount)],
                account: walletClient.account,
                gas: await publicClient.estimateContractGas({
                    address: tokenAddr,
                    abi: tokenAbi,
                    functionName: 'transfer',
                    args: [recipientAddr, parseEther(amount)],
                    account: walletClient.account
                }),
                maxFeePerGas: adjustedGasPrice,
                maxPriorityFeePerGas: adjustedGasPrice / 2n
            });

            const transferHash = await walletClient.writeContract(request);
            await publicClient.waitForTransactionReceipt({ hash: transferHash });
            return transferHash;
        }

        // Handle token transfers sequentially with proper delays
        const tokenTransfers = [
            { address: tokenAddress, amount: '5000' },
            { address: usdtAddress, amount: '5000' }
        ];

        for (const [index, transfer] of tokenTransfers.entries()) {
            try {
                // Add delay between transactions
                if (index > 0) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }

                const transferHash = await handleTokenTransfer(
                    transfer.address,
                    transfer.amount,
                    address
                );
                console.log(`Token transfer ${index + 1} transaction:`, transferHash);
            } catch (transferError) {
                console.error(`Token transfer ${index + 1} failed:`, transferError);
                // Continue with next transfer even if one fails
            }
        }

        return ctx.reply(
            `Group "${groupName}" created successfully! Open the app to set monthly contribution`,
            Markup.inlineKeyboard([
                [
                    Markup.button.url('🏦 Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk'),
                    Markup.button.url('🔍 View Transaction', `https://sepolia-blockscout.lisk.com/tx/${hash}`)
                ]
            ])
        );

    } catch (error) {
        console.error('Error creating group:', error);

        let errorMessage = "An error occurred while creating the group. Please try again.";

        if (error.message?.includes("replacement transaction underpriced")) {
            errorMessage = "Transaction failed due to network congestion. Please try again in a few moments.";
        } else if (error.message?.includes("gas")) {
            errorMessage = "Transaction failed due to insufficient gas. Please try again with a higher gas limit.";
        } else if (error.message?.includes("revert")) {
            if (error.shortMessage?.includes("Already in group")) {
                errorMessage = "This group has already been created. You can proceed to join it.";
            } else {
                errorMessage = "Transaction reverted. Please check contract conditions and parameters.";
            }
        }

        return ctx.reply(errorMessage);
    }
}

async function handleDisburse(ctx) {
    const groupName = ctx.chat.title;
    const chatId = ctx.chat.id;
    const name = ctx.from.username;

    try {

        // Get current gas price and add a premium
        const gasPrice = await publicClient.getGasPrice();
        const gasPriceWithPremium = gasPrice * 120n / 100n; // 20% premium

        // Create group transaction with proper gas configuration
        const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: abi,
            functionName: 'distributeLoanForGroup',
            args: [Number(chatId)],
            account: walletClient.account,
            gas: await publicClient.estimateContractGas({
                address: contractAddress,
                abi: abi,
                functionName: 'distributeLoanForGroup',
                args: [Number(chatId)],
                account: walletClient.account
            }),
            maxFeePerGas: gasPriceWithPremium,
            maxPriorityFeePerGas: gasPriceWithPremium / 2n
        });

        const hash = await walletClient.writeContract(request);
        console.log(`Group creation transaction:`, hash);

        // Wait for group creation to be mined
        await publicClient.waitForTransactionReceipt({ hash });

    } catch (error) {
        console.error('Error creating group:', error);

        let errorMessage = "An error occurred while creating the group. Please try again.";

        if (error.message?.includes("replacement transaction underpriced")) {
            errorMessage = "Transaction failed due to network congestion. Please try again in a few moments.";
        } else if (error.message?.includes("gas")) {
            errorMessage = "Transaction failed due to insufficient gas. Please try again with a higher gas limit.";
        } else if (error.message?.includes("revert")) {
            if (error.shortMessage?.includes("Already in group")) {
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

        const groupData = await publicClient.readContract({
            address: contractAddress,
            abi: abi,
            functionName: 'groups',
            args: [Number(chatId)]
        });

        console.log('Group Data is given as', groupData);
        let sym = 'NGNS';
        if (groupData[15] == TOKENS.NGNS.address) {
            sym = TOKENS.NGNS.symbol
        } else if (groupData[15] == TOKENS.USDT.address) {
            sym = TOKENS.USDT.symbol
        }

        const message = `
<b>💰 Your Savings in ${groupName} 💰</b>

Member: <code>${name}</code>
Total Savings: <b>${totalSavings} ${sym}</b>

Keep up the great work! 🎉
        `;
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.url('🏦 Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')],

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
// Token configuration
const TOKENS = {
    NGNS: {
        address: tokenAddress,
        symbol: 'NGNS'
    },
    USDT: {
        address: usdtAddress,
        symbol: 'USDT'
    }
};

// Helper function to format transaction message
const formatSuccessMessage = (groupName, tokenSymbol) => `
🎉 Success! Group "${groupName}" savings token has been set to ${tokenSymbol}

💰 Ready to start saving? Use the command below:
─────────────────────
📝 Format: /amount <amount>
💡 Example: /amount 100

Your savings will be in ${tokenSymbol}
`;

// Helper function to format error message
const formatErrorMessage = (error) => {
    const baseMessage = "Oops! We encountered an issue while processing your request.";

    if (error.message.includes("user not found")) {
        return `${baseMessage}\n\n❌ It seems you're not registered yet.\n💡 Please use /join to register first.`;
    }
    if (error.message.includes("not a member")) {
        return `${baseMessage}\n\n❌ You're not a member of this group.\n💡 Use /join to become a member.`;
    }
    return `${baseMessage}\n\nPlease try again later or contact support if the issue persists.`;
};

// Helper function to handle token selection
const handleTokenSelection = async (ctx, tokenType) => {
    await ctx.answerCbQuery();
    console.log(`Token selected: ${tokenType}`);

    const groupName = ctx.chat.title;
    const chatId = ctx.chat.id;
    const username = ctx.from.username;

    try {
        const user = await getUser(username);

        // Simulate contract interaction
        const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: abi,
            functionName: 'setGroupContributionToken',
            args: [Number(chatId), TOKENS[tokenType].address]
        });

        // Execute contract transaction
        const txHash = await walletClient.writeContract(request);
        console.log('Transaction hash:', txHash);

        // Update session
        ctx.session = {
            tokenType,
        };

        // Create inline keyboard
        const inlineKeyboard = Markup.inlineKeyboard([
            [
                Markup.button.url('🏦 Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk'),
                Markup.button.url('🔍 View Transaction', `https://sepolia-blockscout.lisk.com/tx/${txHash}`)
            ]
        ]);

        // Send success message
        return ctx.reply(
            formatSuccessMessage(groupName, TOKENS[tokenType].symbol),
            inlineKeyboard
        );

    } catch (error) {
        console.error('Token selection error:', error);
        return ctx.reply(formatErrorMessage(error));
    }
};

// Token selection action handlers
bot.action('select_ngns', (ctx) => handleTokenSelection(ctx, 'NGNS'));
bot.action('select_usdt', (ctx) => handleTokenSelection(ctx, 'USDT'));

bot.command('amount', async (ctx) => {
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
        const { tokenType } = ctx.session || {};

        // You can now use this amount for your saving logic
        console.log(`User ${username} wants to save ${amount} ${tokenType}`);

        // Example confirmation message with approve/reject buttons
        const message = `
💰 Saving Confirmation

Amount: ${amount} ${tokenType}
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

        const user = await getUser(username);
        const address = user.address;

        if (!address) {
            throw new Error('User address not found');
        }

        // Get current gas price and add a premium
        const gasPrice = await publicClient.getGasPrice();
        const gasPriceWithPremium = gasPrice * 120n / 100n; // 20% premium

        // Create group transaction with proper gas configuration
        const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: abi,
            functionName: 'setMonthlyContribution',
            args: [Number(chatId), parseEther(amount)],
            account: walletClient.account,
            gas: await publicClient.estimateContractGas({
                address: contractAddress,
                abi: abi,
                functionName: 'setMonthlyContribution',
                args: [Number(chatId), parseEther(amount)],
                account: walletClient.account
            }),
            maxFeePerGas: gasPriceWithPremium,
            maxPriorityFeePerGas: gasPriceWithPremium / 2n
        });

        const hash = await walletClient.writeContract(request);
        console.log(`Group creation transaction:`, hash);

        // Wait for group creation to be mined
        await publicClient.waitForTransactionReceipt({ hash });

        // Here you can implement your saving logic
        // For example, calling your contract or API
        const { tokenType } = ctx.session || {};

        const message = `
✅ Set Savings Amount Request Initiated

Amount: ${amount} ${tokenType}
Status: Completed

Transaction completed.
`;

        await ctx.editMessageText(message, { parse_mode: 'HTML' });
        ctx.session = {};

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
        ctx.session = {};
    } catch (error) {
        console.error('Error cancelling save:', error);
        await ctx.reply('An error occurred while cancelling.');
    }
});

async function handleJoinGroup(ctx) {
    const groupName = ctx.chat.title;
    const chatId = ctx.chat.id;
    const name = ctx.from.username;
    console.log('Join attempt for chat ID:', chatId);

    try {
        // Get user data and validate
        const user = await getUser(name);
        const address = user.address;

        if (!address) {
            throw new Error('User address not found');
        }

        // Check if user is already in group
        const data = await publicClient.readContract({
            address: contractAddress,
            abi: abi,
            functionName: 'getUserGroups',
            args: [String(address)]
        });

        if (data.includes(BigInt(chatId))) {
            return ctx.reply(
                `${name}, you're already a member of this group. No need to join again! Check your app for more details`,
                Markup.inlineKeyboard([
                    [Markup.button.url('🏦 Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk')]
                ])
            );
        }

        // Get current gas price and add premium
        const gasPrice = await publicClient.getGasPrice();
        const gasPriceWithPremium = gasPrice * 120n / 100n; // 20% premium

        // Join group with proper gas configuration
        const { request } = await publicClient.simulateContract({
            address: contractAddress,
            abi: abi,
            functionName: 'joinGroup',
            args: [chatId, address],
            account: walletClient.account,
            gas: await publicClient.estimateContractGas({
                address: contractAddress,
                abi: abi,
                functionName: 'joinGroup',
                args: [chatId, address],
                account: walletClient.account
            }),
            maxFeePerGas: gasPriceWithPremium,
            maxPriorityFeePerGas: gasPriceWithPremium / 2n
        });

        const hash = await walletClient.writeContract(request);
        console.log('Join group transaction hash:', hash);

        // Wait for join transaction to be mined
        await publicClient.waitForTransactionReceipt({ hash });

        // Helper function for token transfers
        async function handleTokenTransfer(tokenAddr, amount, recipientAddr) {
            const currentGasPrice = await publicClient.getGasPrice();
            const adjustedGasPrice = currentGasPrice * 120n / 100n;

            const { request } = await publicClient.simulateContract({
                address: tokenAddr,
                abi: tokenAbi,
                functionName: 'transfer',
                args: [recipientAddr, parseEther(amount)],
                account: walletClient.account,
                gas: await publicClient.estimateContractGas({
                    address: tokenAddr,
                    abi: tokenAbi,
                    functionName: 'transfer',
                    args: [recipientAddr, parseEther(amount)],
                    account: walletClient.account
                }),
                maxFeePerGas: adjustedGasPrice,
                maxPriorityFeePerGas: adjustedGasPrice / 2n
            });

            const transferHash = await walletClient.writeContract(request);
            await publicClient.waitForTransactionReceipt({ hash: transferHash });
            return transferHash;
        }

        // Handle token transfers sequentially
        const tokenTransfers = [
            { address: tokenAddress, amount: '5000' },
            { address: usdtAddress, amount: '5000' }
        ];

        for (const [index, transfer] of tokenTransfers.entries()) {
            try {
                // Add delay between transactions
                if (index > 0) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }

                const transferHash = await handleTokenTransfer(
                    transfer.address,
                    transfer.amount,
                    address
                );
                console.log(`Token transfer ${index + 1} hash:`, transferHash);
            } catch (transferError) {
                console.error(`Token transfer ${index + 1} failed:`, transferError);
                // Continue with next transfer even if one fails
            }
        }

        return ctx.reply(
            `Welcome ${name}! You've successfully joined "${groupName}"`,
            Markup.inlineKeyboard([
                [
                    Markup.button.url('🏦 Open SavvyCircle', 'https://t.me/SavvyLiskBot/savvyLisk'),
                    Markup.button.url('🔍 View Transaction', `https://sepolia-blockscout.lisk.com/tx/${hash}`)
                ]
            ])
        );

    } catch (error) {
        console.error('Error joining group:', error);

        let errorMessage = `Oops! We encountered an issue while trying to add ${name} to the group. `;

        if (error.message?.includes("replacement transaction underpriced")) {
            errorMessage += "Transaction failed due to network congestion. Please try again in a few moments.";
        } else if (error.message?.includes("gas")) {
            errorMessage += "It seems there might be a network congestion. Please try again in a few minutes.";
        } else if (error.message?.includes("revert")) {
            errorMessage += "The operation couldn't be completed due to contract restrictions. This could be because the group is full or you don't meet certain criteria to join.";
        } else if (String(error.cause)?.includes("already in group")) {
            errorMessage += "It looks like you're already a member of this group. No need to join again!";
        } else if (error.message?.includes("User address not found")) {
            errorMessage += "We couldn't find your wallet address. Please ensure you've connected your wallet.";
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
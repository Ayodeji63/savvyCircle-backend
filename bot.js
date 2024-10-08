// import { Telegraf, Markup } from 'telegraf'
// import { message } from 'telegraf/filters'

// const createBot = () => {
//     const bot = new Telegraf(process.env.TOKEN)
//     const web_link = "https://savvy-circle.vercel.app/" // Make sure this is the correct Web App URL

//     bot.command('start', (ctx) => {
//         return ctx.reply('Welcome! Open our Web App:', Markup.keyboard([
//             [Markup.button.webApp('Open Web App', web_link)]
//         ]).resize());
//     });

//     return bot;
// }

// export default createBot;

import { Telegraf, Markup } from 'telegraf';

// Replace 'YOUR_BOT_TOKEN' with your actual bot token
const bot = new Telegraf(process.env.TOKEN);



bot.command('start', (ctx) => {
    return ctx.reply('Welcome! Choose an option:', Markup.inlineKeyboard([
        [
            Markup.button.url('Option 1', 'https://example.com/option1'),
            Markup.button.url('Option 2', 'https://example.com/option2')
        ],
        [
            Markup.button.url('Option 3', 'https://example.com/option3'),
            Markup.button.url('Option 4', 'https://example.com/option4')
        ],
        [Markup.button.url('More Info', 'https://example.com/info')]
    ]));
});


bot.action(/opt\d+/, async (ctx) => {
    const option = ctx.match[0];
    await ctx.answerCbQuery();
    await ctx.reply(`You selected ${option}`);
});

bot.action('close', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
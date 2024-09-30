import { Telegraf, Markup } from 'telegraf'
import { message } from 'telegraf/filters'

const createBot = () => {
    const bot = new Telegraf(process.env.TOKEN)
    const web_link = "https://savvy-circle.vercel.app/" // Make sure this is the correct Web App URL

    bot.command('start', (ctx) => {
        return ctx.reply('Welcome! Open our Web App:', Markup.keyboard([
            [Markup.button.webApp('Open Web App', web_link)]
        ]).resize());
    });

    return bot;
}

export default createBot;
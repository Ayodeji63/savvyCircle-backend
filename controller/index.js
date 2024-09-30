import { handleMessage } from "./lib/Telegram.js";

// 
async function handler(req, method) {
    const { body } = req;
    if (body) {
        const messageObj = body.message;
        await handleMessage(messageObj);
    }
    return;
}

export { handler };
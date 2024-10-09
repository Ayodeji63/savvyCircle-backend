// import { handleMessage } from "./lib/Telegram.js";

// 
async function handler(req, method) {
    try {
        const { body } = req;
        if (body) {
            const messageObj = body.message;
            // await handleMessage(messageObj);
        }
        return;
    } catch (e) {
        console.log(e);

    }
}

export { handler };
import express, { json } from "express";
import { handler } from "./controller/index.js";
// import createBot from "./bot.js";

const PORT = process.env.PORT || 8000;

const app = express();
app.use(json());

// Initialize the bot
// const bot = createBot();

app.post("*", async (req, res) => {
    res.send("Hello post");
    console.log(req.body);
    res.send(await handler(req));
})

app.get("*", async (req, res) => {
    res.send(await handler(req));
});

app.listen(PORT, function (err) {
    if (err) console.log(err);
    console.log(`Server is running on port ${PORT}`);

    // Launch the bot
    // bot.launch();
    console.log("Telegram bot is running");
})

// // Enable graceful stop
// process.once('SIGINT', () => {
//     bot.stop('SIGINT');
//     process.exit(0);
// });
// process.once('SIGTERM', () => {
//     bot.stop('SIGTERM');
//     process.exit(0);
// });
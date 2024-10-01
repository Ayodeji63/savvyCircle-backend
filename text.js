import getUser from "./controller/lib/getUser.js";

function cleanCommand(command) {
    // Check if the command is a string and not empty
    if (typeof command !== 'string' || command.trim() === '') {
        throw new Error('Invalid command: must be a non-empty string');
    }

    // Regular expression to match the command format
    const commandRegex = /^\/[a-zA-Z0-9_]+(@\w+)?$/;

    if (!commandRegex.test(command)) {
        throw new Error('Invalid command format');
    }

    // Check if '@SavvyCircleBot' is present
    if (command.includes('@SavvyCircleBot')) {
        // Remove '@SavvyCircleBot' from the command
        return command.split('@')[0];
    } else {
        // If '@SavvyCircleBot' is not present, return the original command
        return command;
    }
}

// Example usage
try {
    console.log(cleanCommand("/start@SavvyCircleBot")); // Output: "/start"
    console.log(cleanCommand("/help")); // Output: "/help"
    console.log(cleanCommand("/settings@AnotherBot")); // Output: "/settings@AnotherBot"
    // console.log(cleanCommand("invalid command")); // This will throw an error
} catch (error) {
    console.error('Error:', error.message);
}

await getUser("AyodejiSa");
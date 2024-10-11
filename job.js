import https from "https";
import cron from "cron";

const url = 'https://backend-savvycircle.onrender.com';
const apiKey = process.env.RENDER_API; // Replace with your actual API key

export const job = new cron.CronJob('*/1 * * * *', function () {
    console.log(`Checking server status`);

    const options = {
        hostname: new URL(url).hostname,
        port: 443,
        // path: '/v1/services', // Update this path if you need a different endpoint
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }
    };

    const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log(`Server status checked successfully`);
                // You might want to parse the JSON response here
                // const services = JSON.parse(data);
                // console.log(services);
            } else {
                console.error(`Failed to check server status. Status code: ${res.statusCode}`);
                console.error(`Response: ${data}`);
            }
        });
    });

    req.on('error', (error) => {
        console.error('Error during status check:', error.message);
    });

    req.end();
});


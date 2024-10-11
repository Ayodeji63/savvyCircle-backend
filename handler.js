import { get } from 'https';

export async function handler() {
    const url = 'https://backend-savvycircle.onrender.com';


    return new Promise((resolve, reject) => {
        const req = get(url, (res) => {
            if (res.statusCode === 200) {
                resolve({
                    statusCode: 200,
                    body: 'Server pinged successfully',
                });
            } else {
                reject(
                    new Error(`Server ping failed with status code: ${res.statusCode}`)
                );
            }
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

handler();
import axios from 'axios';

const MY_TOKEN = "8075994561:AAEO6hYBXaOdOpCX6p8XDqjzFK4cRZXIJtQ"

const BASE_URL = `https://api.telegram.org/bot${MY_TOKEN}`;

// `https://api.telegram.org/bot8075994561:AAEO6hYBXaOdOpCX6p8XDqjzFK4cRZXIJtQ/setWebhook?url=https://6fe2-197-210-54-151.ngrok-free.app`

function getAxiosInstance() {
    return {
        get(method, params) {
            return axios.get(`/${method}`, {
                baseURL: BASE_URL,
                params,
            });
        },
        post(method, data) {
            return axios({
                method: "post",
                baseURL: BASE_URL,
                url: `/${method}`,
                data,
            })
        }
    };
}


export const axiosInstance = getAxiosInstance();
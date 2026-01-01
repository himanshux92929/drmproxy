const express = require('express');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const SECRET_KEY = 'smarterzop'; // The key used for encryption
const ALLOWED_DOMAIN = 'smarterz.netlify.app'; 
const TARGET_API_BASE = 'https://theeduverse.xyz/api/drmplay';

// Middleware to parse JSON
app.use(express.json());

// 1. CORS Configuration (Browser Security)
// This tells browsers to block requests from any site other than yours
app.use(cors({
    origin: `https://${ALLOWED_DOMAIN}`,
    methods: ['GET']
}));

// 2. Custom Middleware for Server-Side Origin Enforcement
// This blocks tools (like Postman) or direct browser access where the Origin/Referer is missing or wrong
const enforceSecurity = (req, res, next) => {
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    // Allow request ONLY if it comes from your Netlify app
    const isAllowed = (origin && origin.includes(ALLOWED_DOMAIN)) || 
                      (referer && referer.includes(ALLOWED_DOMAIN));

    if (!isAllowed) {
        return res.status(403).json({ error: 'Access Denied. Unauthorized Origin.' });
    }
    next();
};

app.get('/', enforceSecurity, async (req, res) => {
    try {
        // Get the url parameter from the request
        const { url } = req.query;

        // Check if URL exists
        if (!url) {
            return res.status(400).json({ error: 'Access Denied. No URL provided.' });
        }

        // 3. Make the Request to the Target API
        // We spoof the headers here so the target thinks the request is coming from their own site
        const targetResponse = await axios.get(`${TARGET_API_BASE}?link=${url}`, {
            headers: {
                'Referer': 'https://theeduverse.xyz/',
                'Origin': 'https://theeduverse.xyz',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // 4. Encrypt the Data
        // We take the JSON response from the target and encrypt it using AES and your key
        const originalData = JSON.stringify(targetResponse.data);
        const encryptedData = CryptoJS.AES.encrypt(originalData, SECRET_KEY).toString();

        // 5. Send the Response
        // The real API data is hidden; user only sees the encrypted string
        res.json({
            data: encryptedData
        });

    } catch (error) {
        console.error('Proxy Error:', error.message);
        res.status(500).json({ error: 'Error fetching or encrypting data.' });
    }
});

app.listen(PORT, () => {
    console.log(`Secure Proxy running on port ${PORT}`);
});

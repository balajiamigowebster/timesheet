const https = require('https');
const querystring = require('querystring');

/**
 * Sends a WhatsApp notification using either Twilio or UltraMsg based on environment variables.
 * @param {string} toPhone The recipient's phone number
 * @param {string} message The message body
 * @returns {Promise<boolean>} Resolves to true if successfully sent, false otherwise.
 */
function sendWhatsAppMessage(toPhone, message) {
  return new Promise((resolve) => {
    // Clean up the phone number (remove spaces, parentheses, dashes, keep leading plus if present)
    let cleanPhone = toPhone.replace(/[\s\-()]/g, '');

    // If phone number is exactly 10 digits, prepend the default country code (defaulting to 91 for India)
    if (cleanPhone.length === 10 && /^\d+$/.test(cleanPhone)) {
      const defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || '91';
      cleanPhone = defaultCountryCode + cleanPhone;
    }

    // 1. Option A: Twilio Gateway
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
      
      // Twilio numbers must be in E.164 format and prefixed with 'whatsapp:'
      // Ensure we have a leading + in the clean number if it doesn't already have one
      let formattedTo = cleanPhone;
      if (!formattedTo.startsWith('+') && !formattedTo.startsWith('whatsapp:')) {
        formattedTo = '+' + formattedTo;
      }
      const to = formattedTo.startsWith('whatsapp:') ? formattedTo : `whatsapp:${formattedTo}`;

      const postData = querystring.stringify({
        To: to,
        From: from,
        Body: message
      });

      const options = {
        hostname: 'api.twilio.com',
        port: 443,
        path: `/2010-04-01/Accounts/${sid}/Messages.json`,
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(sid + ':' + token).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('Twilio WhatsApp notification sent successfully');
            resolve(true);
          } else {
            console.error('Twilio returned error:', res.statusCode, body);
            resolve(false);
          }
        });
      });

      req.on('error', (e) => {
        console.error('Twilio Request error:', e);
        resolve(false);
      });

      req.write(postData);
      req.end();
      return;
    }

    // 2. Option B: UltraMsg Gateway
    if (process.env.ULTRAMSG_INSTANCE_ID && process.env.ULTRAMSG_TOKEN) {
      const instance = process.env.ULTRAMSG_INSTANCE_ID;
      const token = process.env.ULTRAMSG_TOKEN;

      // UltraMsg numbers must be in format: E.164 without '+' symbol (e.g. 919876543210)
      let formattedTo = cleanPhone.replace(/^\+/, '');

      const postData = querystring.stringify({
        token: token,
        to: formattedTo,
        body: message
      });

      const options = {
        hostname: 'api.ultramsg.com',
        port: 443,
        path: `/${instance}/messages/chat`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('UltraMsg WhatsApp notification sent successfully');
            resolve(true);
          } else {
            console.error('UltraMsg returned error:', res.statusCode, body);
            resolve(false);
          }
        });
      });

      req.on('error', (e) => {
        console.error('UltraMsg Request error:', e);
        resolve(false);
      });

      req.write(postData);
      req.end();
      return;
    }

    console.warn('No WhatsApp API credentials configured in .env. Notification skipped.');
    resolve(false);
  });
}

module.exports = { sendWhatsAppMessage };

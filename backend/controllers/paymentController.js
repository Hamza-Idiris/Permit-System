const crypto = require('crypto');

const processWaafiPay = async (req, res) => {
  try {
    const { phone, amount } = req.body;
    
    if (!phone || !amount) {
      return res.status(400).json({ success: false, message: 'Phone and amount are required' });
    }

    const referenceId = crypto.randomBytes(4).toString('hex');
    const invoiceId = crypto.randomInt(1000000, 9999999).toString();
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const waafiPayload = {
      "schemaVersion": "1.0",
      "requestId": "10111331034",
      "timestamp": timestamp,
      "channelName": "WEB",
      "serviceName": "API_PURCHASE",
      "serviceParams": {
        "merchantUid": "M0910291",
        "apiUserId": "1000416",
        "apiKey": "API-675418888AHX",
        "paymentMethod": "mwallet_account",
        "payerInfo": {
          "accountNo": `252${phone}`
        },
        "transactionInfo": {
          "referenceId": referenceId,
          "invoiceId": invoiceId,
          "amount": parseFloat(amount),
          "currency": "USD",
          "description": "Permit Application Fee"
        }
      }
    };

    console.log("Sending WaafiPay request:", JSON.stringify(waafiPayload));

    const response = await fetch('https://api.waafipay.net/asm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(waafiPayload)
    });

    const data = await response.json();
    console.log("WaafiPay Response:", data);

    // WaafiPay usually returns responseCode '2001' or '2000' for success/pending ussd push
    if (data.responseCode === '2001' || data.responseMsg === 'RCS_SUCCESS' || data.errorCode === '0' || data.responseCode === '2000') {
      return res.status(200).json({ success: true, message: 'Payment initiated successfully, check your phone.', data });
    } else {
      return res.status(400).json({ success: false, message: data.responseMsg || 'Payment failed', data });
    }

  } catch (error) {
    console.error('WaafiPay error:', error);
    res.status(500).json({ success: false, message: 'Payment processing error' });
  }
};

module.exports = {
  processWaafiPay
};

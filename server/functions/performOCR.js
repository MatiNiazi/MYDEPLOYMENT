// functions/performOCR.js
const request = require('request');

module.exports = async (imageBuffer) => {
  const options = {
    url: 'https://app.nanonets.com/api/v2/OCR/Model/4fd3b1ba-917f-42ba-bed4-1b64d595c018/LabelFile/',
    formData: {
      file: {
        value: imageBuffer,
        options: {
          filename: 'uploaded_image',
          contentType: 'image/jpeg',
        }
      }
    },
    headers: {
      'Authorization': 'Basic ' + Buffer.from('66e9b087-02af-11ee-8166-1e1a9da52c45' + ':').toString('base64'),
    }
  };

  return new Promise((resolve, reject) => {
    request.post(options, (err, httpResponse, body) => {
      if (err) {
        console.error('OCR Error:', err);
        reject(err);
      } else {
        console.log('OCR Response:', body);
        resolve(JSON.parse(body).result);
      }
    });
  });
};

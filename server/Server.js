const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const request = require('request');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const multer = require('multer');


// Enable CORS
app.use(cors());

// Set up Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Upload image endpoint
app.post('/upload', upload.single('image'), async (req, res) => {
  try {

    
    const imageBuffer = req.file.buffer;

    // Perform OCR on the image
    const ocrResults = await performOCR(imageBuffer);
    console.log('OCR Results:', ocrResults);

    // Extract roll number, exam type, and year from OCR results
    const rollNoItem = ocrResults[0].prediction.find(item => item.label === 'roll_no');
    const rollNo = rollNoItem ? rollNoItem.ocr_text : '';

    const examTypeItem = ocrResults[0].prediction.find(item => item.label === 'examination');
    const examType = examTypeItem ? examTypeItem.ocr_text : '';
    let examSelectorValue = '';
    if (examType.toLowerCase().includes('intermediate')) {
      examSelectorValue = '2'; // Select INTERMEDIATE
    } else if (examType.toLowerCase().includes('secondary')) {
      examSelectorValue = '1'; // Select SECONDARY
    }

    const yearItem = ocrResults[0].prediction.find(item => item.label === 'year');
    const year = yearItem ? yearItem.ocr_text : 'N/A';
    const [yearValue, yearSession] = year.split('-');
    const yearSelectorValue = `${yearValue}-${yearSession === '1' ? '1' : '2'}`;

    console.log('Roll No:', rollNo);
    console.log('Year:', year);
    console.log('Examination:', examType);

    let obtainedMarks = '';
   
    

    // Determine the board name from OCR results and fetch results accordingly
    const boardNameItem = ocrResults[0].prediction.find(item => item.label === 'board_name');
    const boardName = boardNameItem ? boardNameItem.ocr_text.toLowerCase() : '';
    if (boardName === 'sargodha') {
      obtainedMarks = await fetchResultsSargodhaBoard(rollNo, examSelectorValue, yearSelectorValue);
    } else if (boardName === 'lahore') {
      const educationSystemItem = ocrResults[0].prediction.find(item => item.label === 'examination');
      const educationSystem = educationSystemItem ? educationSystemItem.ocr_text : '';

      obtainedMarks = await fetchResultsLahoreBoard(rollNo, educationSystem, yearValue);
    } else if (boardName === 'gujranwala') {
      obtainedMarks = await fetchResultsGujranwalaBoard(rollNo, examType, year);
    }

    console.log('Obtained Marks:', obtainedMarks);

    // Remove the grade part from the obtained marks
    const marksOnly = obtainedMarks.split('/')[0].trim();

    // Get the total marks from OCR results
    const totalMarksItem = ocrResults[0].prediction.find(item => item.label === 'total_marks');
    console.log('Ocr Marks:',totalMarksItem);
    const totalMarks = totalMarksItem ? totalMarksItem.ocr_text : '';
    


    // Prepare marks comparison object
    const marksComparison = {
      obtainedMarks: marksOnly,
      totalMarks: totalMarks,
      marksMatch: marksOnly === totalMarks
    };

    console.log('Marks Comparison:', marksComparison);

    // Return the response with image data and marks information
    res.status(200).json({
      imageData: req.file.buffer.toString('base64'),
      obtainedMarks: marksOnly,
      totalMarks:totalMarks,
      marksComparison: marksComparison,

    });
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Perform OCR on the image using Nanonets API
const performOCR = async (imageBuffer) => {
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

// Fetch results from Sargodha Board website using web scraping
const fetchResultsSargodhaBoard = async (rollNo, examType, year) => {
  const browser = await puppeteer.launch({ headless: false, executablePath: 'C://Program Files//Google//Chrome//Application//chrome.exe',});
  const page = await browser.newPage();
  const url = 'https://www.bisesargodha.edu.pk/content/boardresult.aspx';

  await page.goto(url);
  
  await page.select('select[name="ctl00$ContentPlaceHolder1$DDLExam"]', examType);

  await page.waitForSelector('select[name="ctl00$ContentPlaceHolder1$DDLExamYear"]');
  await page.select('select[name="ctl00$ContentPlaceHolder1$DDLExamYear"]', year);

  await page.waitForSelector('select[name="ctl00$ContentPlaceHolder1$DDLExamSession2"]');
  await page.select('select[name="ctl00$ContentPlaceHolder1$DDLExamSession2"]', '1');

  await page.waitForSelector('input[name="ctl00$ContentPlaceHolder1$TxtSearchText"]');
  await page.type('input[name="ctl00$ContentPlaceHolder1$TxtSearchText"]', rollNo);

  await page.click('input[name="ctl00$ContentPlaceHolder1$BtnShowResults"]');

  await page.waitForFunction(() => !!document.querySelector('#ContentPlaceHolder1_lblGazres'));

  const obtainedMarks = await page.evaluate(() => {
    const obtainedMarksElement = document.querySelector('#ContentPlaceHolder1_lblGazres');
    return obtainedMarksElement ? obtainedMarksElement.textContent.trim() : null;
  });

  await browser.close();

  return obtainedMarks;
};

// Fetch results from Lahore Board website using web scraping
const fetchResultsLahoreBoard = async (rollNo, educationSystem, year) => {
  const browser = await puppeteer.launch({ headless: true,
    executablePath: 'C://Program Files//Google//Chrome//Application//chrome.exe', 
   });
  const page = await browser.newPage();
  const url = 'http://result.biselahore.com/';

  await page.goto(url);

  await page.waitForSelector('#txtFormNo', { visible: true });
  await page.type('#txtFormNo', rollNo);

  if (educationSystem === 'SECONDARY') {
    await page.evaluate(() => {
      document.getElementById('rdlistCourse_0').checked = true;
    });
  } else if (educationSystem === 'INTERMEDIATE') {
    await page.evaluate(() => {
      document.getElementById('rdlistCourse_1').checked = true;
    });
  }

  await page.select('#ddlExamType', '2');
  await page.select('#ddlExamYear', year);

  await page.click('#Button1');

  await page.waitForTimeout(5000);

  const table = await page.$('#GridStudentData');
  const rows = await table.$$('tr');
  const lastRow = rows[rows.length - 1];
  const columns = await lastRow.$$('td');
  const lastColumn = columns[columns.length - 1];
  const obtainedMarks = await lastColumn.evaluate(node => node.textContent.trim());
  const numericMarks = obtainedMarks.match(/\d+/); // Extract numeric value using regex
  return numericMarks ? numericMarks[0] : null;
};

// Fetch results from Gujranwala Board website using web scraping
const fetchResultsGujranwalaBoard = async (rollNo, examType, year) => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C://Program Files//Google//Chrome//Application//chrome.exe',
  });
  const page = await browser.newPage();
  const url = "https://www.bisegrw.edu.pk/prev-years-result.html";

  await page.goto(url, { timeout: 0 });

  await page.select('select[name="year"]', year);

  if (examType === 'SECONDARY') {
    await page.select('select[name="class"]', '10');
  } else if (examType === 'INTERMEDIATE') {
    await page.select('select[name="class"]', '12');
  }

  await page.type('input[name="rno"]', rollNo);

  // Extract captcha text
  const captchaText = await page.evaluate(() => {
    const captchaElement = document.getElementById('captchaImage');
    return captchaElement ? captchaElement.innerText.trim() : null;
  });

  // Input captcha text into the corresponding field
  await page.type('input[name="captcha"]', captchaText);

  // Proceed with form submission
  await Promise.all([
    page.evaluate(() => {
      document.querySelector('input[name="Submit"]').click();
    }),
  ]);

  // Wait for the results table to load
  await page.waitForSelector('table.tx.grid');

  // Extract and return obtained marks
  let html_source = await page.content();
  const $ = cheerio.load(html_source);
  const table = $('table.tx.grid');
  const rows = table.find('tr').toArray().slice(1);

  if (rows.length >= 10) {
    const row_10 = rows[9];
    const cells = $(row_10).find('td').toArray();
    const marks_obtained = $(cells[3]).text().trim();
    return marks_obtained;
  } else {
    console.log("The table does not have at least 10 rows.");
    return null;
  }
};


// Start the server
app.listen(3100, () => {
  console.log('Server is running on port 3100');
});

// functions/fetchResultsGujranwalaBoard.js
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

module.exports = async (rollNo, examType, year) => {
  const browser = await puppeteer.launch({ headless: false, executablePath: 'C://Program Files//Google//Chrome//Application//chrome.exe' });
  const page = await browser.newPage();
  const url = 'https://www.bisegrw.edu.pk/prev-years-result.html';
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

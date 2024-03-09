// functions/fetchResultsSargodhaBoard.js
const puppeteer = require('puppeteer');

module.exports = async (rollNo, examType, year) => {
  const browser = await puppeteer.launch({ headless: false, executablePath: 'C://Program Files//Google//Chrome//Application//chrome.exe' });
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

// functions/fetchResultsLahoreBoard.js
const puppeteer = require('puppeteer');

module.exports = async (rollNo, educationSystem, year) => {
  const browser = await puppeteer.launch({ headless: true, executablePath: 'C://Program Files//Google//Chrome//Application//chrome.exe' });
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

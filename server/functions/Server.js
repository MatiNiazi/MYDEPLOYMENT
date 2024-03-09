// functions/server.js
const cors = require('cors');
const express = require('express');
const app = express();
const { performOCR, fetchResultsSargodhaBoard, fetchResultsLahoreBoard, fetchResultsGujranwalaBoard } = require('./functions');

app.use(cors());

app.post('/upload', async (req, res) => {
  try {
    const imageBuffer = req.file.buffer;

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


    res.status(200).json({
      imageData: req.file.buffer.toString('base64'),
      obtainedMarks: marksOnly,
      totalMarks: totalMarks,
      marksComparison: marksComparison,
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

exports.handler = app;

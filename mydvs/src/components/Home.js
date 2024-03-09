import React, { useState } from 'react';
import '../home.css';

const Home = () => {
  const [imageId, setImageId] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageIdError, setImageIdError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loaderVisible, setLoaderVisible] = useState(false);
  const [resultCardVisible, setResultCardVisible] = useState(false);
  const [resultImageSrc, setResultImageSrc] = useState('');
  const [ocrMarks, setOcrMarks] = useState('');
  const [scraperMarks, setScraperMarks] = useState('');
  const [comparisonMessage, setComparisonMessage] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageFile) {
      setImageIdError(true);
      return;
    }

    setImageIdError(false);
    setErrorMessage('');
    setLoaderVisible(true);

    try {
      // Upload the image file to the server
      const formData = new FormData();
      formData.append('image', imageFile);

      const uploadResponse = await fetch('/.netlify/functions/server/upload', {
        method: 'POST',
        body: formData,
      });
      console.log('upload response:', uploadResponse); 
      const uploadData = await uploadResponse.json();
      console.log('uploaded data:',uploadData);
      const imageData = uploadData.imageData;
      const obtainedMarks = uploadData.obtainedMarks;
      const totalMarks = uploadData.totalMarks;
      const marksComparison = uploadData.marksComparison;

      setResultImageSrc(`data:image/jpeg;base64,${imageData}`);
      setOcrMarks(`OCR Marks: ${totalMarks}`);
      setScraperMarks(`Scraper Marks: ${obtainedMarks}`);
      setComparisonMessage(marksComparison.marksMatch ? 'Result card verified' : 'Result card tampered');
      setResultCardVisible(true);
      setLoaderVisible(false);
    } catch (error) {
      console.error('Error:', error);

      // Display the relevant error message
      alert('An error occurred during image processing.');
      setResultCardVisible(false);
      setLoaderVisible(false);
    }
  };

  return (
    <div className="container">
      <div className="login-form">
        <div className="logo">
          <img src="images/DVS LOGO1.png" alt="DVS Logo" />
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-input">
            <label htmlFor="imageUpload">Upload Image</label>
            <input
              type="file"
              id="imageUpload"
              accept=".jpg, .jpeg, .png"
              onChange={handleImageChange}
              required
            />
            {imageIdError && <div className="error">Please upload an image</div>}
          </div>
          <button type="submit" className="btn-login" disabled={loaderVisible}>
            Retrieve Image
          </button>
        </form>
        <div className="result-card" style={{ display: resultCardVisible ? 'block' : 'none' }}>
          <img id="resultImage" src={resultImageSrc} alt="Image" />
          <div className="marks-container">
            <div className="mark-box" id="ocrMarksBox">
              {ocrMarks}
            </div>
            <div className="mark-box" id="scraperMarksBox">
              {scraperMarks}
            </div>
          </div>
          <div className="comparison-message" id="comparisonMessage">
            {comparisonMessage}
          </div>
        </div>
        <div className="loader" style={{ display: loaderVisible ? 'block' : 'none' }}>
          <div className="spinner"></div>
        </div>
        <div className="error" id="errorMessage" style={{ display: errorMessage ? 'block' : 'none' }}>
          {errorMessage}
        </div>
      </div>
    </div>
  );
};

export default Home;

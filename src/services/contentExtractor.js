const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');

class ContentExtractor {
  /**
   * Extract text content from uploaded file
   * @param {Object} file - Multer file object
   * @returns {Promise<string>} Extracted text content
   */
  async extractFromFile(file) {
    const filePath = file.path;
    const mimeType = file.mimetype;

    try {
      let content = '';

      if (mimeType === 'application/pdf') {
        content = await this.extractFromPDF(filePath);
      } else if (mimeType.startsWith('image/')) {
        content = await this.extractFromImage(filePath);
      } else if (mimeType === 'text/plain') {
        content = await this.extractFromText(filePath);
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      // Clean up the uploaded file after extraction
      this.cleanupFile(filePath);

      return this.cleanContent(content);
    } catch (error) {
      // Clean up file on error too
      this.cleanupFile(filePath);
      throw error;
    }
  }

  /**
   * Extract text from PDF file
   * @param {string} filePath - Path to PDF file
   * @returns {Promise<string>} Extracted text
   */
  async extractFromPDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      console.log(`📄 PDF extracted: ${data.numpages} pages, ${data.text.length} characters`);
      return data.text;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Extract text from image using OCR
   * @param {string} filePath - Path to image file
   * @returns {Promise<string>} Extracted text
   */
  async extractFromImage(filePath) {
    try {
      console.log('🔍 Running OCR on image...');
      const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            process.stdout.write(`\r📊 OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      console.log(`\n🖼️ Image OCR complete: ${text.length} characters extracted`);
      return text;
    } catch (error) {
      console.error('OCR extraction error:', error);
      throw new Error(`Failed to extract text from image: ${error.message}`);
    }
  }

  /**
   * Extract text from plain text file
   * @param {string} filePath - Path to text file
   * @returns {Promise<string>} File content
   */
  async extractFromText(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      console.log(`📝 Text file read: ${content.length} characters`);
      return content;
    } catch (error) {
      console.error('Text file read error:', error);
      throw new Error(`Failed to read text file: ${error.message}`);
    }
  }

  /**
   * Clean and normalize extracted content
   * @param {string} content - Raw extracted content
   * @returns {string} Cleaned content
   */
  cleanContent(content) {
    if (!content) return '';

    return content
      // Replace multiple spaces with single space
      .replace(/[ \t]+/g, ' ')
      // Replace multiple newlines with double newline
      .replace(/\n{3,}/g, '\n\n')
      // Remove leading/trailing whitespace from each line
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Trim overall content
      .trim();
  }

  /**
   * Delete uploaded file after processing
   * @param {string} filePath - Path to file
   */
  cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Cleaned up temporary file`);
      }
    } catch (error) {
      console.error('File cleanup error:', error);
    }
  }
}

module.exports = new ContentExtractor();

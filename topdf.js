const fs = require('fs');
const PDFDocument = require('pdfkit');

const inputFolderPath = './result';
const outputFolderPath = './pdf_results';

if (!fs.existsSync(outputFolderPath)) {
    fs.mkdirSync(outputFolderPath);
}

fs.readdir(inputFolderPath, (err, files) => {
    if (err) {
        console.error('Error reading input folder:', err);
        return;
    }

    files.forEach(file => {
        const filePath = `${inputFolderPath}/${file}`;

        if (file.endsWith('.json')) {
            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading file:', filePath, err);
                    return;
                }

                try {
                    const jsonDataArray = JSON.parse(data);

                    jsonDataArray.forEach(jsonData => {
                        const pdfDoc = new PDFDocument();
                        const outFilePath = `${outputFolderPath}/${file.replace('.json', '')}_result.pdf`;
                        const outputStream = fs.createWriteStream(outFilePath);

                        pdfDoc.pipe(outputStream);

                        // Add content to PDF
                        pdfDoc.fontSize(12).text('题目: ' + jsonData.subjectTitle, { align: 'center' });
                        pdfDoc.fontSize(12).text('Answer Analysis: ' + jsonData.answerAnalysis);

                        jsonData.subjectOptions.forEach(option => {
                            if (option.isRightFlag === 1) {
                                pdfDoc.fontSize(12).text('Correct Answer: ' + option.optionTitle);
                            }
                        });

                        pdfDoc.end();

                        outputStream.on('finish', () => {
                            console.log('PDF file written successfully:', outFilePath);
                        });
                    });
                } catch (parseError) {
                    console.error('Error parsing JSON in file:', filePath, parseError);
                }
            });
        } else {
            console.log(`Skipped non-JSON file: ${file}`);
        }
    });
});

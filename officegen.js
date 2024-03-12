const fs = require('fs');
const officegen = require('officegen');

const inputFolderPath = './result';
const outputFolderPath = './word_results';

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
                        const docx = officegen('docx');
                        const outFilePath = `${outputFolderPath}/${file.replace('.json', '')}_result.docx`;

                        docx.createP({ align: 'center' }).addText(jsonData.subjectTitle || '', { bold: true, underline: true });
                        docx.createP().addText('Answer Analysis: ' + jsonData.answerAnalysis || '');

                        jsonData.subjectOptions.forEach(option => {
                            if (option.isRightFlag === 1) {
                                docx.createP().addText('Correct Answer: ' + option.optionTitle || '');
                            }
                        });

                        const outputStream = fs.createWriteStream(outFilePath);
                        docx.generate(outputStream);
                        outputStream.on('finish', () => {
                            console.log('Word file written successfully:', outFilePath);
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

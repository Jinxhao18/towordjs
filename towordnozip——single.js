const fs = require('fs');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const path = require('path');
const util = require('util');

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

const inputFolderPath = './result';
const outputFolderPath = './word_results';
const templatePath = './template.docx';

if (!fs.existsSync(outputFolderPath)) {
    fs.mkdirSync(outputFolderPath);
}

// 添加一个清理特殊字符的函数
function cleanSpecialCharacters(text) {
    return text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
}

fs.readdir(inputFolderPath, async (err, files) => {
    if (err) {
        console.error('Error reading input folder:', err);
        return;
    }

    for (const file of files) {
        const filePath = path.join(inputFolderPath, file);

        if (file.endsWith('.json')) {
            try {
                const data = await readFileAsync(filePath, 'utf8');
                const jsonDataArray = JSON.parse(data);

                for (let i = 0; i < jsonDataArray.length; i++) {
                    const jsonData = jsonDataArray[i];
                    jsonData.answerAnalysis = cleanSpecialCharacters(jsonData.answerAnalysis);

                    const template = await readFileAsync(templatePath);
                    const zip = new PizZip(template);
                    const doc = new Docxtemplater(zip);

                    doc.setData({ jsonData: [jsonData] });

                    doc.render();

                    const outFilePath = path.join(outputFolderPath, `${file.replace('.json', `_${i + 1}`)}_result.docx`);
                    const outputStream = fs.createWriteStream(outFilePath);

                    const writePromise = new Promise((resolve, reject) => {
                        outputStream.on('finish', resolve);
                        outputStream.on('error', reject);
                    });

                    outputStream.write(doc.getZip().generate({ type: 'nodebuffer' }));
                    outputStream.end();  // Close the stream

                    await writePromise;
                    console.log('Word file written successfully:', outFilePath);
                }

            } catch (parseError) {
                console.error('Error processing file:', filePath, parseError);
            }
        } else {
            console.log(`Skipped non-JSON file: ${file}`);
        }
    }

    console.log('All files processed successfully!');
});

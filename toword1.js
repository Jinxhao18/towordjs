const fs = require('fs');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const path = require('path');
const util = require('util');
const axios = require('axios');

const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);

const inputFolderPath = './result';
const outputFolderPath = './word_results';
const imagesFolder = './word_results';
const templatePath = './template.docx';

if (!fs.existsSync(outputFolderPath)) {
    fs.mkdirSync(outputFolderPath);
}

// 清理特殊字符的函数
function cleanSpecialCharacters(text) {
    return text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
}

// 处理图片的函数
function processImages(jsonData) {
    const fieldsToCheck = ['subjectTitle', 'answerAnalysis'];

    for (const field of fieldsToCheck) {
        const matches = jsonData[field] && jsonData[field].match(/<p><img[^>]+src="([^">]+)"[^>]*><\/p>/g);

        if (matches) {
            for (const match of matches) {
                const imageUrl = match.match(/src="([^"]+)"/)[1];
                // 创建新的字段，并删除原字段中的整个图片块
                const newFieldName = `${field}_img`;
                jsonData[newFieldName] = imageUrl;
                jsonData[field] = jsonData[field].replace(match, ''); // 清除整个图片块
            }
        }
    }

    // 处理 subjectOptions
    if (jsonData.subjectOptions && Array.isArray(jsonData.subjectOptions)) {
        for (const option of jsonData.subjectOptions) {
            const matches = option.optionTitle && option.optionTitle.match(/<p><img[^>]+src="([^">]+)"[^>]*><\/p>/g);

            if (matches) {
                for (const match of matches) {
                    const imageUrl = match.match(/src="([^"]+)"/)[1];
                    // 创建新的字段，并删除原字段中的整个图片块
                    const newFieldName = `optionTitleImg`;
                    option[newFieldName] = imageUrl;
                    option.optionTitle = option.optionTitle.replace(match, ''); // 清除整个图片块
                }
            }
        }
    }
}


// 下载图片到本地
async function downloadImageToLocal(imageUrl) {
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data);

        const fileName = path.basename(imageUrl);
        const localImagePath = path.join(imagesFolder, fileName);

        await fs.promises.writeFile(localImagePath, imageBuffer);

        console.log(`Image downloaded successfully to: ${localImagePath}`);

        return localImagePath;
    } catch (error) {
        console.error('Error downloading image:', error);
        return null;
    }
}







fs.readdir(inputFolderPath, async (err, files) => {
    if (err) {
        console.error('读取输入文件夹时发生错误:', err);
        return;
    }

    for (const file of files) {
        const filePath = path.join(inputFolderPath, file);

        if (file.endsWith('.json')) {
            try {
                const data = await readFileAsync(filePath, 'utf8');
                const jsonDataArray = JSON.parse(data);

                for (const jsonData of jsonDataArray) {
                    await processImages(jsonData);
                }

                const template = await readFileAsync(templatePath, 'binary');
                const zip = new PizZip(template);
                const doc = new Docxtemplater(zip);

                const cleanedDataArray = jsonDataArray.map((jsonData, index) => ({
                    ...jsonData,
                    answerAnalysis: jsonData.answerAnalysis && cleanSpecialCharacters(jsonData.answerAnalysis),
                    index: index + 1
                }));
                console.log(cleanedDataArray[1]);
                doc.setData({ jsonData: cleanedDataArray });

                doc.render();

                const outFilePath = path.join(outputFolderPath, `${file.replace('.json', '_result')}.docx`);
                const outputStream = fs.createWriteStream(outFilePath);

                const writePromise = new Promise((resolve, reject) => {
                    outputStream.on('finish', resolve);
                    outputStream.on('error', reject);
                });

                outputStream.write(doc.getZip().generate({ type: 'nodebuffer' }));
                outputStream.end();

                await writePromise;
                console.log('Word 文件成功写入:', outFilePath);

            } catch (parseError) {
                console.error('处理文件时发生错误:', filePath, parseError);
            }
        } else {
            console.log(`跳过非 JSON 文件: ${file}`);
        }
    }

    console.log('所有文件成功处理完成！');
});

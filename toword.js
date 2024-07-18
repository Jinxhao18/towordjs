const fs = require('fs');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const path = require('path');
const util = require('util');
const axios = require('axios');
const ImageModule = require('docxtemplater-image-module-free');

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
async function processImages(jsonData) {
    const fieldsToCheck = ['subjectTitle', 'answerAnalysis'];

    for (const field of fieldsToCheck) {
        const matches = jsonData[field] && jsonData[field].match(/<p><img[^>]+src="([^">]+)"[^>]*><\/p>/g);

        if (matches) {
            for (const match of matches) {
                const imageUrl = match.match(/src="([^"]+)"/)[1];
                const localImagePath = await downloadImageToLocal(imageUrl);
                // 创建新的字段，并删除原字段中的整个图片块
                const newFieldName = `${field}_img`;
                jsonData[newFieldName] = localImagePath;
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
                    const localImagePath = await downloadImageToLocal(imageUrl);
                    // 创建新的字段，并删除原字段中的整个图片块
                    const newFieldName = `optionTitle_img`;
                    option[newFieldName] = localImagePath;
                    option.optionTitle = option.optionTitle.replace(match, ''); // 清除整个图片块
                }
            }
        }
    }
    // 处理 allSubjectOptions
    if (jsonData.allSubjectOptions && Array.isArray(jsonData.allSubjectOptions)) {
        const sortMap = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
        for (const option of jsonData.allSubjectOptions) {
            const matches = option.optionTitle && option.optionTitle.match(/<p><img[^>]+src="([^">]+)"[^>]*><\/p>/g);

            if (matches) {
                for (const match of matches) {
                    const imageUrl = match.match(/src="([^"]+)"/)[1];
                    const localImagePath = await downloadImageToLocal(imageUrl);
                    // 创建新的字段，并删除原字段中的整个图片块
                    const newFieldName = `optionTitle_img`;
                    option[newFieldName] = localImagePath;
                    option.optionTitle = option.optionTitle.replace(match, ''); // 清除整个图片块
                }
            }
            // 根据顺序，在 optionTitle 前面增加英文序号，A、B、C、D
            const optionIndex = jsonData.allSubjectOptions.indexOf(option);
            option.optionTitle = `${sortMap[optionIndex]}. ${option.optionTitle}`;
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
                const doc = new Docxtemplater(zip, {
                    modules: [
                        new ImageModule({
                            centered: false,
                            getImage(tagValue, tagName) {
                                return fs.readFileSync(tagValue);
                            },
                            getSize() {
                                return [300, 300];
                            },
                        }),
                    ],
                });

                const cleanedDataArray = jsonDataArray.map((jsonData, index) => ({
                    ...jsonData,
                    answerAnalysis: jsonData.answerAnalysis && cleanSpecialCharacters(jsonData.answerAnalysis),
                    index: index + 1
                }));

                doc.setData({ jsonData: cleanedDataArray });

                doc.render();

                // 删除空白段落
                const zipContent = doc.getZip().generate({ type: 'nodebuffer' });
                const outputZip = new PizZip(zipContent);
                const docXml = outputZip.file("word/document.xml").asText();
                const cleanedXml = docXml.replace(/<w:p[^>]*><w:r><w:t><\/w:t><\/w:r><\/w:p>/g, ""); // 删除空白段落
                outputZip.file("word/document.xml", cleanedXml);

                const outFilePath = path.join(outputFolderPath, `${file.replace('.json', '_result')}.docx`);
                await writeFileAsync(outFilePath, outputZip.generate({ type: 'nodebuffer' }));

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


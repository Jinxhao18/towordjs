const fs = require('fs').promises;
const path = require('path');

const inputFolderPath = './originData';
const outputFolderPath = './result';

async function processFile(file) {
    try {
        const filePath = path.join(inputFolderPath, file);
        const data = await fs.readFile(filePath, 'utf8');
        const jsonArray = JSON.parse(data);

        const extractedDataArray = jsonArray.map(item => {
            if (item.subjectType === 1) {
                return {
                    subjectTitle: item.subjectTitle,
                    answerAnalysis: item.answerAnalysis,
                    rightAnswers: Number(item.rightAnswers),
                    subjectType: item.subjectType,
                    isJudgeAndRight: item.rightAnswers==1?true:false,
                    isJudgeAndFalse: item.rightAnswers==0?true:false
                };
            } else  {
                return {
                    subjectTitle: item.subjectTitle,
                    answerAnalysis: item.answerAnalysis,
                    subjectOptions: item.subjectOptionVOList.filter(option => option.isRightFlag === 1),
                    subjectType: item.subjectType,
                    isChooseType: true
                };
            }

        });

        return extractedDataArray;
    } catch (error) {
        console.error('Error processing file:', file, error);
        return [];
    }
}

async function main() {
    try {
        // Ensure the output directory exists
        await fs.mkdir(outputFolderPath, { recursive: true });

        const files = await fs.readdir(inputFolderPath);
        const allData = [];

        await Promise.all(files.map(async file => {
            const extractedDataArray = await processFile(file);
            allData.push(...extractedDataArray);
        }));

        const outputFileName = path.join(outputFolderPath, 'combined_result.json');
        await fs.writeFile(outputFileName, JSON.stringify(allData, null, 2));
        console.log('Combined result file written successfully:', outputFileName);
    } catch (error) {
        console.error('Error processing file:', file, error);
        return [];
    }
}

main();

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
                    isJudgeAndFalse: item.rightAnswers==0?true:false,
                    isRight: item.answerRight ==1?true:false,
                    isFalse: item.answerRight !=1 ?true:false,
                };
            } else  {
                const answerId = item.answer?item.answer.split('&'):[];
                return {
                    subjectTitle: item.subjectTitle,
                    answerAnalysis: item.answerAnalysis,
                    subjectOptions: item.subjectOptionVOList.filter(option => (option.isRightFlag === 1) || (answerId.includes(option.optionId))),
                    subjectType: item.subjectType,
                    isChooseType: true,
                    isRight: item.answerRight ==1?true:false,
                    isFalse: item.answerRight !=1 ?true:false,
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
        // allData 过滤掉重复的数据
        let result = [];
        let obj = {};
        for (let i = 0; i < allData.length; i++) {
            if (!obj[allData[i].subjectTitle]) {
                result.push(allData[i]);
                obj[allData[i].subjectTitle] = true;
            }
        }
        const outputFileName = path.join(outputFolderPath, 'combined_result.json');
        await fs.writeFile(outputFileName, JSON.stringify(allData, null, 2));
        console.log('Combined result file written successfully:', outputFileName);
    } catch (error) {
        console.error('Error processing file:', file, error);
        return [];
    }
}

main();

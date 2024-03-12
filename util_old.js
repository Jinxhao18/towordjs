const fs = require('fs');
const path = require('path');

const inputFolderPath = './originData'; // 你的JSON文件所在的文件夹路径
const outputFolderPath = './result'; // 输出文件夹路径

// 创建输出文件夹
if (!fs.existsSync(outputFolderPath)) {
    fs.mkdirSync(outputFolderPath);
}

// 遍历文件夹
fs.readdir(inputFolderPath, (err, files) => {
    if (err) {
        console.error('Error reading input folder:', err);
        return;
    }

    // 遍历每个文件
    files.forEach(file => {
        const filePath = path.join(inputFolderPath, file);

        // 读取JSON文件内容
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', filePath, err);
                return;
            }

            try {
                const jsonArray = JSON.parse(data);

                // 遍历数组项，提取所需数据
                const extractedDataArray = jsonArray.map(item => ({
                    subjectTitle: item.subjectTitle,
                    answerAnalysis: item.answerAnalysis,
                    subjectOptions: item.subjectOptionVOList.filter(option => option.isRightFlag === 1)
                }));

                // 写入新文件
                const outputFileName = path.join(outputFolderPath, `${file.replace('.json', '')}_result.json`);
                fs.writeFile(outputFileName, JSON.stringify(extractedDataArray, null, 2), err => {
                    if (err) {
                        console.error('Error writing result file:', outputFileName, err);
                    } else {
                        console.log('Result file written successfully:', outputFileName);
                    }
                });
            } catch (parseError) {
                console.error('Error parsing JSON in file:', filePath, parseError);
            }
        });
    });
});
const fs = require('fs');
const https = require('https');
const path = require('path');

const dir = path.join(__dirname, '..', 'web', 'news_images');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                // follow redirect
                https.get(res.headers.location, (res2) => {
                    const writeStream = fs.createWriteStream(filepath);
                    res2.pipe(writeStream);
                    writeStream.on('finish', () => {
                        writeStream.close();
                        resolve();
                    });
                }).on('error', reject);
            } else {
                const writeStream = fs.createWriteStream(filepath);
                res.pipe(writeStream);
                writeStream.on('finish', () => {
                    writeStream.close();
                    resolve();
                });
            }
        }).on('error', reject);
    });
}

async function downloadAll() {
    console.log("Downloading 50 images...");
    for(let i=1; i<=50; i++) {
        // Using picsum with a seed to get consistent random images
        const url = `https://picsum.photos/seed/wealth${i}/400/250`;
        const filepath = path.join(dir, `img${i}.jpg`);
        try {
            await downloadImage(url, filepath);
            console.log(`Downloaded img${i}.jpg`);
        } catch (e) {
            console.error(`Failed img${i}.jpg:`, e.message);
        }
    }
    console.log("Done downloading 50 images!");
}

downloadAll();

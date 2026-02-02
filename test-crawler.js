
const BillboardCrawler = require('billboard-crawler');
const crawler = new BillboardCrawler();

async function testCrawler() {
    console.log('Fetching Billboard Hot 100 via crawler...');
    try {
        const data = await crawler.getChart('Hot 100');
        console.log('Chart Name:', data.chartName);
        console.log('Current Date:', data.currentDate);
        if (data.entries && data.entries.length > 0) {
            data.entries.slice(0, 5).forEach((entry, i) => {
                console.log(`${entry.rank}. ${entry.title} - ${entry.displayArtist}`);
            });
        } else {
            console.log('No entries found.');
        }
    } catch (err) {
        console.error('Crawler Error:', err);
    }
}

testCrawler();

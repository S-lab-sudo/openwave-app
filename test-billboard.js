
import { getChart } from 'billboard-top-100';

async function testBillboard() {
    console.log('Fetching Billboard Hot 100...');
    getChart('hot-100', (err, chart) => {
        if (err) {
            console.error('Error:', err);
            return;
        }
        console.log('Title:', chart.title);
        console.log('Date:', chart.week);
        chart.songs.slice(0, 5).forEach((song, i) => {
            console.log(`${i + 1}. ${song.title} - ${song.artist}`);
        });
    });
}

testBillboard();

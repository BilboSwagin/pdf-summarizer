// script.js
const dropZone = document.getElementById('drop-zone');
const summaryDiv = document.getElementById('summary');
const downloadBtn = document.getElementById('download-btn');

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop zone
dropZone.addEventListener('dragover', () => dropZone.classList.add('dragover'));
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

// Handle drop
dropZone.addEventListener('drop', async (e) => {
    dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type === 'application/pdf') {
            await processPDF(file);
        } else {
            summaryDiv.innerHTML = 'Error: Please drop a PDF file.';
        }
    }
});

async function processPDF(file) {
    summaryDiv.innerHTML = 'Loading PDF...';
    downloadBtn.disabled = true;

    try {
        console.time('pdfProcessing'); // For debugging performance
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            disableFontFace: true, // Skip font loading
            disableRange: true,   // Disable partial loading
            disableStream: true   // Load entire PDF
        });
        const pdf = await loadingTask.promise;

        const maxPages = Math.min(pdf.numPages, 5); // Process only first 5 pages
        const pagePromises = [];
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            pagePromises.push(
                pdf.getPage(pageNum).then(async page => {
                    summaryDiv.innerHTML = `Processing page ${pageNum}/${maxPages}...`;
                    const textContent = await page.getTextContent();
                    return textContent.items.map(item => item.str).join(' ');
                })
            );
        }

        const pageTexts = await Promise.all(pagePromises);
        const fullText = pageTexts.join('\n');

        summaryDiv.innerHTML = 'Summarizing...';
        const summary = await summarizeWithAI(fullText);

        summaryDiv.innerHTML = `<h2>Summary:</h2><p>${summary}</p>`;
        downloadBtn.disabled = false;
        downloadBtn.onclick = () => downloadExcel(summary, file.name);
        console.timeEnd('pdfProcessing'); // Log processing time
    } catch (error) {
        summaryDiv.innerHTML = `Error: ${error.message}`;
        console.error(error);
    }
}

async function summarizeWithAI(text) {
    const truncatedText = text.substring(0, 2000); // Limit to 2000 chars
    try {
        const response = await fetch('https://api.x.ai/v1/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer YOUR_XAI_API_KEY' // Replace with your key
            },
            body: JSON.stringify({
                text: truncatedText,
                max_length: 100 // Smaller summary for speed
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.summary; // Adjust based on xAI API response structure
    } catch (error) {
        throw new Error(`Summarization failed: ${error.message}`);
    }
}

function downloadExcel(summary, filename) {
    const ws = XLSX.utils.json_to_sheet([{ Summary: summary }]); // Simplified output
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    XLSX.writeFile(wb, `${filename}_summary.xlsx`);
}
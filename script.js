// script.js
const dropZone = document.getElementById('drop-zone');
const summaryDiv = document.getElementById('summary');
const downloadBtn = document.getElementById('download-btn');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

dropZone.addEventListener('dragover', () => dropZone.classList.add('dragover'));
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

dropZone.addEventListener('drop', async (e) => {
  dropZone.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (file.type === 'application/pdf') {
      await processPDF(file);
    } else {
      alert('Please drop a PDF file.');
    }
  }
});

async function processPDF(file) {
  summaryDiv.innerHTML = 'Processing PDF...';
  downloadBtn.disabled = true;

  // Convert PDF to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  // Call Vercel serverless function
  try {
    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfData: base64 })
    });

    if (!response.ok) {
      throw new Error('Failed to summarize PDF');
    }

    const { summary } = await response.json();
    summaryDiv.innerHTML = `<h2>Summary:</h2><p>${summary}</p>`;
    downloadBtn.disabled = false;
    downloadBtn.onclick = () => downloadExcel(summary, file.name);
  } catch (error) {
    summaryDiv.innerHTML = `Error: ${error.message}`;
  }
}

function downloadExcel(summary, filename) {
  const ws = XLSX.utils.aoa_to_sheet([
    ['PDF File', filename],
    ['Summary', summary]
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Summary');
  XLSX.writeFile(wb, `${filename}_summary.xlsx`);
}
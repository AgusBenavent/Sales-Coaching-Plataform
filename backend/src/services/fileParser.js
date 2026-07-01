const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const https = require('https');

async function parseFile(buffer, originalname) {
  const ext = originalname.split('.').pop().toLowerCase();

  if (ext === 'pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (ext === 'docx' || ext === 'doc') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.read(buffer);
    let text = '';
    workbook.SheetNames.forEach(name => {
      const sheet = workbook.Sheets[name];
      text += `--- Hoja: ${name} ---\n`;
      text += XLSX.utils.sheet_to_csv(sheet);
      text += '\n\n';
    });
    return text;
  }

  // .txt y cualquier otro formato: texto plano
  return buffer.toString('utf-8');
}

async function parseGoogleDocUrl(url) {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) throw new Error('URL de Google Docs inválida');

  const docId = match[1];
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

  return new Promise((resolve, reject) => {
    function fetch(u) {
      https.get(u, { headers: { 'User-Agent': 'SalesCoachBot/1.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return fetch(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Google Docs devolvió ${res.statusCode}. Verificá que el doc sea público.`));
        }
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }).on('error', reject);
    }
    fetch(exportUrl);
  });
}

module.exports = { parseFile, parseGoogleDocUrl };

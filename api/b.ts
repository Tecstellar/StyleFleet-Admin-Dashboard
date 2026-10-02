import type { IncomingMessage, ServerResponse } from 'http';

const SUPABASE_STORAGE_BASE = 'https://scgokpcoyfewrtrwqxpu.supabase.co/storage/v1/object/public/invoices';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const urlObj = new URL(req.url || '', 'https://stylefleet.tecstellar.com');
  const pathParam = (urlObj.searchParams.get('path') || urlObj.searchParams.get('id') || '').trim();
  const directFile = (urlObj.searchParams.get('f') || urlObj.searchParams.get('file') || '').trim();

  // 1. Direct file query parameter
  if (directFile) {
    const target = directFile.startsWith('http') ? directFile : `${SUPABASE_STORAGE_BASE}/${directFile}`;
    res.writeHead(302, { Location: target });
    res.end();
    return;
  }

  // 2. Direct path with .pdf extension
  if (pathParam && pathParam.toLowerCase().endsWith('.pdf')) {
    res.writeHead(302, { Location: `${SUPABASE_STORAGE_BASE}/${pathParam}` });
    res.end();
    return;
  }

  // 3. Path provided without .pdf extension — redirect to the PDF file directly
  if (pathParam) {
    res.writeHead(302, { Location: `${SUPABASE_STORAGE_BASE}/${pathParam}.pdf` });
    res.end();
    return;
  }

  // 4. Standalone branded invoice page (NEVER the admin portal)
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>StyleFleet Invoice</title>
</head>
<body style="margin:0; min-height:100vh; background:#0B1F44; color:white; font-family:system-ui, -apple-system, sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:24px;">
  <div style="max-width:380px;">
    <h2 style="margin:0 0 10px; font-size:22px; font-weight:700;">StyleFleet Invoice</h2>
    <p style="margin:0; font-size:14px; color:#cbd5e1; line-height:1.5;">Invoice not found or link has expired. Please contact your salon for assistance.</p>
  </div>
</body>
</html>`);
}

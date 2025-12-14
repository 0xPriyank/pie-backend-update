import puppeteer from "puppeteer";

export async function generatePDFBuffer(html: string) {
  // For serverless (AWS Lambda) use puppeteer-core + chrome-aws-lambda.
  // For typical servers, puppeteer is fine.
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=medium"]
  });

  try {
    const page = await browser.newPage();

    // ensure fonts render consistently. You can add base64 fonts if needed.
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" }
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

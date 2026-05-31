require("dotenv").config();

const http = require("http");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const nodemailer = require("nodemailer");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const XLSX_PATH = path.join(ROOT, "enquiries.xlsx");
const MAIL_TO = process.env.MAIL_TO || "rajkale1324@gmail.com";

function sendJson(res, status, obj) {
    const body = JSON.stringify(obj);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
}

async function appendEnquiryToXlsx(filePath, payload) {
    const workbook = new ExcelJS.Workbook();

    if (fs.existsSync(filePath)) {
        await workbook.xlsx.readFile(filePath);
    }

    let sheet = workbook.getWorksheet("Enquiries");

    if (!sheet) {
        sheet = workbook.addWorksheet("Enquiries");
        sheet.addRow(["Created At", "Parent Name", "Student Name", "Class", "Phone"]);
    }

    console.log("Rows before:", sheet.rowCount);

    sheet.addRow([
        payload.createdAt || new Date().toISOString(),
        payload.parentName || "",
        payload.studentName || "",
        payload.className || "",
        payload.phone || "",
    ]);

    console.log("Rows after:", sheet.rowCount);

    await workbook.xlsx.writeFile(filePath);

    const verifyWorkbook = new ExcelJS.Workbook();
    await verifyWorkbook.xlsx.readFile(filePath);
    const verifySheet = verifyWorkbook.getWorksheet("Enquiries");

    console.log("VERIFICATION ROW COUNT:", verifySheet.rowCount);
    console.log("Excel saved:", filePath);
}

async function emailXlsx(filePath) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const info = await transporter.sendMail({
        from: `"New English Medium School" <${process.env.SMTP_USER}>`,
        to: MAIL_TO,
        subject: "New Admission Enquiry",
        html: `
            <h2>New Admission Enquiry Received</h2>
            <p>The updated enquiry Excel file is attached.</p>
        `,
        attachments: [{
            filename: "enquiries.xlsx",
            path: filePath,
        }, ],
    });

    console.log("Email sent successfully");
    console.log("Accepted:", info.accepted);
    console.log("Rejected:", info.rejected);
}

function serveStaticFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
    };

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Not found");
            return;
        }

        res.writeHead(200, {
            "Content-Type": mimeTypes[ext] || "application/octet-stream",
            "Content-Length": data.length,
        });

        res.end(data);
    });
}

const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;

    if (req.method === "POST" && pathname === "/api/enquiry") {
        let body = "";

        req.on("data", (chunk) => {
            body += chunk;
            if (body.length > 1000000) req.destroy();
        });

        req.on("end", async() => {
            try {
                const payload = body ? JSON.parse(body) : {};

                console.log("Received enquiry:", payload);

                if (!payload.studentName || !payload.phone) {
                    return sendJson(res, 400, {
                        ok: false,
                        error: "Missing required fields",
                    });
                }

                await appendEnquiryToXlsx(XLSX_PATH, payload);

                let emailStatus = { sent: true };

                try {
                    await emailXlsx(XLSX_PATH);
                } catch (emailError) {
                    console.error("Email error:", emailError);
                    emailStatus = {
                        sent: false,
                        error: emailError.message,
                    };
                }

                sendJson(res, 200, {
                    ok: true,
                    email: emailStatus,
                });
            } catch (err) {
                console.error(err);
                sendJson(res, 500, {
                    ok: false,
                    error: err.message || "Server error",
                });
            }
        });

        return;
    }

    const filePath =
        pathname === "/" ?
        path.join(ROOT, "index.html") :
        path.join(ROOT, pathname);

    serveStaticFile(res, filePath);
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
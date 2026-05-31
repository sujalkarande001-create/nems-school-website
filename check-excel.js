const ExcelJS = require("exceljs");

async function check() {
    try {
        console.log("Starting check...");

        const workbook = new ExcelJS.Workbook();

        await workbook.xlsx.readFile("enquiries.xlsx");

        console.log("Workbook loaded");

        console.log("Sheets:", workbook.worksheets.map(s => s.name));

        const sheet = workbook.getWorksheet(1);

        if (!sheet) {
            console.log("No worksheet found");
            return;
        }

        console.log("Worksheet:", sheet.name);
        console.log("Row count:", sheet.rowCount);

        sheet.eachRow((row, rowNumber) => {
            console.log("Row", rowNumber, row.values);
        });

    } catch (err) {
        console.error("ERROR:", err);
    }
}

check();
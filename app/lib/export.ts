import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export const exportToExcel = async (
  data: any[], 
  fileName: string = 'quiz-results'
) => {
  // 1. Create a new Workbook
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Results')

  // 2. Define Columns (You can customize headers and widths here)
  // Assuming data looks like: { studentName: 'Kofi', score: 85, ... }
  if (data.length > 0) {
    const columns = Object.keys(data[0]).map(key => ({
      header: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize header
      key: key,
      width: 20 // nice wide columns
    }))
    worksheet.columns = columns
  }

  // 3. Add Data
  worksheet.addRows(data)

  // 4. Make the Header Row Bold (Bonus styling xlsx couldn't do easily!)
  worksheet.getRow(1).font = { bold: true }

  // 5. Write to buffer and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `${fileName}.xlsx`)
}

export const exportToExcelWithSheets = async (
  sheets: Array<{ name: string; data: any[] }>,
  fileName: string = 'export'
) => {
  // 1. Create a new Workbook
  const workbook = new ExcelJS.Workbook()

  // 2. Add each sheet
  sheets.forEach(({ name, data }) => {
    const worksheet = workbook.addWorksheet(name)

    if (data.length > 0) {
      // Define columns based on the data keys
      const columns = Object.keys(data[0]).map(key => ({
        header: key,
        key: key,
        width: 20
      }))
      worksheet.columns = columns

      // Add data
      worksheet.addRows(data)

      // Style header row
      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE9ECEF' }
      }
    }
  })

  // 3. Write to buffer and download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `${fileName}.xlsx`)
}
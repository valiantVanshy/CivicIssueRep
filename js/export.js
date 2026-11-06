/**
 * Export Module - PDF and Excel Export Functionality
 */

class ExportManager {
    constructor() {
        this.jsPDFLoaded = false;
        this.xlsxLoaded = false;
    }

    /**
     * Load jsPDF library dynamically
     */
    async loadJsPDF() {
        if (this.jsPDFLoaded) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                this.jsPDFLoaded = true;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Load SheetJS library dynamically
     */
    async loadXLSX() {
        if (this.xlsxLoaded) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            script.onload = () => {
                this.xlsxLoaded = true;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Export reports to Excel
     */
    async exportToExcel(reports, filename = `reports-${Date.now()}`) {
        try {
            loadingManager.showPageLoader('Preparing Excel export...');
            await this.loadXLSX();

            // Prepare data for Excel
            const excelData = reports.map(report => ({
                'Report ID': `#${report.id}`,
                'Title': report.title,
                'Category': report.category,
                'Subcategory': report.subcategory || 'N/A',
                'Priority': report.priority,
                'Status': report.status,
                'Department': report.assigned_department,
                'Description': report.description,
                'Location': report.address || 'N/A',
                'Contact': report.citizen_contact || 'Anonymous',
                'Reported Date': new Date(report.created_at).toLocaleDateString(),
                'Last Updated': new Date(report.updated_at).toLocaleDateString()
            }));

            // Create workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);

            // Set column widths
            ws['!cols'] = [
                { wch: 10 },  // Report ID
                { wch: 30 },  // Title
                { wch: 20 },  // Category
                { wch: 20 },  // Subcategory
                { wch: 12 },  // Priority
                { wch: 12 },  // Status
                { wch: 20 },  // Department
                { wch: 50 },  // Description
                { wch: 30 },  // Location
                { wch: 25 },  // Contact
                { wch: 15 },  // Reported Date
                { wch: 15 }   // Last Updated
            ];

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Reports');

            // Generate Excel file
            XLSX.writeFile(wb, `${filename}.xlsx`);

            return { success: true, message: 'Excel file downloaded successfully' };
        } catch (error) {
            console.error('Excel export failed:', error);
            throw new Error('Failed to export to Excel: ' + error.message);
        } finally {
            loadingManager.hidePageLoader();
        }
    }

    /**
     * Export reports to PDF
     */
    async exportToPDF(reports, filename = `reports-${Date.now()}`) {
        try {
            loadingManager.showPageLoader('Preparing PDF export...');
            await this.loadJsPDF();

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            let yPosition = 20;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 15;
            const lineHeight = 7;

            // Add title
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text('SAKSHAM - Civic Reports', margin, yPosition);
            yPosition += 10;

            // Add generation date
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
            yPosition += 10;

            // Add summary
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(`Total Reports: ${reports.length}`, margin, yPosition);
            yPosition += lineHeight;

            const statusCounts = reports.reduce((acc, r) => {
                acc[r.status] = (acc[r.status] || 0) + 1;
                return acc;
            }, {});

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            Object.entries(statusCounts).forEach(([status, count]) => {
                doc.text(`${status}: ${count}`, margin + 10, yPosition);
                yPosition += lineHeight;
            });

            yPosition += 5;

            // Add reports
            reports.forEach((report, index) => {
                // Check if we need a new page
                if (yPosition > pageHeight - 40) {
                    doc.addPage();
                    yPosition = 20;
                }

                // Report header
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text(`Report #${report.id}`, margin, yPosition);
                yPosition += lineHeight;

                // Report details
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');

                const details = [
                    `Title: ${report.title}`,
                    `Category: ${report.category} ${report.subcategory ? `(${report.subcategory})` : ''}`,
                    `Priority: ${report.priority} | Status: ${report.status}`,
                    `Department: ${report.assigned_department}`,
                    `Location: ${report.address || 'N/A'}`,
                    `Reported: ${new Date(report.created_at).toLocaleDateString()}`,
                    `Description: ${report.description.substring(0, 200)}${report.description.length > 200 ? '...' : ''}`
                ];

                details.forEach(line => {
                    const splitText = doc.splitTextToSize(line, 180);
                    splitText.forEach(textLine => {
                        if (yPosition > pageHeight - 20) {
                            doc.addPage();
                            yPosition = 20;
                        }
                        doc.text(textLine, margin + 5, yPosition);
                        yPosition += lineHeight;
                    });
                });

                yPosition += 3;

                // Add separator
                if (index < reports.length - 1) {
                    doc.setDrawColor(200, 200, 200);
                    doc.line(margin, yPosition, 195, yPosition);
                    yPosition += 5;
                }
            });

            // Save PDF
            doc.save(`${filename}.pdf`);

            return { success: true, message: 'PDF file downloaded successfully' };
        } catch (error) {
            console.error('PDF export failed:', error);
            throw new Error('Failed to export to PDF: ' + error.message);
        } finally {
            loadingManager.hidePageLoader();
        }
    }

    /**
     * Export single report to PDF
     */
    async exportSingleReportToPDF(report) {
        try {
            await this.loadJsPDF();

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            let yPosition = 20;
            const margin = 15;
            const lineHeight = 7;

            // Title
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text(`Report #${report.id}`, margin, yPosition);
            yPosition += 10;

            // Basic info
            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');

            const info = [
                ['Title:', report.title],
                ['Category:', `${report.category} ${report.subcategory ? `(${report.subcategory})` : ''}`],
                ['Priority:', report.priority],
                ['Status:', report.status],
                ['Department:', report.assigned_department],
                ['Contact:', report.citizen_contact || 'Anonymous'],
                ['Location:', report.address || 'N/A'],
                ['Coordinates:', report.latitude && report.longitude ? `${report.latitude}, ${report.longitude}` : 'N/A'],
                ['Reported:', new Date(report.created_at).toLocaleString()],
                ['Last Updated:', new Date(report.updated_at).toLocaleString()]
            ];

            info.forEach(([label, value]) => {
                doc.setFont(undefined, 'bold');
                doc.text(label, margin, yPosition);
                doc.setFont(undefined, 'normal');
                const splitText = doc.splitTextToSize(String(value), 150);
                splitText.forEach((line, idx) => {
                    doc.text(line, margin + 35, yPosition + (idx * lineHeight));
                });
                yPosition += (splitText.length * lineHeight) + 2;
            });

            yPosition += 5;

            // Description
            doc.setFont(undefined, 'bold');
            doc.text('Description:', margin, yPosition);
            yPosition += lineHeight;

            doc.setFont(undefined, 'normal');
            const descLines = doc.splitTextToSize(report.description, 180);
            descLines.forEach(line => {
                doc.text(line, margin, yPosition);
                yPosition += lineHeight;
            });

            // Save
            doc.save(`report-${report.id}.pdf`);

            return { success: true };
        } catch (error) {
            console.error('PDF export failed:', error);
            throw error;
        }
    }
}

// Create global instance
const exportManager = new ExportManager();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ExportManager, exportManager };
} else {
    window.ExportManager = ExportManager;
    window.exportManager = exportManager;
}

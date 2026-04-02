import { DailyHealthReport } from '../types';

export class ReportGenerator {
    /**
     * Generates a CSV string from health report history
     */
    public static generateCSV(reports: DailyHealthReport[]): string {
        if (reports.length === 0) return "Date,Avg HR,Max HR,Avg Temp,Activity,Incidents\n";

        const headers = ["Date", "Avg Heart Rate", "Max Heart Rate", "Avg Temp", "Activity Level", "Incidents Count"];
        const rows = reports.map(r => [
            r.date,
            r.metrics.hr.avg,
            r.metrics.hr.max,
            r.metrics.temp.avg,
            r.metrics.activityLevel,
            r.incidents.length
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    /**
     * Triggers a browser download of the CSV content
     */
    public static downloadCSV(patientName: string, reports: DailyHealthReport[]) {
        const csv = this.generateCSV(reports);
        const filename = `HealthReport_${patientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    /**
     * Mock PDF generation (Text-based for now)
     */
    public static async downloadPDF(patientName: string, history: DailyHealthReport[]) {
        // In a real app we'd use jspdf or similar. For now, we simulate with a text download
        const content = `MEDICAL HEALTH REPORT\nPATIENT: ${patientName}\nGENERATED: ${new Date().toLocaleString()}\n\n` +
            this.generateCSV(history).replace(/,/g, '\t');

        const blob = new Blob([content], { type: 'application/pdf' }); // Simulated PDF
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `MedicalSummary_${patientName.replace(/\s+/g, '_')}.pdf`;
        link.click();
    }
}

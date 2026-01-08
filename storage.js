// --- DATA STORAGE ---
const REPORTS_KEY = 'fiscalizacaoReports';
const OPERATION_DATA_KEY = 'currentOperation';
const FINAL_REPORTS_KEY = 'fiscalizacaoFinalReports';

/**
 * Saves the current operation's setup data to sessionStorage.
 * @param {object} operationData - The data for the current operation session.
 */
export const saveOperationData = (operationData) => {
    sessionStorage.setItem(OPERATION_DATA_KEY, JSON.stringify(operationData));
};

/**
 * Retrieves the current operation's setup data from sessionStorage.
 * @returns {object | null} The operation data object or null if not found.
 */
export const getOperationData = () => {
    const data = sessionStorage.getItem(OPERATION_DATA_KEY);
    return data ? JSON.parse(data) : null;
};

/**
 * Retrieves all saved reports from localStorage.
 * @returns {Array} An array of report objects.
 */
export const getSavedReports = () => JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');

/**
 * Saves a new report to localStorage.
 * @param {object} reportData - The report data to save.
 */
export const saveReport = (reportData) => {
    const reports = getSavedReports();
    const operationData = getOperationData();

    // Add operation data to the report
    const fullReportData = { ...operationData, ...reportData };
    
    fullReportData.id = Date.now(); // Unique ID for each report
    fullReportData.timestamp = new Date().toISOString();
    reports.push(fullReportData);
    localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
};

/**
 * Updates an existing report in localStorage.
 * @param {object} updatedReportData - The full report object with updated data.
 */
export const updateReport = (updatedReportData) => {
    if (!updatedReportData.id) {
        console.error("Cannot update report without an ID.");
        return;
    }
    const reports = getSavedReports();
    const operationData = getOperationData();

    // Re-apply session data in case it's relevant, though update is usually on existing fields
    const fullReportData = { ...operationData, ...updatedReportData };

    const reportIndex = reports.findIndex(r => r.id === fullReportData.id);

    if (reportIndex !== -1) {
        // Preserve original timestamp and operation data if not present in the update
        reports[reportIndex] = { 
            ...reports[reportIndex], 
            ...fullReportData 
        };
        localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
    } else {
        console.error(`Report with ID ${updatedReportData.id} not found.`);
    }
};

/**
 * Deletes a report from localStorage.
 * @param {number} reportId - The ID of the report to delete.
 */
export const deleteReport = (reportId) => {
    if (!reportId) {
        console.error("Cannot delete report without an ID.");
        return;
    }
    let reports = getSavedReports();
    const updatedReports = reports.filter(r => r.id !== reportId);
    
    if (reports.length === updatedReports.length) {
        console.warn(`Report with ID ${reportId} not found for deletion.`);
    }

    localStorage.setItem(REPORTS_KEY, JSON.stringify(updatedReports));
};
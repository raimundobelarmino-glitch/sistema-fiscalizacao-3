import { getSavedReports, updateReport, getOperationData, deleteReport } from './storage.js';
import { initializeInfractionAdder } from './form-ui-handler.js';
import { autoUppercase, formatCpf } from './form-utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS ---
    const searchSection = document.getElementById('search-section');
    const searchInput = document.getElementById('search-plate');
    const searchBtn = document.getElementById('search-btn');
    const searchError = document.getElementById('search-error');
    const searchErrorMessage = document.getElementById('search-error-message');
    const registerNewBtn = document.getElementById('register-new-btn');
    const individualReportsContainer = document.getElementById('individual-reports-container');
    const individualReportsSection = document.getElementById('individual-reports-section');
    const noReportsMessage = document.getElementById('no-reports-message');
    
    const form = document.getElementById('report-form');
    const successMessageSection = document.getElementById('success-message');
    const newSearchBtn = document.getElementById('new-search-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const criminalOccurrenceGroup = document.getElementById('criminal-occurrence-group');
    const criminalOccurrenceOtherInput = document.getElementById('criminal-occurrence-other');
    const condutorCpfInput = document.getElementById('condutor-cpf');

    // --- STATE ---
    let addedInfractions = [];
    let currentReport = null;
    let operationData = null; // To hold the current operation context
    const operationOptions = {
        "OLS": "OPERAÇÃO LEI SECA - OLS", "OCG": "OPERAÇÃO CORTA GIRO - OCG", "2R1V": "DUAS RODAS - 2R1V",
        "4R1V": "QUATRO RODAS - 4R1V", "PV": "PATRULHAMENTO VIÁRIO- PV", "FC": "FISCALIZAÇÃO CONVENCIONAL- FC",
        "FE": "FISCALIZAÇÃO ESCOLAR - FE", "ORS": "OPERAÇÃO ROTA SEGURA - ORS"
    };

    /**
     * Checks if a report is considered "complete" with all necessary data.
     * @param {object} report The report object to check.
     * @returns {boolean} True if the report is complete, false otherwise.
     */
    const isReportComplete = (report) => {
        if (!report) return false;

        const hasDriverInfo = report['condutor-nome'] && report['condutor-cpf'];
        const infractionsData = report['infractions-data'];
        const hasInfractions = infractionsData && infractionsData.length > 2 && infractionsData !== '[]';
        const hasDisposition = report['vehicle-disposition'] && report['vehicle-disposition'] !== 'N/A';
        
        return !!(hasDriverInfo && hasInfractions && hasDisposition);
    };

    // --- UI & FORM LOGIC ---

    const renderIndividualReports = (reports) => {
        individualReportsContainer.innerHTML = '';
        if (reports.length === 0) {
            noReportsMessage.classList.remove('hidden');
            return;
        }
        noReportsMessage.classList.add('hidden');

        const reportsById = reports.reduce((acc, report) => {
            acc[report.id] = report;
            return acc;
        }, {});

        reports.forEach(report => {
            const card = document.createElement('div');
            card.className = 'report-card';
            const reportDate = new Date(report.timestamp).toLocaleString('pt-BR');
            const isComplete = isReportComplete(report);

            const continueButtonClass = isComplete ? 'continue-report-btn success-button' : 'continue-report-btn';
            const continueButtonText = isComplete ? 'Revisar Cadastro' : 'Continuar Cadastro';

            card.innerHTML = `
                <div class="report-card-header">
                    <h3>${report['id-value'] ? report['id-value'].toUpperCase() : 'N/A'}</h3>
                    <span>${reportDate}</span>
                </div>
                <div class="report-card-body">
                    <p><strong>Tipo de Veículo:</strong> ${report['vehicle-type'] || 'N/A'}</p>
                    <p><strong>Condutor:</strong> ${report['driver-gender'] || 'N/A'}, ${report['driver-age'] || 'N/A'} anos</p>
                </div>
                <div class="report-card-actions">
                    <button class="${continueButtonClass}" data-report-id="${report.id}">${continueButtonText}</button>
                    <button class="edit-report-btn secondary" data-report-id="${report.id}">Editar Cadastro</button>
                    <button class="delete-report-btn danger-button" data-report-id="${report.id}">Excluir</button>
                </div>
            `;
            individualReportsContainer.appendChild(card);
        });

        individualReportsContainer.addEventListener('click', (e) => {
            const reportId = e.target.dataset.reportId;
            if (!reportId) return;

            if (e.target.classList.contains('edit-report-btn')) {
                window.location.href = `form.html?edit=${reportId}&from=continue`;
                return;
            }

            const reportIdNum = parseInt(reportId, 10);
            
            if (e.target.classList.contains('continue-report-btn')) {
                const reportToContinue = reportsById[reportIdNum];
                if (reportToContinue) {
                    populateForm(reportToContinue);
                }
            } else if (e.target.classList.contains('delete-report-btn')) {
                if (confirm('Tem certeza de que deseja excluir este cadastro? Esta ação não pode ser desfeita.')) {
                    deleteReport(reportIdNum);
                    // Re-filter and render the reports list for the current operation
                    const allReports = getSavedReports();
                    const reportsInCurrentOperation = allReports.filter(r =>
                        r['data-operacao'] === operationData['data-operacao'] &&
                        r['operation-type'] === operationData['operation-type'] &&
                        r['regional'] === operationData['regional']
                    ).sort((a,b) => b.id - a.id);
                    renderIndividualReports(reportsInCurrentOperation);
                }
            }
        });
    };

    const setupPage = () => {
        operationData = getOperationData();
        if (!operationData) {
            alert("Nenhuma operação selecionada. Redirecionando para a tela de seleção.");
            window.location.href = 'select-operation.html';
            return;
        }
        // Display info about the current operation at the top of the search section
        const opInfoDiv = document.createElement('div');
        opInfoDiv.className = 'report-card-body';
        opInfoDiv.style = "background-color: #e9ecef; padding: 1rem; border-radius: var(--border-radius); margin-bottom: 1.5rem;";
        const operationDate = new Date(operationData['data-operacao'] + 'T00:00:00');

        opInfoDiv.innerHTML = `
            <p><strong>Trabalhando na Operação:</strong></p>
            <p><strong>Tipo:</strong> ${operationOptions[operationData['operation-type']] || 'N/A'}</p>
            <p><strong>Chefe de Equipe:</strong> ${operationData['chefe-equipe'] || 'N/A'}</p>
            <p><strong>Data:</strong> ${operationDate.toLocaleDateString('pt-BR')}</p>
            <p><strong>Horário Inicial:</strong> ${operationData['hora-inicial'] || 'N/A'}</p>
            <p><strong>Regional:</strong> ${operationData.regional}</p>
        `;
        searchSection.insertBefore(opInfoDiv, searchSection.firstChild);

        // Load and display reports for this operation
        const allReports = getSavedReports();
        const reportsInCurrentOperation = allReports.filter(r =>
            r['data-operacao'] === operationData['data-operacao'] &&
            r['operation-type'] === operationData['operation-type'] &&
            r['regional'] === operationData['regional']
        ).sort((a,b) => b.id - a.id); // Sort newest first

        renderIndividualReports(reportsInCurrentOperation);
        
        registerNewBtn.addEventListener('click', () => {
            const plate = searchInput.value.trim().toUpperCase();
            if (plate) {
                // Redirect to form.html with the plate and a 'from' parameter
                window.location.href = `form.html?plate=${encodeURIComponent(plate)}&from=continue`;
            }
        });
    };

    const showSearchError = (message, showRegisterButton) => {
        searchErrorMessage.textContent = message;
        registerNewBtn.classList.toggle('hidden', !showRegisterButton);
        searchError.classList.remove('hidden');
    };

    const hideSearchError = () => {
        searchError.classList.add('hidden');
    };
    
    const resetForm = () => {
        form.reset();
        form.classList.add('hidden');
        searchSection.classList.remove('hidden');
        individualReportsSection.classList.remove('hidden');
        successMessageSection.classList.add('hidden');
        searchInput.value = '';
        searchInput.focus();
        currentReport = null;
        addedInfractions = [];
        hideSearchError();
        criminalOccurrenceOtherInput.classList.add('hidden');
        // Re-initialize infraction adder to clear it
        initializeInfractionAdder({
            ctbSearchInputId: 'ctb-search',
            ctbSuggestionsContainerId: 'ctb-suggestions',
            infractionsListId: 'infractions-list',
            infractionsDataInputId: 'infractions-data',
            initialInfractions: [],
            onUpdate: (updatedInfractions) => {
                addedInfractions = updatedInfractions;
            }
        });
    };
    
    const populateForm = (report) => {
        currentReport = report;
        
        document.getElementById('report-id').value = report.id;
        document.getElementById('display-regional').textContent = report.regional || 'N/A';
        document.getElementById('display-municipio-acao').textContent = report['municipio-acao'] || 'N/A';
        document.getElementById('display-operation-type').textContent = (operationOptions[report['operation-type']] || report['operation-type']) || 'N/A';
        document.getElementById('display-id-value').textContent = report['id-value'] ? report['id-value'].toUpperCase() : 'N/A';
        document.getElementById('display-vehicle-type').textContent = report['vehicle-type'] || 'N/A';
        document.getElementById('display-condutor-nome').textContent = report['condutor-nome'] || 'N/A';
        document.getElementById('display-condutor-cpf').textContent = report['condutor-cpf'] || 'N/A';
        document.getElementById('display-driver-gender').textContent = report['driver-gender'] || 'N/A';
        document.getElementById('display-driver-age').textContent = report['driver-age'] || 'N/A';
        document.getElementById('display-observations').textContent = report.observations || 'Nenhuma';
        
        // Populate the new input fields
        document.getElementById('condutor-nome').value = report['condutor-nome'] || '';
        document.getElementById('condutor-cpf').value = report['condutor-cpf'] || '';
        
        // Set vehicle disposition
        const dispositionValue = report['vehicle-disposition'] || 'N/A';
        const dispositionRadios = document.querySelectorAll('input[name="vehicle-disposition"]');
        dispositionRadios.forEach(radio => {
            if (radio.value === dispositionValue) {
                radio.checked = true;
            }
        });

        // Set vehicle recovered status
        document.querySelector('input[name="vehicle-recovered"]').checked = !!report['vehicle-recovered'];

        // Set criminal occurrence
        const resultadoTipo = report['resultado-tipo'];
        const resultadoValor = parseFloat(report['resultado-valor']?.replace(',', '.'));
        const art306Radio = document.querySelector('input[name="criminal-occurrence"][value="Art. 306 CTB"]');

        let shouldCheckArt306 = (resultadoTipo === '165' && !isNaN(resultadoValor) && resultadoValor > 0.33) || (resultadoTipo === 'TC');
        
        if (shouldCheckArt306) {
             art306Radio.checked = true;
             // Ensure 'other' field is hidden
             criminalOccurrenceOtherInput.classList.add('hidden');
             criminalOccurrenceOtherInput.value = '';
        } else {
            const occurrenceValue = report['criminal-occurrence'] || 'Nenhuma';
            const occurrenceRadios = document.querySelectorAll('input[name="criminal-occurrence"]');
            let otherValue = '';
            occurrenceRadios.forEach(radio => {
                if (radio.value === occurrenceValue) {
                    radio.checked = true;
                }
                if(occurrenceValue === 'Outros' && report['criminal-occurrence-other']) {
                    otherValue = report['criminal-occurrence-other'];
                }
            });
            
            if (occurrenceValue === 'Outros') {
                criminalOccurrenceOtherInput.value = otherValue;
                criminalOccurrenceOtherInput.classList.remove('hidden');
            } else {
                criminalOccurrenceOtherInput.classList.add('hidden');
                criminalOccurrenceOtherInput.value = '';
            }
        }

        addedInfractions = (report['infractions-data'] && report['infractions-data'].length > 2) ? JSON.parse(report['infractions-data']) : [];
        
        // Initialize the infraction adder with the current report's infractions
        initializeInfractionAdder({
            ctbSearchInputId: 'ctb-search',
            ctbSuggestionsContainerId: 'ctb-suggestions',
            infractionsListId: 'infractions-list',
            infractionsDataInputId: 'infractions-data',
            initialInfractions: addedInfractions,
            onUpdate: (updatedInfractions) => {
                addedInfractions = updatedInfractions;
            },
            infractionItemConfig: {
                showAutoNumberInput: true // Show the "Nº do Auto" input
            }
        });

        searchSection.classList.add('hidden');
        individualReportsSection.classList.add('hidden');
        form.classList.remove('hidden');
    };

    const findReport = () => {
        const plateToFind = searchInput.value.trim().toUpperCase();
        if (!plateToFind) {
            showSearchError("Por favor, digite uma placa.", false);
            return;
        }
        
        const reports = getSavedReports();
        // Filter reports to only include those from the current operation context
        const reportsInCurrentOperation = reports.filter(r =>
            r['data-operacao'] === operationData['data-operacao'] &&
            r['operation-type'] === operationData['operation-type'] &&
            r['regional'] === operationData['regional']
        );

        // Search from newest to oldest to get the latest entry for a plate within this operation
        const foundReport = [...reportsInCurrentOperation].reverse().find(r => r['id-type'] === 'Placa' && r['id-value'] && r['id-value'].toUpperCase() === plateToFind);
        
        if (foundReport) {
            hideSearchError();
            populateForm(foundReport);
        } else {
            showSearchError(`Nenhum cadastro encontrado para a placa "${plateToFind}". Deseja iniciar um novo?`, true);
        }
    };

    // --- EVENT LISTENERS ---
    searchBtn.addEventListener('click', findReport);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            findReport();
        }
    });

    formatCpf(condutorCpfInput);

    criminalOccurrenceGroup.addEventListener('change', (e) => {
        if (e.target.name === 'criminal-occurrence') {
            const isOther = e.target.value === 'Outros';
            criminalOccurrenceOtherInput.classList.toggle('hidden', !isOther);
            if(isOther) {
                criminalOccurrenceOtherInput.focus();
            } else {
                criminalOccurrenceOtherInput.value = '';
            }
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentReport) return;

        // Update condutor info from the new fields
        currentReport['condutor-nome'] = document.getElementById('condutor-nome').value.trim();
        currentReport['condutor-cpf'] = document.getElementById('condutor-cpf').value.trim();

        currentReport['infractions-data'] = JSON.stringify(addedInfractions);
        currentReport['vehicle-disposition'] = document.querySelector('input[name="vehicle-disposition"]:checked').value;
        currentReport['vehicle-recovered'] = document.querySelector('input[name="vehicle-recovered"]').checked;
        currentReport['criminal-occurrence'] = document.querySelector('input[name="criminal-occurrence"]:checked').value;
        if(currentReport['criminal-occurrence'] === 'Outros') {
            currentReport['criminal-occurrence-other'] = criminalOccurrenceOtherInput.value;
        } else {
             delete currentReport['criminal-occurrence-other'];
        }
        
        const additionalObs = document.getElementById('additional-observations').value.trim();
        if (additionalObs) {
            const timestamp = new Date().toLocaleString('pt-BR');
            const newObs = `\n[Atualizado em ${timestamp}]: ${additionalObs}`;
            currentReport.observations = (currentReport.observations || '') + newObs;
        }
        
        updateReport(currentReport);

        form.classList.add('hidden');
        successMessageSection.classList.remove('hidden');
        successMessageSection.scrollIntoView({ behavior: 'smooth' });
    });
    
    cancelBtn.addEventListener('click', resetForm);
    newSearchBtn.addEventListener('click', resetForm);

    // --- INITIALIZATION ---
    setupPage(); // Set up the page with operation context
});
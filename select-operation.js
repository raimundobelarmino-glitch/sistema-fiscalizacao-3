import { getSavedReports, getOperationData, saveOperationData } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
    const activeSessionSection = document.getElementById('active-session-section');
    const activeSessionInfo = document.getElementById('active-session-info');
    const continueActiveSessionBtn = document.getElementById('continue-active-session-btn');
    const operationsListDiv = document.getElementById('operations-list');
    const noOperationsMessage = document.getElementById('no-operations-message');

    // Filter elements
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const filterOperationSelect = document.getElementById('filter-operation');

    const operationTypes = {
        "OLS": "OPERAÇÃO LEI SECA - OLS", "OCG": "OPERAÇÃO CORTA GIRO - OCG", "2R1V": "DUAS RODAS - 2R1V",
        "4R1V": "QUATRO RODAS - 4R1V", "PV": "PATRULHAMENTO VIÁRIO- PV", "FC": "FISCALIZAÇÃO CONVENCIONAL- FC",
        "FE": "FISCALIZAÇÃO ESCOLAR - FE", "ORS": "OPERAÇÃO ROTA SEGURA - ORS"
    };

    const populateFilterDropdowns = () => {
        for (const [key, value] of Object.entries(operationTypes)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = value;
            filterOperationSelect.appendChild(option);
        }
    };

    const checkForActiveSession = () => {
        const activeOperation = getOperationData();
        if (activeOperation) {
            const operationDate = new Date(activeOperation['data-operacao'] + 'T00:00:00');
            activeSessionInfo.innerHTML = `
                <p><strong>Tipo:</strong> ${operationTypes[activeOperation['operation-type']] || 'N/A'}</p>
                <p><strong>Data:</strong> ${operationDate.toLocaleDateString('pt-BR')}</p>
                <p><strong>Regional:</strong> ${activeOperation.regional}</p>
            `;
            activeSessionSection.classList.remove('hidden');
        }
    };

    const loadRecentOperations = () => {
        const reports = getSavedReports();
        if (reports.length === 0) {
            noOperationsMessage.classList.remove('hidden');
            return;
        }

        const recentOperations = reports.reduce((acc, report) => {
            // Create a unique key for each operation based on its core properties
            const opKey = `${report['data-operacao']}|${report['operation-type']}|${report.regional}`;
            
            // If we haven't seen this operation key before, add it to our accumulator
            if (!acc[opKey]) {
                acc[opKey] = {
                    'data-operacao': report['data-operacao'],
                    'operation-type': report['operation-type'],
                    'regional': report.regional,
                    'chefe-equipe': report['chefe-equipe'] || 'N/A',
                    'matricula': report['matricula'] || 'N/A',
                    'hora-inicial': report['hora-inicial'] || 'N/A',
                    'hora-final': report['hora-final'] || 'N/A',
                    'municipio-acao': report['municipio-acao'] || 'N/A'
                };
            }
            return acc;
        }, {});

        // Sort operations by date, newest first
        let sortedOps = Object.values(recentOperations).sort((a, b) => {
            return new Date(b['data-operacao']) - new Date(a['data-operacao']);
        });

        // Apply filters
        const filters = {
            startDate: document.getElementById('filter-start-date').value,
            endDate: document.getElementById('filter-end-date').value,
            operation: document.getElementById('filter-operation').value,
        };

        if (filters.startDate || filters.endDate || filters.operation) {
            sortedOps = sortedOps.filter(op => {
                const opDate = new Date(op['data-operacao']);
                
                if (filters.startDate) {
                    const startDate = new Date(filters.startDate);
                    if (opDate < startDate) return false;
                }
                if (filters.endDate) {
                    const endDate = new Date(filters.endDate);
                    if (opDate > endDate) return false;
                }
                if (filters.operation && op['operation-type'] !== filters.operation) return false;
                return true;
            });
        }

        operationsListDiv.innerHTML = ''; // Clear previous content

        if (sortedOps.length === 0) {
            noOperationsMessage.classList.remove('hidden');
            return;
        }
        noOperationsMessage.classList.add('hidden');

        sortedOps.slice(0, 20).forEach(opData => { // Show top 20 recent
            const card = document.createElement('div');
            card.className = 'report-card';
            const operationDate = new Date(opData['data-operacao'] + 'T00:00:00');

            card.innerHTML = `
                <div class="report-card-header">
                    <h3>${operationTypes[opData['operation-type']] || 'Operação Desconhecida'}</h3>
                    <span>${operationDate.toLocaleDateString('pt-BR')}</span>
                </div>
                <div class="report-card-body">
                    <p><strong>Regional:</strong> ${opData.regional}</p>
                    <p><strong>Chefe de Equipe:</strong> ${opData['chefe-equipe']}</p>
                </div>
                <div class="report-card-actions">
                    <button class="select-op-btn">Selecionar</button>
                </div>
            `;

            card.querySelector('.select-op-btn').addEventListener('click', () => {
                saveOperationData(opData);
                window.location.href = 'continue-form.html';
            });

            operationsListDiv.appendChild(card);
        });
    };

    continueActiveSessionBtn.addEventListener('click', () => {
        window.location.href = 'continue-form.html';
    });

    applyFiltersBtn.addEventListener('click', loadRecentOperations);
    clearFiltersBtn.addEventListener('click', () => {
        document.getElementById('filters').querySelectorAll('input, select').forEach(el => {
            if (el.tagName === 'SELECT') el.selectedIndex = 0;
            else el.value = '';
        });
        loadRecentOperations();
    });

    // --- INITIALIZATION ---
    populateFilterDropdowns();
    checkForActiveSession();
    loadRecentOperations();
});
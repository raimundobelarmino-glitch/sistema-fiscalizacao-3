import { aggregateReportData } from './report-aggregator.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS ---
    const form = document.getElementById('final-report-form');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const saveReportBtn = document.getElementById('save-final-report-btn');
    const successMessage = document.getElementById('success-message');
    const operationsListContainer = document.getElementById('operations-list');

    // Filter dropdowns
    const filterRegionalSelect = document.getElementById('filter-regional');
    const filterOperationSelect = document.getElementById('filter-operation');
    const infractionsContainer = document.getElementById('infractions-by-article');

    // --- DATA & STATE ---
    const getSavedReports = () => JSON.parse(localStorage.getItem('fiscalizacaoReports') || '[]');
    const FINAL_REPORTS_KEY = 'fiscalizacaoFinalReports';

    const operationTypes = {
        "OLS": "OPERAÇÃO LEI SECA - OLS", "OCG": "OPERAÇÃO CORTA GIRO - OCG", "2R1V": "DUAS RODAS - 2R1V",
        "4R1V": "QUATRO RODAS - 4R1V", "PV": "PATRULHAMENTO VIÁRIO- PV", "FC": "FISCALIZAÇÃO CONVENCIONAL- FC",
        "FE": "FISCALIZAÇÃO ESCOLAR - FE", "ORS": "OPERAÇÃO ROTA SEGURA - ORS"
    };

    // --- UTILITY FUNCTIONS ---
    const populateFilterDropdowns = () => {
        const regionalOptions = ["Porto Velho", "Ariquemes", "Jaru", "Ji-Paraná", "Rolim de Moura", "Cacoal", "Vilhena"];
        const operationOptions = operationTypes;
        regionalOptions.forEach(val => filterRegionalSelect.appendChild(new Option(val, val)));
        for (const [key, value] of Object.entries(operationOptions)) {
            filterOperationSelect.appendChild(new Option(value, key));
        }
    };
    
    const loadAndRenderOperations = () => {
        const allReports = getSavedReports();
        if (allReports.length === 0) {
            operationsListContainer.innerHTML = '<p>Nenhuma operação com cadastros encontrada.</p>';
            return;
        }

        const recentOperations = allReports.reduce((acc, report) => {
            const opKey = `${report['data-operacao']}|${report['operation-type']}|${report.regional}`;
            
            if (!acc[opKey]) {
                acc[opKey] = {
                    'data-operacao': report['data-operacao'],
                    'operation-type': report['operation-type'],
                    'regional': report.regional,
                    'chefe-equipe': report['chefe-equipe'] || 'N/A',
                };
            }
            return acc;
        }, {});

        const sortedOps = Object.values(recentOperations).sort((a, b) => {
            return new Date(b['data-operacao']) - new Date(a['data-operacao']);
        });

        operationsListContainer.innerHTML = '';
        if (sortedOps.length === 0) {
            operationsListContainer.innerHTML = '<p>Nenhuma operação com cadastros encontrada.</p>';
            return;
        }
        
        sortedOps.forEach(opData => {
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
                document.getElementById('filter-start-date').value = opData['data-operacao'];
                document.getElementById('filter-end-date').value = opData['data-operacao'];
                document.getElementById('filter-regional').value = opData.regional;
                document.getElementById('filter-operation').value = opData['operation-type'];
                
                applyFiltersBtn.click(); // Automatically load data for the selected operation
                window.scrollTo({ top: applyFiltersBtn.offsetTop, behavior: 'smooth' });
            });

            operationsListContainer.appendChild(card);
        });
    };

    const setupInfractionInputs = () => {
        // This function will now only create manual-entry fields initially.
        // Auto-calculated fields will be added dynamically.
        infractionsContainer.innerHTML = ''; // Clear previous
        // No manual fields by default anymore.
    }

    const getFilteredData = () => {
        const reports = getSavedReports();
        const filters = {
            startDate: document.getElementById('filter-start-date').value,
            endDate: document.getElementById('filter-end-date').value,
            regional: document.getElementById('filter-regional').value,
            operation: document.getElementById('filter-operation').value,
        };

        return reports.filter(r => {
            if (!r.timestamp) return false;
            const reportDate = new Date(r.timestamp);
            if (filters.startDate) {
                const startDate = new Date(filters.startDate);
                startDate.setMinutes(startDate.getMinutes() + startDate.getTimezoneOffset());
                if (reportDate < startDate) return false;
            }
            if (filters.endDate) {
                 const endDate = new Date(filters.endDate);
                 endDate.setMinutes(endDate.getMinutes() + endDate.getTimezoneOffset());
                 endDate.setHours(23, 59, 59, 999);
                 if(reportDate > endDate) return false;
            }
            if (filters.regional && r.regional !== filters.regional) return false;
            if (filters.operation && r['operation-type'] !== filters.operation) return false;
            return true;
        });
    };

    const processAndFillData = () => {
        form.style.display = 'none';
        saveReportBtn.style.display = 'none';
        successMessage.classList.add('hidden');
        
        const data = getFilteredData();
        form.reset(); 

        // Re-setup manual inputs every time to ensure a clean slate.
        setupInfractionInputs();

        // Set default values for manually editable fields
        document.getElementById('remocao-2-rodas').value = "0";
        document.getElementById('remocao-4-rodas').value = "0";
        document.getElementById('furto-roubo').value = "0";
        document.getElementById('adulteracoes').value = "0";


        if (data.length === 0) {
            alert("Nenhum dado encontrado para os filtros selecionados.");
            return;
        }

        // Use the new aggregator module
        const { counts, infractionCounts, uniqueMunicipios } = aggregateReportData(data);
        
        // Calculate and display non-manual infraction counts
        const sortedInfractions = Object.keys(infractionCounts).sort();

        sortedInfractions.forEach(codigo => {
            const info = infractionCounts[codigo];
            const label = document.createElement('label');
            const input = document.createElement('input');
            const inputId = `infraction-${codigo}`;
            input.type = 'number';
            input.id = inputId;
            input.name = inputId;
            input.value = info.count;
            input.readOnly = true;
            label.textContent = `${info.label}: `;
            label.appendChild(input);
            infractionsContainer.appendChild(label);
        });
        
        document.getElementById('regional').value = filterRegionalSelect.value;
        document.getElementById('acao-desenvolvida').value = filterOperationSelect.options[filterOperationSelect.selectedIndex].text;
        document.getElementById('data').value = `${document.getElementById('filter-start-date').value} a ${document.getElementById('filter-end-date').value}`;
        document.getElementById('municipio').value = [...uniqueMunicipios].join(', ');
        
        document.getElementById('veiculos-2-rodas').value = counts.veiculos2Rodas;
        document.getElementById('veiculos-4-rodas').value = counts.veiculos4Rodas;
        document.getElementById('veiculos-total').value = counts.veiculosTotal;
        
        document.getElementById('abordagem-masculina').value = counts.masculino;
        document.getElementById('abordagem-feminina').value = counts.feminino;
        
        document.getElementById('etilometro-negativo').value = counts.etilometroNegativo;
        document.getElementById('etilometro-infracao').value = counts.etilometroInfracao;
        document.getElementById('etilometro-crime').value = counts.etilometroCrime;
        document.getElementById('recusa-165a').value = counts.recusa165a;
        document.getElementById('recusa-tc-masculino').value = counts.recusaTcMasc;
        document.getElementById('recusa-tc-feminino').value = counts.recusaTcFemi;
        document.getElementById('recusa-total').value = counts.recusa165a + counts.recusaTcMasc + counts.recusaTcFemi;

        document.getElementById('art165-2-rodas').value = counts.art165_2Rodas;
        document.getElementById('art165-4-rodas').value = counts.art165_4Rodas;
        
        document.getElementById('remocao-2-rodas').value = counts.remocao2Rodas;
        document.getElementById('remocao-4-rodas').value = counts.remocao4Rodas;
        
        document.getElementById('total-aits').value = counts.totalAITs;

        document.getElementById('furto-roubo').value = counts.furtoRoubo;

        document.getElementById('idade-0-17').value = counts.idade['0-17'];
        document.getElementById('idade-18-27').value = counts.idade['18-27'];
        document.getElementById('idade-28-37').value = counts.idade['28-37'];
        document.getElementById('idade-38-47').value = counts.idade['38-47'];
        document.getElementById('idade-48-57').value = counts.idade['48-57'];
        document.getElementById('idade-58-mais').value = counts.idade['58+'];
        document.getElementById('idade-total').value = counts.idadeTotal;
        
        document.getElementById('doc-cnh').value = counts.docCnh;
        document.getElementById('doc-crlv').value = counts.docCrlv;

        form.style.display = 'flex';
        saveReportBtn.style.display = 'block';
    };

    const saveFinalReport = () => {
        const finalReportData = {};
        const formData = new FormData(form);
        
        for (const [key, value] of formData.entries()) {
            finalReportData[key] = value;
        }

        // Add filter info for context
        finalReportData.filter_startDate = document.getElementById('filter-start-date').value;
        finalReportData.filter_endDate = document.getElementById('filter-end-date').value;
        finalReportData.filter_regional = document.getElementById('filter-regional').value;
        finalReportData.filter_operation = document.getElementById('filter-operation').value;

        // Add a timestamp and unique ID
        finalReportData.id = `final_${Date.now()}`;
        finalReportData.savedAt = new Date().toISOString();

        // Save to localStorage
        const finalReports = JSON.parse(localStorage.getItem(FINAL_REPORTS_KEY) || '[]');
        finalReports.push(finalReportData);
        localStorage.setItem(FINAL_REPORTS_KEY, JSON.stringify(finalReports));
        
        // Show success message
        form.style.display = 'none';
        saveReportBtn.style.display = 'none';
        successMessage.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };


    // --- EVENT LISTENERS ---
    applyFiltersBtn.addEventListener('click', processAndFillData);
    
    clearFiltersBtn.addEventListener('click', () => {
        document.getElementById('filters').querySelectorAll('input, select').forEach(el => {
            if (el.tagName === 'SELECT') el.selectedIndex = 0;
            else el.value = '';
        });
        form.reset();
        form.style.display = 'none';
        saveReportBtn.style.display = 'none';
        successMessage.classList.add('hidden');
    });

    saveReportBtn.addEventListener('click', saveFinalReport);

    // --- INITIALIZATION ---
    populateFilterDropdowns();
    loadAndRenderOperations();
    setupInfractionInputs();
    form.style.display = 'none';
    saveReportBtn.style.display = 'none';
});
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS ---
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const chartsContainer = document.getElementById('charts-container');
    const noDataMessage = document.getElementById('no-data-message');
    const filterRegionalSelect = document.getElementById('filter-regional');
    const filterOperationSelect = document.getElementById('filter-operation');
    const filterMunicipioSelect = document.getElementById('filter-municipio');

    let charts = []; // To keep track of chart instances

    // --- DATA & STATE ---
    const getSavedReports = () => JSON.parse(localStorage.getItem('fiscalizacaoReports') || '[]');
    const regionalOptions = ["Porto Velho", "Ariquemes", "Jaru", "Ji-Paraná", "Rolim de Moura", "Cacoal", "Vilhena"];
    const operationOptions = {
        "OLS": "OPERAÇÃO LEI SECA - OLS", "OCG": "OPERAÇÃO CORTA GIRO - OCG", "2R1V": "DUAS RODAS - 2R1V",
        "4R1V": "QUATRO RODAS - 4R1V", "PV": "PATRULHAMENTO VIÁRIO- PV", "FC": "FISCALIZAÇÃO CONVENCIONAL- FC",
        "FE": "FISCALIZAÇÃO ESCOLAR - FE", "ORS": "OPERAÇÃO ROTA SEGURA - ORS"
    };
    const municipioOptions = ["Alto Alegre dos Parecis", "Alto Paraíso", "Alvorada d'Oeste", "Ariquemes", "Cabixi", "Cacaulândia", "Cacoal", "Candeias do Jamari", "Castanheiras", "Cerejeiras", "Chupinguaia", "Colorado do Oeste", "Corumbiara", "Campo Novo de Rondônia", "Costa Marques", "Cujubim", "Espigão d'Oeste", "Governador Jorge Teixeira", "Guajará-Mirim", "Itapuã do Oeste", "Ji-Paraná", "Jaru", "Machadinho d'Oeste", "Ministro Andreazza", "Mirante da Serra", "Monte Negro", "Nova Brasilândia d'Oeste", "Nova Mamoré", "Nova União", "Novo Horizonte do Oeste", "Ouro Preto do Oeste", "Parecis", "Pimenta Bueno", "Pimenteiras do Oeste", "Porto Velho", "Presidente Médici", "Primavera de Rondônia", "Rio Crespo", "Rolim de Moura", "Santa Luzia d'Oeste", "São Felipe d'Oeste", "São Francisco do Guaporé", "São Miguel do Guaporé", "Seringueiras", "Serra dos Parecis", "Teixeirópolis", "Theobroma", "Urupá", "Vale do Anari", "Vale do Paraíso", "Vilhena"];

    // --- UTILITY FUNCTIONS ---
    const populateFilters = () => {
        regionalOptions.forEach(val => filterRegionalSelect.appendChild(new Option(val, val)));
        municipioOptions.sort().forEach(val => filterMunicipioSelect.appendChild(new Option(val, val)));
        for (const [key, value] of Object.entries(operationOptions)) {
            filterOperationSelect.appendChild(new Option(value, key));
        }
    };

    const getFilteredData = () => {
        const reports = getSavedReports();
        const filters = {
            startDate: document.getElementById('filter-start-date').value,
            endDate: document.getElementById('filter-end-date').value,
            regional: document.getElementById('filter-regional').value,
            operation: document.getElementById('filter-operation').value,
            municipio: document.getElementById('filter-municipio').value,
        };

        return reports.filter(r => {
            if (!r.timestamp) return false;
            const reportDate = new Date(r.timestamp);
            
            if (filters.startDate) {
                const startDate = new Date(filters.startDate + 'T00:00:00Z');
                if (reportDate < startDate) return false;
            }
            if (filters.endDate) {
                 const endDate = new Date(filters.endDate + 'T23:59:59Z');
                 if(reportDate > endDate) return false;
            }
            if (filters.regional && r.regional !== filters.regional) return false;
            if (filters.operation && r['operation-type'] !== filters.operation) return false;
            if (filters.municipio && r['municipio-acao'] !== filters.municipio) return false;
            return true;
        });
    };
    
    // --- CHARTING FUNCTIONS ---
    const destroyCharts = () => {
        charts.forEach(chart => chart.destroy());
        charts = [];
        chartsContainer.innerHTML = '';
    };

    const createChartContainer = (canvasId, title) => {
        const canvas = document.createElement('canvas');
        canvas.id = canvasId;
        const container = document.createElement('div');
        container.className = 'report-section'; // Use existing class for styling
        const h3 = document.createElement('h2'); // Use h2 for section titles
        h3.textContent = title;
        container.appendChild(h3);
        container.appendChild(canvas);
        chartsContainer.appendChild(container);
        return canvas.getContext('2d');
    };

    const generateCharts = () => {
        destroyCharts();
        const data = getFilteredData();

        if (data.length === 0) {
            noDataMessage.classList.remove('hidden');
            return;
        }
        noDataMessage.classList.add('hidden');

        // Chart 1: Stacked Bar - Test Results by Regional
        generateTestResultsByRegionalChart(data);

        // Chart 2: Doughnut - Test Result Proportions
        generateTestResultProportionsChart(data);

        // Chart 3: Line Chart - Monthly Evolution
        generateMonthlyEvolutionChart(data);
    };
    
    // Specific Chart Generation Functions

    function generateTestResultsByRegionalChart(data) {
        const resultsByRegional = data.reduce((acc, report) => {
            const regional = report.regional || 'Não Informada';
            if (!acc[regional]) {
                acc[regional] = { negativo: 0, infracao: 0, crime: 0, recusa: 0 };
            }
            const resultadoTipo = report['resultado-tipo'];
            if (resultadoTipo === 'Negativo') acc[regional].negativo++;
            if (resultadoTipo === '165A' || resultadoTipo === 'TC') acc[regional].recusa++;
            if (resultadoTipo === '165') {
                const valor = parseFloat(report['resultado-valor']?.replace(',', '.'));
                if (!isNaN(valor)) {
                    if (valor > 0.33) acc[regional].crime++;
                    else acc[regional].infracao++;
                }
            }
            return acc;
        }, {});

        const labels = Object.keys(resultsByRegional).sort();
        if (labels.length === 0) return;

        const datasets = [
            { label: 'Negativo', data: labels.map(l => resultsByRegional[l].negativo), backgroundColor: 'rgba(75, 192, 192, 0.7)' },
            { label: 'Infração', data: labels.map(l => resultsByRegional[l].infracao), backgroundColor: 'rgba(255, 206, 86, 0.7)' },
            { label: 'Crime', data: labels.map(l => resultsByRegional[l].crime), backgroundColor: 'rgba(255, 99, 132, 0.7)' },
            { label: 'Recusa', data: labels.map(l => resultsByRegional[l].recusa), backgroundColor: 'rgba(153, 102, 255, 0.7)' }
        ];

        const ctx = createChartContainer('testResultsByRegional', 'Resultado dos Testes de Etilômetro por Regional');
        charts.push(new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
                plugins: { title: { display: false } }
            }
        }));
    }

    function generateTestResultProportionsChart(data) {
        const results = data.reduce((acc, report) => {
            const resultadoTipo = report['resultado-tipo'];
            if (resultadoTipo === 'Negativo') acc.negativo++;
            if (resultadoTipo === '165A' || resultadoTipo === 'TC') acc.recusa++;
            if (resultadoTipo === '165') {
                const valor = parseFloat(report['resultado-valor']?.replace(',', '.'));
                if (!isNaN(valor)) {
                    if (valor > 0.33) acc.crime++;
                    else acc.infracao++;
                }
            }
            return acc;
        }, { negativo: 0, infracao: 0, crime: 0, recusa: 0 });

        const total = Object.values(results).reduce((sum, val) => sum + val, 0);
        if (total === 0) return;

        const ctx = createChartContainer('testResultProportions', 'Proporção dos Resultados dos Testes');
        charts.push(new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Negativo', 'Infração', 'Crime', 'Recusa'],
                datasets: [{
                    data: [results.negativo, results.infracao, results.crime, results.recusa],
                    backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(153, 102, 255, 0.7)']
                }]
            },
            options: { responsive: true, plugins: { legend: { position: 'top' } } }
        }));
    }

    function generateMonthlyEvolutionChart(data) {
        const monthlyData = data.reduce((acc, report) => {
            const date = new Date(report.timestamp);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!acc[monthKey]) {
                acc[monthKey] = { abordagens: 0, crimes: 0, recusas: 0, negativos: 0, testes: 0 };
            }
            acc[monthKey].abordagens++;
            const resultadoTipo = report.breathalyzer !== 'Não';
            if (resultadoTipo) acc[monthKey].testes++;

            const valor = parseFloat(report['resultado-valor']?.replace(',', '.'));
            if (report['resultado-tipo'] === 'Negativo') acc[monthKey].negativos++;
            if (report['resultado-tipo'] === '165A' || report['resultado-tipo'] === 'TC') acc[monthKey].recusas++;
            if (report['resultado-tipo'] === '165' && !isNaN(valor) && valor > 0.33) {
                acc[monthKey].crimes++;
            }
            return acc;
        }, {});

        const sortedMonths = Object.keys(monthlyData).sort();
        if (sortedMonths.length < 2) return; // Line chart needs at least 2 points

        const labels = sortedMonths.map(m => new Date(m + '-02').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));

        const datasets = [
            { label: 'Abordagens', data: sortedMonths.map(m => monthlyData[m].abordagens), borderColor: '#36A2EB', tension: 0.1, fill: false },
            { label: 'Testes', data: sortedMonths.map(m => monthlyData[m].testes), borderColor: '#FFCE56', tension: 0.1, fill: false },
            { label: 'Crimes Embriaguez', data: sortedMonths.map(m => monthlyData[m].crimes), borderColor: '#FF6384', tension: 0.1, fill: false },
            { label: 'Recusas', data: sortedMonths.map(m => monthlyData[m].recusas), borderColor: '#9966FF', tension: 0.1, fill: false },
            { label: 'Negativos', data: sortedMonths.map(m => monthlyData[m].negativos), borderColor: '#4BC0C0', tension: 0.1, fill: false }
        ];

        const ctx = createChartContainer('monthlyEvolution', 'Evolução Mensal das Abordagens');
        charts.push(new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                plugins: { legend: { position: 'top' } }
            }
        }));
    }

    // --- EVENT LISTENERS ---
    applyFiltersBtn.addEventListener('click', generateCharts);
    clearFiltersBtn.addEventListener('click', () => {
        document.getElementById('filters').querySelectorAll('input, select').forEach(el => {
            if (el.tagName === 'SELECT') el.selectedIndex = 0;
            else el.value = '';
        });
        generateCharts();
    });

    // --- INITIALIZATION ---
    populateFilters();
    generateCharts(); // Initial render
});
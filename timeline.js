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
        municipioOptions.forEach(val => filterMunicipioSelect.appendChild(new Option(val, val)));
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

    const createChart = (canvasId, title, data) => {
        const canvas = document.createElement('canvas');
        canvas.id = canvasId;
        const container = document.createElement('div');
        container.className = 'chart-wrapper';
        const h3 = document.createElement('h3');
        h3.textContent = title;
        container.appendChild(h3);
        container.appendChild(canvas);
        chartsContainer.appendChild(container);
        
        const ctx = canvas.getContext('2d');
        const newChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
        charts.push(newChart);
    };

    const generateCharts = () => {
        destroyCharts();
        const data = getFilteredData();

        if (data.length === 0) {
            noDataMessage.classList.remove('hidden');
            return;
        }
        noDataMessage.classList.add('hidden');

        // Aggregate data by day
        const dailyData = data.reduce((acc, report) => {
            const date = new Date(report.timestamp);
            const year = date.getFullYear();
            const month = date.getMonth(); // 0-11
            const dateKey = `${year}-${String(month).padStart(2, '0')}`; // e.g., "2024-00" for Jan

            if (!acc[dateKey]) {
                acc[dateKey] = { embriaguez: 0, crimeEmbriaguez: 0, inabilitado: 0, remocoes: 0 };
            }

            // Metric 1: Embriaguez (Art. 165)
            if (report['resultado-tipo'] === '165') {
                acc[dateKey].embriaguez++;
            }

            // Metric 2: Crime de Embriaguez
            const valor = parseFloat(report['resultado-valor']?.replace(',', '.'));
            if ((report['resultado-tipo'] === '165' && !isNaN(valor) && valor > 0.33) ||
                 report['criminal-occurrence'] === 'Art. 306 CTB' ||
                 report['resultado-tipo'] === 'TC') {
                acc[dateKey].crimeEmbriaguez++;
            }

            // Metric 3: Inabilitado (Art. 162 I - Cód 501-00)
            const infraData = report['infractions-data'];
            const infraList = (typeof infraData === 'string' && infraData.length > 2) ? JSON.parse(infraData) : [];
            if (infraList.some(inf => inf.codigo === '501-00')) {
                acc[dateKey].inabilitado++;
            }

            // Metric 4: Remoções
            if (report['vehicle-disposition'] === 'Removido') {
                acc[dateKey].remocoes++;
            }
            
            return acc;
        }, {});

        const sortedDates = Object.keys(dailyData).sort();
        const labels = sortedDates.map(dateKey => {
            const [year, monthNum] = dateKey.split('-');
            const date = new Date(year, parseInt(monthNum, 10));
            return date.toLocaleDateString('pt-BR', { year: '2-digit', month: 'short' });
        });
        
        const chartConfigs = [
            { id: 'embriaguezChart', title: 'Total de Casos de Embriaguez (Art. 165)', metric: 'embriaguez' },
            { id: 'crimeEmbriaguezChart', title: 'Crimes de Embriaguez (Art. 306)', metric: 'crimeEmbriaguez' },
            { id: 'inabilitadoChart', title: 'Condutores Inabilitados (Art. 162 I)', metric: 'inabilitado' },
            { id: 'remocoesChart', title: 'Veículos Removidos', metric: 'remocoes' },
        ];

        chartConfigs.forEach(config => {
            const chartData = {
                labels: labels,
                datasets: [{
                    label: config.title,
                    data: sortedDates.map(date => dailyData[date][config.metric]),
                    fill: false,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            };
            createChart(config.id, config.title, chartData);
        });
    };

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
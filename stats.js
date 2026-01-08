import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.js/+esm';
Chart.register(...registerables);

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS ---
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const chartsContainer = document.getElementById('charts-container');
    const noDataMessage = document.getElementById('no-data-message');
    const filterRegionalSelect = document.getElementById('filter-regional');
    const filterOperationSelect = document.getElementById('filter-operation');

    let charts = []; // To keep track of chart instances

    // --- DATA & STATE ---
    const getSavedReports = () => JSON.parse(localStorage.getItem('fiscalizacaoReports') || '[]');

    // --- UTILITY FUNCTIONS ---
    const populateFilterDropdowns = () => {
        const regionalOptions = ["Porto Velho", "Ariquemes", "Jaru", "Ji-Paraná", "Rolim de Moura", "Cacoal", "Vilhena"];
        const operationOptions = {
            "OLS": "OPERAÇÃO LEI SECA - OLS", "OCG": "OPERAÇÃO CORTA GIRO - OCG", "2R1V": "DUAS RODAS - 2R1V",
            "4R1V": "QUATRO RODAS - 4R1V", "PV": "PATRULHAMENTO VIÁRIO- PV", "FC": "FISCALIZAÇÃO CONVENCIONAL- FC",
            "FE": "FISCALIZAÇÃO ESCOLAR - FE", "ORS": "OPERAÇÃO ROTA SEGURA - ORS"
        };
        
        regionalOptions.forEach(val => {
            const option = document.createElement('option');
            option.value = val;
            option.textContent = val;
            filterRegionalSelect.appendChild(option);
        });

        for (const [key, value] of Object.entries(operationOptions)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = value;
            filterOperationSelect.appendChild(option);
        }
    };

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
                // Adjust for timezone to compare dates correctly
                const startDate = new Date(filters.startDate);
                startDate.setMinutes(startDate.getMinutes() + startDate.getTimezoneOffset());
                if (reportDate < startDate) return false;
            }
            if (filters.endDate) {
                 const endDate = new Date(filters.endDate);
                 endDate.setMinutes(endDate.getMinutes() + endDate.getTimezoneOffset());
                 endDate.setHours(23, 59, 59, 999); // Set to end of day
                 if(reportDate > endDate) return false;
            }
            if (filters.regional && r.regional !== filters.regional) return false;
            if (filters.operation && r['operation-type'] !== filters.operation) return false;
            return true;
        });
    };
    
    // --- CHARTING FUNCTIONS ---
    const destroyCharts = () => {
        charts.forEach(chart => chart.destroy());
        charts = [];
        chartsContainer.innerHTML = '';
    };

    const createChart = (canvasId, type, data, options) => {
        const canvas = document.createElement('canvas');
        canvas.id = canvasId;
        const container = document.createElement('div');
        container.className = 'chart-wrapper';
        const title = document.createElement('h3');
        title.textContent = options.plugins.title.text;
        container.appendChild(title);
        container.appendChild(canvas);
        chartsContainer.appendChild(container);
        
        const ctx = canvas.getContext('2d');
        const newChart = new Chart(ctx, { type, data, options });
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

        // Chart 1: Operations by Type
        const opsByType = data.reduce((acc, report) => {
            const opType = report['operation-type'] || 'Não especificado';
            acc[opType] = (acc[opType] || 0) + 1;
            return acc;
        }, {});
        createChart('opsByTypeChart', 'doughnut', {
            labels: Object.keys(opsByType),
            datasets: [{ data: Object.values(opsByType), borderWidth: 1 }]
        }, { responsive: true, plugins: { title: { display: true, text: 'Operações por Tipo' }, legend: { position: 'top' } } });

        // Chart 2: Top 10 Infractions
        const infractions = data.flatMap(r => {
             const infraData = r['infractions-data'];
             return (typeof infraData === 'string' && infraData.length > 2) ? JSON.parse(infraData) : [];
        });
        const infractionCounts = infractions.reduce((acc, {artigo}) => {
            acc[artigo] = (acc[artigo] || 0) + 1;
            return acc;
        }, {});
        const sortedInfractions = Object.entries(infractionCounts).sort(([,a], [,b]) => b - a).slice(0, 10);
        
        if(sortedInfractions.length > 0) {
            createChart('topInfractionsChart', 'bar', {
                labels: sortedInfractions.map(item => `Art. ${item[0]}`),
                datasets: [{ label: 'Quantidade', data: sortedInfractions.map(item => item[1]) }]
            }, { 
                responsive: true, 
                indexAxis: 'y', 
                plugins: { title: { display: true, text: 'Top 10 Infrações' }, legend: { display: false } },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            });
        }
        
        // Chart 3: Reports by Regional
        const byRegional = data.reduce((acc, report) => {
            const regional = report['regional'] || 'Não informada';
            acc[regional] = (acc[regional] || 0) + 1;
            return acc;
        }, {});
        const sortedRegionals = Object.entries(byRegional).sort(([,a], [,b]) => b - a);
        if(sortedRegionals.length > 0) {
            createChart('regionalChart', 'bar', {
                labels: sortedRegionals.map(item => item[0]),
                datasets: [{ label: 'Quantidade', data: sortedRegionals.map(item => item[1]) }]
            }, { 
                responsive: true, 
                plugins: { title: { display: true, text: 'Abordagens por Regional' }, legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            });
        }
        
        // Chart 4: Reports by Gender
        const byGender = data.reduce((acc, report) => {
            const gender = report['driver-gender'] || 'Não informado';
            acc[gender] = (acc[gender] || 0) + 1;
            return acc;
        }, {});
        createChart('genderChart', 'pie', {
            labels: Object.keys(byGender),
            datasets: [{ data: Object.values(byGender) }]
        }, { responsive: true, plugins: { title: { display: true, text: 'Abordagens por Sexo' }, legend: { position: 'top' } } });
        
        // Chart 5: Vehicle Disposition
        const byDisposition = data.reduce((acc, report) => {
            const disposition = report['vehicle-disposition'] || 'N/A';
            if (disposition !== 'N/A') {
                 acc[disposition] = (acc[disposition] || 0) + 1;
            }
            return acc;
        }, {});
         if(Object.keys(byDisposition).length > 0) {
            createChart('dispositionChart', 'pie', {
                labels: Object.keys(byDisposition),
                datasets: [{ data: Object.values(byDisposition) }]
            }, { responsive: true, plugins: { title: { display: true, text: 'Destino do Veículo' }, legend: { position: 'top' } } });
        }

        // Chart 6: Criminal Occurrences
        const byCriminal = data.reduce((acc, report) => {
            const occurrence = report['criminal-occurrence'] || 'Nenhuma';
             if (occurrence !== 'Nenhuma') {
                const key = occurrence === 'Outros' ? report['criminal-occurrence-other'] || 'Outros' : occurrence;
                acc[key] = (acc[key] || 0) + 1;
            }
            return acc;
        }, {});
         if(Object.keys(byCriminal).length > 0) {
            const sortedCriminal = Object.entries(byCriminal).sort(([,a], [,b]) => b - a);
            createChart('criminalChart', 'bar', {
                labels: sortedCriminal.map(item => item[0]),
                datasets: [{ label: 'Quantidade', data: sortedCriminal.map(item => item[1]) }]
            }, { 
                responsive: true, 
                indexAxis: 'y', 
                plugins: { title: { display: true, text: 'Ocorrências Criminais' }, legend: { display: false } },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            });
        }

        // Chart 7: Reports over time (by month)
        const byMonth = data.reduce((acc, report) => {
            const date = new Date(report.timestamp);
            const year = date.getFullYear();
            const month = date.getMonth(); // 0-11
            const key = `${year}-${String(month).padStart(2, '0')}`; // e.g., "2024-00" for Jan
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        
         const sortedMonths = Object.entries(byMonth).sort((a,b) => a[0].localeCompare(b[0]));
         
        if(sortedMonths.length > 1) {
             const monthLabels = sortedMonths.map(item => {
                const [year, monthNum] = item[0].split('-');
                const date = new Date(year, monthNum);
                return date.toLocaleDateString('pt-BR', { year: '2-digit', month: 'short' });
             });

            createChart('timeChart', 'line', {
                labels: monthLabels,
                datasets: [{ label: 'Relatórios', data: sortedMonths.map(item => item[1]), fill: false, tension: 0.1 }]
            }, { 
                responsive: true, 
                plugins: { title: { display: true, text: 'Relatórios ao Longo do Tempo' }, legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            });
        }

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
    populateFilterDropdowns();
    generateCharts(); // Initial render
});
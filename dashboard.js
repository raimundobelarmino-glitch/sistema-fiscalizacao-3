import { Chart, registerables } from 'chart.js';
import html2canvas from 'html2canvas';

Chart.register(...registerables);

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS ---
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const shareDashboardBtn = document.getElementById('share-dashboard-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const filterRegionalSelect = document.getElementById('filter-regional');
    const filterOperationSelect = document.getElementById('filter-operation');
    const filterMunicipioSelect = document.getElementById('filter-municipio');
    const statsCardsContainer = document.getElementById('stats-cards-container');
    const regionalSummaryBody = document.getElementById('regional-summary-body');
    const currentDateSpan = document.getElementById('current-date');

    // Chart canvases
    const genderVehicleCanvas = document.getElementById('genderVehicleChart');
    const infractionsCanvas = document.getElementById('infractionsChart');

    // --- DATA & STATE ---
    let currentFilteredData = [];
    const getSavedReports = () => JSON.parse(localStorage.getItem('fiscalizacaoReports') || '[]');
    let genderVehicleChart, infractionsChart;
    const regionalOptions = ["Porto Velho", "Ariquemes", "Jaru", "Ji-Paraná", "Rolim de Moura", "Cacoal", "Vilhena"];
    const operationOptions = {
        "OLS": "OPERAÇÃO LEI SECA - OLS", "OCG": "OPERAÇÃO CORTA GIRO - OCG", "2R1V": "DUAS RODAS - 2R1V",
        "4R1V": "QUATRO RODAS - 4R1V", "PV": "PATRULHAMENTO VIÁRIO- PV", "FC": "FISCALIZAÇÃO CONVENCIONAL- FC",
        "FE": "FISCALIZAÇÃO ESCOLAR - FE", "ORS": "OPERAÇÃO ROTA SEGURA - ORS"
    };
    const municipioOptions = ["Alto Alegre dos Parecis", "Alto Paraíso", "Alvorada d'Oeste", "Ariquemes", "Cabixi", "Cacaulândia", "Cacoal", "Candeias do Jamari", "Castanheiras", "Cerejeiras", "Chupinguaia", "Colorado do Oeste", "Corumbiara", "Campo Novo de Rondônia", "Costa Marques", "Cujubim", "Espigão d'Oeste", "Governador Jorge Teixeira", "Guajará-Mirim", "Itapuã do Oeste", "Ji-Paraná", "Jaru", "Machadinho d'Oeste", "Ministro Andreazza", "Mirante da Serra", "Monte Negro", "Nova Brasilândia d'Oeste", "Nova Mamoré", "Nova União", "Novo Horizonte do Oeste", "Ouro Preto do Oeste", "Parecis", "Pimenta Bueno", "Pimenteiras do Oeste", "Porto Velho", "Presidente Médici", "Primavera de Rondônia", "Rio Crespo", "Rolim de Moura", "Santa Luzia d'Oeste", "São Felipe d'Oeste", "São Francisco do Guaporé", "São Miguel do Guaporé", "Seringueiras", "Serra dos Parecis", "Teixeirópolis", "Theobroma", "Urupá", "Vale do Anari", "Vale do Paraíso", "Vilhena"];

    // --- UTILITY FUNCTIONS ---
    const populateFilters = () => {
        regionalOptions.forEach(val => {
            filterRegionalSelect.appendChild(new Option(val, val));
        });
        for (const [key, value] of Object.entries(operationOptions)) {
            filterOperationSelect.appendChild(new Option(value, key));
        }
        municipioOptions.forEach(val => {
            filterMunicipioSelect.appendChild(new Option(val, val));
        });
        currentDateSpan.textContent = new Date().toLocaleDateString('pt-BR', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
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
            // Dates in reports are stored as ISO strings (UTC)
            const reportDate = new Date(r.timestamp);
            
            if (filters.startDate) {
                // The input value is a date string like "YYYY-MM-DD". new Date() parses it in local time.
                // To compare correctly with UTC timestamps, we treat the input as UTC.
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

    // --- RENDER FUNCTIONS ---
    const renderStatCards = (data) => {
        const stats = {
            abordagens: data.length,
            infracoes: 0,
            ocorrencias: 0,
            remocoes: 0,
        };

        data.forEach(r => {
            const infraData = r['infractions-data'];
            const infraList = (typeof infraData === 'string' && infraData.length > 2) ? JSON.parse(infraData) : [];
            stats.infracoes += infraList.length;

            if(r['criminal-occurrence'] && r['criminal-occurrence'] !== 'Nenhuma') {
                stats.ocorrencias++;
            }
             if(r['vehicle-disposition'] === 'Removido') {
                stats.remocoes++;
            }
        });

        statsCardsContainer.innerHTML = `
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="stat-card p-4 text-center">
                    <div class="card-icon"><i class="fas fa-users"></i></div>
                    <h3>Abordagens</h3>
                    <div class="stat-number">${stats.abordagens}</div>
                    <p>Total de veículos</p>
                </div>
            </div>
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="stat-card p-4 text-center">
                    <div class="card-icon"><i class="fas fa-clipboard-list"></i></div>
                    <h3>Infrações</h3>
                    <div class="stat-number">${stats.infracoes}</div>
                    <p>Total de autos de infração</p>
                </div>
            </div>
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="stat-card p-4 text-center" style="border-color: var(--danger-color);">
                    <div class="card-icon" style="color: var(--danger-color);"><i class="fas fa-gavel"></i></div>
                    <h3>Ocorrências</h3>
                    <div class="stat-number">${stats.ocorrencias}</div>
                    <p>Registros criminais</p>
                </div>
            </div>
            <div class="col-md-3 col-sm-6 mb-4">
                <div class="stat-card p-4 text-center">
                    <div class="card-icon"><i class="fas fa-truck-moving"></i></div>
                    <h3>Remoções</h3>
                    <div class="stat-number">${stats.remocoes}</div>
                    <p>Veículos removidos ao pátio</p>
                </div>
            </div>
        `;
    };

    const renderCharts = (data) => {
        // Chart 1: Gender & Vehicle Type
        const genderVehicleData = data.reduce((acc, r) => {
            const gender = r['driver-gender'] || 'N/I';
            const vehicle = r['vehicle-type'] === '2 ou 3 rodas' ? 'Moto' : 'Carro';
            if (!acc[gender]) acc[gender] = { Moto: 0, Carro: 0 };
            acc[gender][vehicle]++;
            return acc;
        }, {});
        
        if (genderVehicleChart) genderVehicleChart.destroy();
        genderVehicleChart = new Chart(genderVehicleCanvas, {
            type: 'bar',
            data: {
                labels: ['Masculino', 'Feminino', 'N/I'],
                datasets: [
                    {
                        label: 'Carro',
                        data: ['Masculino', 'Feminino', 'N/I'].map(g => genderVehicleData[g]?.Carro || 0),
                        backgroundColor: 'rgba(26, 35, 126, 0.7)',
                    },
                    {
                        label: 'Moto',
                        data: ['Masculino', 'Feminino', 'N/I'].map(g => genderVehicleData[g]?.Moto || 0),
                         backgroundColor: 'rgba(92, 107, 192, 0.7)',
                    }
                ]
            },
            options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } } }
        });

        // Chart 2: Top Infractions
        const infractionCounts = data.flatMap(r => {
             const infraData = r['infractions-data'];
             return (typeof infraData === 'string' && infraData.length > 2) ? JSON.parse(infraData) : [];
        }).reduce((acc, {artigo}) => {
            const key = `Art. ${artigo}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const sortedInfractions = Object.entries(infractionCounts).sort(([,a], [,b]) => b - a).slice(0, 5);

        if (infractionsChart) infractionsChart.destroy();
        infractionsChart = new Chart(infractionsCanvas, {
            type: 'doughnut',
            data: {
                labels: sortedInfractions.map(item => item[0]),
                datasets: [{
                    label: 'Quantidade',
                    data: sortedInfractions.map(item => item[1]),
                    borderWidth: 1
                }]
            },
            options: { responsive: true, plugins: { legend: { position: 'right' } } }
        });
    };
    
    const renderRegionalSummary = (data) => {
        const summary = data.reduce((acc, r) => {
            const regional = r.regional;
            if (!regional) return acc;

            if (!acc[regional]) {
                acc[regional] = { 
                    acoes: new Set(), 
                    abordagens: 0, 
                    testes: 0,
                    embriaguez: 0, 
                    conduzidos: 0,
                    inabilitado: 0,
                    autuacoes: 0,
                    remocoes: 0,
                    furtoRoubo: 0
                };
            }
            const stats = acc[regional];

            // AÇÕES
            const opKey = `${r['data-operacao']}|${r['operation-type']}`;
            stats.acoes.add(opKey);

            // ABORDAGEM
            stats.abordagens++;

            // TESTE
            if (r['breathalyzer'] === 'Ativo' || r['breathalyzer'] === 'Passivo') {
                stats.testes++;
            }

            // EMBRIAGUEZ
            if (r['resultado-tipo'] === '165') {
                stats.embriaguez++;
            }
            
            // CONDUZIDOS (CRIME)
            const isCrime = 
                (r['resultado-tipo'] === '165' && parseFloat(r['resultado-valor']?.replace(',', '.')) > 0.33) ||
                (r['resultado-tipo'] === 'TC') ||
                (r['criminal-occurrence'] && r['criminal-occurrence'] !== 'Nenhuma');
            if (isCrime) {
                stats.conduzidos++;
            }

            // REMOÇÃO
            if (r['vehicle-disposition'] === 'Removido') {
                stats.remocoes++;
            }

            // FURTO/ROUBO
            if (r['vehicle-recovered'] === true || r['vehicle-recovered'] === "true") {
                stats.furtoRoubo++;
            }

            // AUTUAÇÕES & INABILITADO
            const infraData = r['infractions-data'];
            const infractions = (typeof infraData === 'string' && infraData.length > 2) ? JSON.parse(infraData) : [];
            stats.autuacoes += infractions.length;
            if (infractions.some(inf => inf.codigo === '501-00')) { // Art. 162 I
                stats.inabilitado++;
            }
            
            return acc;
        }, {});

        regionalSummaryBody.innerHTML = '';
        Object.entries(summary).sort((a, b) => a[0].localeCompare(b[0])).forEach(([regional, stats]) => {
            if (stats.abordagens > 0) { // Only show regionals with data
                const row = `
                    <tr>
                        <td><strong>${regional}</strong></td>
                        <td>${stats.acoes.size}</td>
                        <td>${stats.abordagens}</td>
                        <td>${stats.testes}</td>
                        <td>${stats.embriaguez}</td>
                        <td>${stats.conduzidos}</td>
                        <td>${stats.inabilitado}</td>
                        <td>${stats.autuacoes}</td>
                        <td>${stats.remocoes}</td>
                        <td>${stats.furtoRoubo}</td>
                    </tr>
                `;
                regionalSummaryBody.innerHTML += row;
            }
        });
    };


    const updateDashboard = () => {
        const data = getFilteredData();
        currentFilteredData = data;
        renderStatCards(data);
        renderCharts(data);
        renderRegionalSummary(data);
    };

    const applyUrlParams = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const startDate = urlParams.get('startDate');
        const endDate = urlParams.get('endDate');
        const regional = urlParams.get('regional');
        const operation = urlParams.get('operation');
        const municipio = urlParams.get('municipio');

        if(startDate) document.getElementById('filter-start-date').value = startDate;
        if(endDate) document.getElementById('filter-end-date').value = endDate;
        if(regional) document.getElementById('filter-regional').value = regional;
        if(operation) document.getElementById('filter-operation').value = operation;
        if(municipio) document.getElementById('filter-municipio').value = municipio;

        if (startDate || endDate || regional || operation || municipio) {
            updateDashboard();
        }
    };

    const shareDashboardSummary = () => {
        const stats = {
            abordagens: document.querySelector('#stats-cards-container .stat-number').textContent,
            infracoes: document.querySelectorAll('#stats-cards-container .stat-number')[1].textContent,
            ocorrencias: document.querySelectorAll('#stats-cards-container .stat-number')[2].textContent,
            remocoes: document.querySelectorAll('#stats-cards-container .stat-number')[3].textContent,
        };

        let summaryText = `*Resumo do Dashboard de Operações*\n\n`;
        summaryText += `• *Abordagens:* ${stats.abordagens}\n`;
        summaryText += `• *Infrações:* ${stats.infracoes}\n`;
        summaryText += `• *Ocorrências Criminais:* ${stats.ocorrencias}\n`;
        summaryText += `• *Remoções:* ${stats.remocoes}\n\n`;
        summaryText += `*Resumo por Regional:*\n`;

        const regionalRows = regionalSummaryBody.querySelectorAll('tr');
        if (regionalRows.length > 0) {
            regionalRows.forEach(row => {
                const cells = row.querySelectorAll('td');
                summaryText += `• *${cells[0].textContent}:* ${cells[2].textContent} abordagens, ${cells[4].textContent} embriaguez, ${cells[5].textContent} conduzidos, ${cells[8].textContent} remoções\n`;
            });
        } else {
            summaryText += `Nenhum dado por regional para exibir.\n`;
        }

        if (navigator.share) {
            navigator.share({
                title: 'Dashboard de Operações de Fiscalização',
                text: summaryText,
            }).catch(console.error);
        } else {
            const encodedText = encodeURIComponent(summaryText);
            const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
            window.open(whatsappUrl, '_blank');
        }
    };

    const exportDashboardToPdf = async () => {
        // Ensure jspdf is loaded
        if (typeof window.jspdf === 'undefined') {
            alert('A biblioteca PDF não pôde ser carregada. Por favor, recarregue a página.');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const mainContent = document.getElementById('dashboard-content-to-export');
        if (!mainContent) return;

        alert('Gerando PDF... Por favor, aguarde.');
        exportPdfBtn.disabled = true;
        exportPdfBtn.textContent = 'Gerando...';

        try {
            const canvas = await html2canvas(mainContent, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 295; // A4 height in mm
            const imgHeight = canvas.height * imgWidth / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                doc.addPage();
                doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            doc.save(`Dashboard_Fiscalizacao_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);

        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Não foi possível gerar o PDF. Verifique o console para mais detalhes.");
        } finally {
            exportPdfBtn.disabled = false;
            exportPdfBtn.innerHTML = '<i class="fas fa-file-pdf me-2"></i>Exportar PDF';
        }
    };


    // --- EVENT LISTENERS ---
    applyFiltersBtn.addEventListener('click', updateDashboard);
    shareDashboardBtn.addEventListener('click', shareDashboardSummary);
    exportPdfBtn.addEventListener('click', exportDashboardToPdf);
    
    // Add a clear filters button listener if it exists
    const clearFiltersBtn = document.getElementById('clear-filters-btn'); // Assuming one might be added
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
             document.getElementById('filters').querySelectorAll('input, select').forEach(el => {
                if (el.tagName === 'SELECT') el.selectedIndex = 0;
                else el.value = '';
            });
            updateDashboard();
        });
    }

    // --- INITIALIZATION ---
    populateFilters();
    applyUrlParams(); // Check for URL params and apply them
    if (!new URLSearchParams(window.location.search).has('startDate')) {
        updateDashboard(); // Initial render only if no params are present
    }
});
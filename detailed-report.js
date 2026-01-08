document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS ---
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const shareWhatsappBtn = document.getElementById('share-whatsapp-btn');
    const summaryContent = document.getElementById('summary-content');
    const detailedTableBody = document.getElementById('detailed-table-body');
    const noDataMessage = document.getElementById('no-data-message');
    
    // Filter dropdowns
    const filterRegionalSelect = document.getElementById('filter-regional');
    const filterOperationSelect = document.getElementById('filter-operation');

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
        
        regionalOptions.forEach(val => filterRegionalSelect.appendChild(new Option(val, val)));
        for (const [key, value] of Object.entries(operationOptions)) {
            filterOperationSelect.appendChild(new Option(value, key));
        }
    };

    // --- RENDER FUNCTIONS ---
    const renderReports = () => {
        const reports = getSavedReports();
        
        const filters = {
            startDate: document.getElementById('filter-start-date').value,
            endDate: document.getElementById('filter-end-date').value,
            regional: document.getElementById('filter-regional').value,
            operation: document.getElementById('filter-operation').value,
            gender: document.getElementById('filter-gender').value,
        };

        const filtered = reports.filter(r => {
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
            if (filters.gender && r['driver-gender'] !== filters.gender) return false;
            return true;
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (filtered.length === 0) {
            summaryContent.innerHTML = '<p>Nenhum dado encontrado com os filtros aplicados.</p>';
            detailedTableBody.innerHTML = '';
            noDataMessage.classList.remove('hidden');
            exportExcelBtn.classList.add('hidden');
            exportPdfBtn.classList.add('hidden');
            shareWhatsappBtn.classList.add('hidden');
        } else {
            noDataMessage.classList.add('hidden');
            exportExcelBtn.classList.remove('hidden');
            exportPdfBtn.classList.remove('hidden');
            shareWhatsappBtn.classList.remove('hidden');
            renderSummary(filtered);
            renderDetailedTable(filtered);
        }
    };
    
    const renderSummary = (filteredReports) => {
        const totals = {
            abordagens: filteredReports.length,
            masculino: 0,
            feminino: 0,
            crime165: 0,
            outrasInfra: 0,
            removidos: 0,
            liberados: 0,
        };

        filteredReports.forEach(report => {
            if (report['driver-gender'] === 'Masculino') totals.masculino++;
            if (report['driver-gender'] === 'Feminino') totals.feminino++;

            const resultadoTipo = report['resultado-tipo'];
            if (resultadoTipo === '165') {
                const valor = parseFloat(report['resultado-valor']?.replace(',', '.'));
                if (!isNaN(valor) && valor > 0.33) {
                    totals.crime165++;
                }
            } else if (report['criminal-occurrence'] === 'Art. 306 CTB') {
                 totals.crime165++;
            }
            
            const infractionsData = report['infractions-data'];
            const infractions = (typeof infractionsData === 'string' && infractionsData.length > 2) ? JSON.parse(infractionsData) : [];
            totals.outrasInfra += infractions.filter(inf => inf.artigo !== '165').length;

            if (report['vehicle-disposition'] === 'Removido') {
                totals.removidos++;
            } else {
                totals.liberados++;
            }
        });

        summaryContent.innerHTML = `
            <ul>
                <li><strong>Total de Veículos Abordados:</strong> ${totals.abordagens}</li>
                <li><strong>Condutores Masculinos:</strong> ${totals.masculino}</li>
                <li><strong>Condutores Femininos:</strong> ${totals.feminino}</li>
                <li><strong>Total de Crimes Art. 165 (embriaguez):</strong> ${totals.crime165}</li>
                <li><strong>Total de Outras Infrações:</strong> ${totals.outrasInfra}</li>
                <li><strong>Total de Veículos Removidos:</strong> ${totals.removidos}</li>
                <li><strong>Veículos Liberados no Local:</strong> ${totals.liberados}</li>
            </ul>
        `;
    };

    const renderDetailedTable = (filteredReports) => {
        detailedTableBody.innerHTML = '';
        
        filteredReports.forEach(report => {
            const row = document.createElement('tr');
            
            const infractionsData = report['infractions-data'];
            const infractions = (typeof infractionsData === 'string' && infractionsData.length > 2) ? JSON.parse(infractionsData) : [];
            const isArt165 = infractions.some(inf => inf.artigo === '165');
            const outrasInfra = infractions.filter(inf => inf.artigo !== '165').map(inf => `Art. ${inf.artigo}`).join(', ');

            // Get infraction notice numbers
            const autosLavrados = infractions.map(inf => inf.numeroAuto).filter(Boolean).join(', ');

            // Determine if CNH was likely collected
            const cnhRecolhidaArticles = ['165', '165-A', '173', '174', '175', '162 II', '244 I', '244 II', '244 III'];
            const cnhRecolhida = infractions.some(inf => cnhRecolhidaArticles.includes(inf.artigo)) ? 'Sim' : 'Não';

            // Determine if CRLV was likely collected
            const crlvRecolhido = report['vehicle-disposition'] === 'Removido' ? 'Sim' : 'Não';

            row.innerHTML = `
                <td>${report['id-value'] || 'N/A'}</td>
                <td>${new Date(report.timestamp).toLocaleDateString('pt-BR')}</td>
                <td>${report['municipio-acao'] || 'N/A'}</td>
                <td>${report.regional || 'N/A'}</td>
                <td>${report['vehicle-type'] || 'N/A'}</td>
                <td>${report['condutor-nome'] || 'N/A'}</td>
                <td>${report['driver-gender'] || 'N/A'}</td>
                <td>${report['condutor-cpf'] || 'N/A'}</td>
                <td>${report['resultado-teste'] || report['breathalyzer'] || 'N/A'}</td>
                <td>${isArt165 ? '✔️' : '❌'}</td>
                <td>${outrasInfra || 'Nenhuma'}</td>
                <td>${autosLavrados || 'N/A'}</td>
                <td>${cnhRecolhida}</td>
                <td>${crlvRecolhido}</td>
                <td>${report['vehicle-disposition'] || 'N/A'}</td>
                <td>${report.abordador || report['chefe-equipe'] || 'N/A'}</td>
            `;
            detailedTableBody.appendChild(row);
        });
    };

    const exportToExcel = () => {
        TableToExcel.convert(document.getElementById("detailed-table"), {
            name: `Relatorio_Detalhado_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`,
            sheet: {
                name: "Relatório"
            }
        });
    };

    const exportToPdf = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape'
        });

        doc.autoTable({
            html: '#detailed-table',
            headStyles: { fillColor: [0, 86, 179] }, // --primary-color
            startY: 20
        });
        
        doc.text("Relatório Detalhado de Abordagens Veiculares", 14, 15);

        doc.save(`Relatorio_Detalhado_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
    };

    const shareOnWhatsApp = () => {
        const summaryHtml = summaryContent.innerHTML;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = summaryHtml;
        let summaryText = `*Resumo Geral da Fiscalização*\n\n`;
        tempDiv.querySelectorAll('li').forEach(li => {
            summaryText += `• ${li.textContent.replace(/<strong>(.*?)<\/strong>/g, '*$1*')}\n`;
        });

        if (summaryText) {
            const encodedText = encodeURIComponent(summaryText);
            const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
            window.open(whatsappUrl, '_blank');
        } else {
            alert('Não há resumo para compartilhar. Por favor, aplique os filtros primeiro.');
        }
    };

    // --- EVENT LISTENERS ---
    applyFiltersBtn.addEventListener('click', renderReports);

    clearFiltersBtn.addEventListener('click', () => {
        document.getElementById('filters').querySelectorAll('input, select').forEach(el => {
            if (el.tagName === 'SELECT') el.selectedIndex = 0;
            else el.value = '';
        });
        renderReports();
    });

    exportExcelBtn.addEventListener('click', exportToExcel);
    exportPdfBtn.addEventListener('click', exportToPdf);
    shareWhatsappBtn.addEventListener('click', shareOnWhatsApp);
    
    // --- INITIALIZATION ---
    populateFilterDropdowns();
    renderReports(); // Initial render on page load
});
document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS ---
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const shareWhatsappBtn = document.getElementById('share-whatsapp-btn');
    const tableBody = document.getElementById('municipio-table-body');
    const tableFoot = document.getElementById('municipio-table-foot');
    const noDataMessage = document.getElementById('no-data-message');
    const exportButtons = [exportExcelBtn, exportPdfBtn, shareWhatsappBtn];
    
    // Filter dropdowns
    const filterRegionalSelect = document.getElementById('filter-regional');
    const filterOperationSelect = document.getElementById('filter-operation');

    // --- DATA & STATE ---
    const getSavedReports = () => JSON.parse(localStorage.getItem('fiscalizacaoReports') || '[]');

    const regionalOptions = ["Porto Velho", "Ariquemes", "Jaru", "Ji-Paraná", "Rolim de Moura", "Cacoal", "Vilhena"];
    const operationOptions = {
        "OLS": "OPERAÇÃO LEI SECA - OLS", "OCG": "OPERAÇÃO CORTA GIRO - OCG", "2R1V": "DUAS RODAS - 2R1V",
        "4R1V": "QUATRO RODAS - 4R1V", "PV": "PATRULHAMENTO VIÁRIO- PV", "FC": "FISCALIZAÇÃO CONVENCIONAL- FC",
        "FE": "FISCALIZAÇÃO ESCOLAR - FE", "ORS": "OPERAÇÃO ROTA SEGURA - ORS"
    };

    // --- UTILITY FUNCTIONS ---
    const populateFilters = () => {
        regionalOptions.forEach(val => filterRegionalSelect.appendChild(new Option(val, val)));
        for (const [key, value] of Object.entries(operationOptions)) {
            filterOperationSelect.appendChild(new Option(value, key));
        }
    };

    const getFilteredReports = () => {
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
                const startDate = new Date(filters.startDate + 'T00:00:00Z');
                if (reportDate < startDate) return false;
            }
            if (filters.endDate) {
                 const endDate = new Date(filters.endDate + 'T23:59:59Z');
                 if(reportDate > endDate) return false;
            }
            if (filters.regional && r.regional !== filters.regional) return false;
            if (filters.operation && r['operation-type'] !== filters.operation) return false;
            return true;
        });
    };

    // --- RENDER FUNCTIONS ---
    const renderReport = () => {
        const filteredReports = getFilteredReports();
        
        tableBody.innerHTML = '';
        tableFoot.innerHTML = '';
        noDataMessage.classList.add('hidden');
        exportButtons.forEach(btn => btn.classList.add('hidden'));

        if (filteredReports.length === 0) {
            noDataMessage.classList.remove('hidden');
            return;
        }

        const statsByMunicipio = filteredReports.reduce((acc, r) => {
            const municipio = r['municipio-acao'] || 'Não especificado';
            if (!acc[municipio]) {
                acc[municipio] = {
                    municipio,
                    acoes: new Set(),
                    abordagens: 0,
                    testes: 0,
                    embriaguez: 0,
                    conduzidos: 0,
                    pix: 0,
                    inabilitados: 0,
                    autuacoes: 0,
                    remocoes: 0,
                    furtoRoubo: 0,
                };
            }
            const stats = acc[municipio];
            const opKey = `${r['data-operacao']}|${r['operation-type']}|${r.regional}`;
            stats.acoes.add(opKey);
            stats.abordagens++;

            if (r['breathalyzer'] === 'Ativo' || r['breathalyzer'] === 'Passivo') {
                stats.testes++;
            }
            if (r['resultado-tipo'] === '165') {
                stats.embriaguez++;
            }

            const isCrime = 
                (r['resultado-tipo'] === '165' && parseFloat(r['resultado-valor']?.replace(',', '.')) > 0.33) ||
                (r['resultado-tipo'] === 'TC') ||
                (r['criminal-occurrence'] && r['criminal-occurrence'] !== 'Nenhuma');
            if (isCrime) {
                stats.conduzidos++;
            }

            if (r['vehicle-disposition'] === 'Removido') {
                stats.remocoes++;
            }

            if (r['vehicle-recovered'] === true || r['vehicle-recovered'] === "true") {
                stats.furtoRoubo++;
            }

            const infraData = r['infractions-data'];
            const infractions = (typeof infraData === 'string' && infraData.length > 2) ? JSON.parse(infraData) : [];
            stats.autuacoes += infractions.length;

            infractions.forEach(inf => {
                if (inf.codigo === 'PIX') stats.pix++;
                if (inf.codigo === '501-00') stats.inabilitados++; // Art 162 I
            });

            return acc;
        }, {});

        const sortedData = Object.values(statsByMunicipio).sort((a, b) => a.municipio.localeCompare(b.municipio));
        const totals = { ...sortedData[0] }; // init with first object structure
        Object.keys(totals).forEach(key => totals[key] = 0);
        totals.municipio = 'TOTAL';
        totals.acoes = new Set(); // Special handling for unique sets

        sortedData.forEach(stats => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${stats.municipio}</td>
                <td>${stats.acoes.size}</td>
                <td>${stats.abordagens}</td>
                <td>${stats.testes}</td>
                <td>${stats.embriaguez}</td>
                <td>${stats.conduzidos}</td>
                <td>${stats.pix}</td>
                <td>${stats.inabilitados}</td>
                <td>${stats.autuacoes}</td>
                <td>${stats.remocoes}</td>
                <td>${stats.furtoRoubo}</td>
            `;
            tableBody.appendChild(row);

            // Sum up totals
            Object.keys(totals).forEach(key => {
                if (typeof stats[key] === 'number') {
                    totals[key] += stats[key];
                }
            });
            stats.acoes.forEach(a => totals.acoes.add(a));
        });
        
        // Render totals row
        const totalRow = document.createElement('tr');
        totalRow.style.fontWeight = 'bold';
        totalRow.style.backgroundColor = '#e9ecef';
        totalRow.innerHTML = `
            <td>${totals.municipio}</td>
            <td>${totals.acoes.size}</td>
            <td>${totals.abordagens}</td>
            <td>${totals.testes}</td>
            <td>${totals.embriaguez}</td>
            <td>${totals.conduzidos}</td>
            <td>${totals.pix}</td>
            <td>${totals.inabilitados}</td>
            <td>${totals.autuacoes}</td>
            <td>${totals.remocoes}</td>
            <td>${totals.furtoRoubo}</td>
        `;
        tableFoot.appendChild(totalRow);

        exportButtons.forEach(btn => btn.classList.remove('hidden'));
    };

    // --- EXPORT & SHARE ---
    const exportTable = (format) => {
        const table = document.getElementById('municipio-table');
        const filename = `Relatorio_por_Municipio_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}`;

        if (format === 'excel') {
            TableToExcel.convert(table, {
                name: `${filename}.xlsx`,
                sheet: { name: "Relatório" }
            });
        } else if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'landscape' });
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text("Relatório de Ações por Município", 14, 15);

            doc.autoTable({
                html: '#municipio-table',
                startY: 22,
                theme: 'grid',
                headStyles: { 
                    fillColor: [0, 86, 179], 
                    textColor: 255, 
                    fontSize: 8 
                },
                bodyStyles: { 
                    fontSize: 8 
                },
                footStyles: { 
                    fillColor: [233, 236, 239], 
                    textColor: [0,0,0], 
                    fontStyle: 'bold', 
                    fontSize: 8 
                },
                showFoot: 'lastPage',
                margin: { top: 20 },
                 didDrawPage: function (data) {
                    doc.setFontSize(16);
                    doc.setFont('helvetica', 'bold');
                    doc.text("Relatório de Ações por Município", 14, 15);
                 }
            });
            doc.save(`${filename}.pdf`);
        }
    };
    
    const shareSummary = () => {
        const rows = [...tableBody.querySelectorAll('tr'), ...tableFoot.querySelectorAll('tr')];
        let summaryText = `*Resumo por Município*\n\n`;
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            summaryText += `*${cells[0].textContent.trim()}*:\n`;
            summaryText += `• Ações: ${cells[1].textContent.trim()}\n`;
            summaryText += `• Abordagens: ${cells[2].textContent.trim()}\n`;
            summaryText += `• Embriaguez: ${cells[4].textContent.trim()}\n`;
            summaryText += `• Conduzidos: ${cells[5].textContent.trim()}\n`;
            summaryText += `• Autuações: ${cells[8].textContent.trim()}\n`;
            summaryText += `• Remoções: ${cells[9].textContent.trim()}\n\n`;
        });
        
        const encodedText = encodeURIComponent(summaryText);
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
        window.open(whatsappUrl, '_blank');
    };

    // --- EVENT LISTENERS ---
    applyFiltersBtn.addEventListener('click', renderReport);
    clearFiltersBtn.addEventListener('click', () => {
        document.getElementById('filters').querySelectorAll('input, select').forEach(el => {
            if (el.tagName === 'SELECT') el.selectedIndex = 0;
            else el.value = '';
        });
        renderReport();
    });

    exportExcelBtn.addEventListener('click', () => exportTable('excel'));
    exportPdfBtn.addEventListener('click', () => exportTable('pdf'));
    shareWhatsappBtn.addEventListener('click', shareSummary);
    
    // --- INITIALIZATION ---
    populateFilters();
    renderReport();
});
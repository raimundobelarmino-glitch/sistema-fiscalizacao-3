document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS ---
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const reportContentDiv = document.getElementById('report-content');
    const copyReportBtn = document.getElementById('copy-report-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const shareWhatsappBtn = document.getElementById('share-whatsapp-btn');

    // Filter dropdowns
    const filterRegionalSelect = document.getElementById('filter-regional');
    const filterOperationSelect = document.getElementById('filter-operation');
    const filterMunicipioSelect = document.getElementById('filter-municipio');

    // --- DATA & STATE ---
    const FINAL_REPORTS_KEY = 'fiscalizacaoFinalReports';
    const getFinalReports = () => JSON.parse(localStorage.getItem(FINAL_REPORTS_KEY) || '[]');
    let currentReportText = '';
    let currentReportHTML = '';

    // --- UTILITY FUNCTIONS ---
    const populateFilterDropdowns = () => {
        const regionalOptions = ["Porto Velho", "Ariquemes", "Jaru", "Ji-Paraná", "Rolim de Moura", "Cacoal", "Vilhena"];
        const operationOptions = {
            "OLS": "OPERAÇÃO LEI SECA - OLS", "OCG": "OPERAÇÃO CORTA GIRO - OCG", "2R1V": "DUAS RODAS - 2R1V",
            "4R1V": "QUATRO RODAS - 4R1V", "PV": "PATRULHAMENTO VIÁRIO- PV", "FC": "FISCALIZAÇÃO CONVENCIONAL- FC",
            "FE": "FISCALIZAÇÃO ESCOLAR - FE", "ORS": "OPERAÇÃO ROTA SEGURA - ORS"
        };
        const municipioOptions = ["Alto Alegre dos Parecis", "Alto Paraíso", "Alvorada d'Oeste", "Ariquemes", "Cabixi", "Cacaulândia", "Cacoal", "Candeias do Jamari", "Castanheiras", "Cerejeiras", "Chupinguaia", "Colorado do Oeste", "Corumbiara", "Campo Novo de Rondônia", "Costa Marques", "Cujubim", "Espigão d'Oeste", "Governador Jorge Teixeira", "Guajará-Mirim", "Itapuã do Oeste", "Ji-Paraná", "Jaru", "Machadinho d'Oeste", "Ministro Andreazza", "Mirante da Serra", "Monte Negro", "Nova Brasilândia d’Oeste", "Nova Mamoré", "Nova União", "Novo Horizonte do Oeste", "Ouro Preto do Oeste", "Parecis", "Pimenta Bueno", "Pimenteiras do Oeste", "Porto Velho", "Presidente Médici", "Primavera de Rondônia", "Rio Crespo", "Rolim de Moura", "Santa Luzia d’Oeste", "São Felipe d’Oeste", "São Francisco do Guaporé", "São Miguel do Guaporé", "Seringueiras", "Serra dos Parecis", "Teixeirópolis", "Theobroma", "Urupá", "Vale do Anari", "Vale do Paraíso", "Vilhena"];
        
        regionalOptions.forEach(val => filterRegionalSelect.appendChild(new Option(val, val)));
        for (const [key, value] of Object.entries(operationOptions)) {
            filterOperationSelect.appendChild(new Option(value, key));
        }
        municipioOptions.forEach(val => filterMunicipioSelect.appendChild(new Option(val, val)));
    };

    const getFilteredData = () => {
        const reports = getFinalReports();
        const filters = {
            startDate: document.getElementById('filter-start-date').value,
            endDate: document.getElementById('filter-end-date').value,
            regional: document.getElementById('filter-regional').value,
            operation: document.getElementById('filter-operation').value,
            municipio: document.getElementById('filter-municipio').value,
        };

        return reports.filter(r => {
            if (!r.savedAt) return false;
            // The date in the final report is just a string, not a timestamp. Let's use filter_startDate
            const reportDate = new Date(r.filter_startDate + 'T00:00:00Z');
            
            if (filters.startDate) {
                const startDate = new Date(filters.startDate + 'T00:00:00Z');
                if (reportDate < startDate) return false;
            }
            if (filters.endDate) {
                 const endDate = new Date(filters.endDate + 'T23:59:59Z');
                 // Check if the operation START date is within the filter end date
                 if(reportDate > endDate) return false;
            }
            if (filters.regional && r.regional !== filters.regional) return false;
            if (filters.operation) {
                // Find the key for the operation name in the options
                const opKey = Object.keys(operationOptions).find(key => operationOptions[key] === r['acao-desenvolvida']);
                if (opKey !== filters.operation) return false;
            }
            if (filters.municipio && r.municipio && !r.municipio.includes(filters.municipio)) return false;
            return true;
        });
    };

    const generateAndRenderReport = () => {
        const data = getFilteredData();

        if (data.length === 0) {
            reportContentDiv.innerHTML = '<p>Nenhum relatório finalizado encontrado com os filtros selecionados.</p>';
            copyReportBtn.classList.add('hidden');
            exportPdfBtn.classList.add('hidden');
            exportExcelBtn.classList.add('hidden');
            shareWhatsappBtn.classList.add('hidden');
            currentReportText = '';
            currentReportHTML = '';
            return;
        }

        const totals = {
            abordagens: 0,
            embriaguez: 0,
            inabilitado: 0,
            remocao: 0,
            furtoRoubo: 0,
        };

        const uniqueOperations = new Set();
        const uniqueRegionals = new Set();
        const uniqueMunicipios = new Set();
        const pixEntries = [];

        data.forEach(report => {
            uniqueOperations.add(report['acao-desenvolvida']);
            uniqueRegionals.add(report.regional);
            if(report.municipio) uniqueMunicipios.add(report.municipio);

            totals.abordagens += parseInt(report['veiculos-total'] || 0, 10);
            
            const embriaguezTests = (parseInt(report['etilometro-infracao'] || 0, 10) + parseInt(report['etilometro-crime'] || 0, 10));
            totals.embriaguez += embriaguezTests;
            
            totals.remocao += parseInt(report['remocao-2-rodas'] || 0, 10) + parseInt(report['remocao-4-rodas'] || 0, 10);
            totals.furtoRoubo += parseInt(report['furto-roubo'] || 0, 10);
            
            // Correctly find the key for Art. 162 I (code 501-00)
            const inabilitadoKey = 'infraction-501-00';
            if (report[inabilitadoKey]) {
                totals.inabilitado += parseInt(report[inabilitadoKey] || 0, 10);
            }

            const pixKey = Object.keys(report).find(k => k.includes('infraction-PIX'));
            if (pixKey && report[pixKey]) {
                pixEntries.push(report[pixKey]);
            }
        });

        // --- RENDER HTML ---
        let html = '<ul>';
        html += `<li><strong>Tipos de Operação:</strong> ${[...uniqueOperations].join(', ')}</li>`;
        html += `<li><strong>Regionais:</strong> ${[...uniqueRegionals].join(', ')}</li>`;
        if (uniqueMunicipios.size > 0) {
            html += `<li><strong>Municípios/Distritos:</strong> ${[...uniqueMunicipios].join(', ')}</li>`;
        }
        html += `<hr>`;
        html += `<li><strong>Quantidade de Abordagens:</strong> ${totals.abordagens}</li>`;
        html += `<li><strong>Total de Embriaguez (Resultados > 0,04 mg/L):</strong> ${totals.embriaguez}</li>`;
        html += `<li><strong>Total de Inabilitados (Art. 162 I):</strong> ${totals.inabilitado}</li>`;
        html += `<li><strong>Total de Remoções:</strong> ${totals.remocao}</li>`;
        html += `<li><strong>Total de Veículos Recuperados (Furto/Roubo):</strong> ${totals.furtoRoubo}</li>`;
        if (pixEntries.length > 0) {
             html += `<li><strong>Registros PIX:</strong> ${pixEntries.join('; ')}</li>`;
        }
        html += '</ul>';
        reportContentDiv.innerHTML = html;
        currentReportHTML = html;

        // --- GENERATE TEXT FOR CLIPBOARD ---
        currentReportText = `*RELATÓRIO GERAL DE OPERAÇÕES*\n`;
        currentReportText += `--------------------------------------\n`;
        currentReportText += `*Tipos de Operação:* ${[...uniqueOperations].join(', ')}\n`;
        currentReportText += `*Regionais:* ${[...uniqueRegionals].join(', ')}\n`;
        if (uniqueMunicipios.size > 0) {
            currentReportText += `*Municípios/Distritos:* ${[...uniqueMunicipios].join(', ')}\n`;
        }
        currentReportText += `--------------------------------------\n`;
        currentReportText += `*Quantidade de Abordagens:* ${totals.abordagens}\n`;
        currentReportText += `*Total de Embriaguez (Resultados > 0,04 mg/L):* ${totals.embriaguez}\n`;
        currentReportText += `*Total de Inabilitados (Art. 162 I):* ${totals.inabilitado}\n`;
        currentReportText += `*Total de Remoções:* ${totals.remocao}\n`;
        currentReportText += `*Total de Veículos Recuperados (Furto/Roubo):* ${totals.furtoRoubo}\n`;
        if (pixEntries.length > 0) {
            currentReportText += `*Registros PIX:* ${pixEntries.join('; ')}\n`;
        }
        currentReportText += `--------------------------------------\n`;

        copyReportBtn.classList.remove('hidden');
        exportPdfBtn.classList.remove('hidden');
        exportExcelBtn.classList.remove('hidden');
        shareWhatsappBtn.classList.remove('hidden');
    };

    const copyToClipboard = () => {
        if (!currentReportText) return;
        navigator.clipboard.writeText(currentReportText).then(() => {
            const originalText = copyReportBtn.textContent;
            copyReportBtn.textContent = 'Copiado!';
            copyReportBtn.disabled = true;
            setTimeout(() => {
                copyReportBtn.textContent = 'Copiar Texto';
                copyReportBtn.disabled = false;
            }, 2000);
        }).catch(err => {
            console.error('Falha ao copiar: ', err);
            alert('Não foi possível copiar o relatório.');
        });
    };

    const exportToExcel = () => {
        if (!currentReportHTML) return;
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = currentReportHTML;
        
        const table = document.createElement('table');
        table.style.display = 'none';
        const tbody = table.createTBody();
        const header = table.createTHead().insertRow();
        header.insertCell().textContent = "Item";
        header.insertCell().textContent = "Valor";

        tempDiv.querySelectorAll('li').forEach(li => {
            const row = tbody.insertRow();
            const strongText = li.querySelector('strong')?.textContent || '';
            const valueText = li.textContent.replace(strongText, '').trim();

            row.insertCell().textContent = strongText.replace(':', '');
            row.insertCell().textContent = valueText;
        });

        document.body.appendChild(table);
        TableToExcel.convert(table, {
            name: `Relatorio_Geral_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`,
            sheet: { name: "Resumo" }
        });
        document.body.removeChild(table);
    };

    const exportToPdf = () => {
        if (!currentReportText) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);

        const title = "Relatório Geral de Operações";
        const lines = doc.splitTextToSize(currentReportText.replace(/\*/g, ''), 180);
        
        doc.text(title, 14, 15);
        doc.text(lines, 14, 25);
        
        doc.save(`Relatorio_Geral_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
    };

    const shareOnWhatsApp = () => {
        if (!currentReportText) return;
        const encodedText = encodeURIComponent(currentReportText);
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
        window.open(whatsappUrl, '_blank');
    };

    // --- EVENT LISTENERS ---
    applyFiltersBtn.addEventListener('click', generateAndRenderReport);
    
    clearFiltersBtn.addEventListener('click', () => {
        document.getElementById('filters').querySelectorAll('input, select').forEach(el => {
            if (el.tagName === 'SELECT') el.selectedIndex = 0;
            else el.value = '';
        });
        generateAndRenderReport();
    });

    copyReportBtn.addEventListener('click', copyToClipboard);
    exportPdfBtn.addEventListener('click', exportToPdf);
    exportExcelBtn.addEventListener('click', exportToExcel);
    shareWhatsappBtn.addEventListener('click', shareOnWhatsApp);

    // --- INITIALIZATION ---
    populateFilterDropdowns();
    generateAndRenderReport(); // Initial render
});
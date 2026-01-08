document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS ---
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const shareWhatsappBtn = document.getElementById('share-whatsapp-btn');
    const reportsContainer = document.getElementById('reports-by-operation-container');
    const noDataMessage = document.getElementById('no-data-message');
    const exportButtons = [exportExcelBtn, exportPdfBtn, shareWhatsappBtn];
    
    // Filter dropdowns
    const filterRegionalSelect = document.getElementById('filter-regional');
    const filterMunicipioSelect = document.getElementById('filter-municipio');

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
    };

    const getFilteredReports = () => {
        const reports = getSavedReports();
        const filters = {
            startDate: document.getElementById('filter-start-date').value,
            endDate: document.getElementById('filter-end-date').value,
            regional: document.getElementById('filter-regional').value,
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
            if (filters.municipio && r['municipio-acao'] !== filters.municipio) return false;
            return true;
        });
    };

    // --- RENDER FUNCTIONS ---
    const renderReport = () => {
        const filteredReports = getFilteredReports();
        
        reportsContainer.innerHTML = '';
        noDataMessage.classList.add('hidden');
        exportButtons.forEach(btn => btn.classList.add('hidden'));

        if (filteredReports.length === 0) {
            noDataMessage.classList.remove('hidden');
            return;
        }

        const reportsByOperation = filteredReports.reduce((acc, r) => {
            const opTypeKey = r['operation-type'] || 'NA';
            if (!acc[opTypeKey]) {
                acc[opTypeKey] = [];
            }
            acc[opTypeKey].push(r);
            return acc;
        }, {});

        const grandTotals = {
            acoes: new Set(), abordagens: 0, testes: 0, embriaguez: 0, conduzidos: 0, pix: 0,
            inabilitados: 0, autuacoes: 0, remocoes: 0, furtoRoubo: 0
        };

        const sortedOpKeys = Object.keys(reportsByOperation).sort((a, b) => (operationOptions[a] || a).localeCompare(operationOptions[b] || b));
        
        sortedOpKeys.forEach(opTypeKey => {
            const opReports = reportsByOperation[opTypeKey];
            const opName = operationOptions[opTypeKey] || 'Operação Não Especificada';
            
            const opContainer = document.createElement('div');
            opContainer.className = 'operation-report-group';
            opContainer.style.marginBottom = '2.5rem';

            const title = document.createElement('h3');
            title.textContent = `Balanço - ${opName}`;
            title.style.color = 'var(--primary-color)';
            title.style.borderBottom = '2px solid var(--primary-color)';
            title.style.paddingBottom = '0.5rem';
            title.style.marginBottom = '1rem';
            opContainer.appendChild(title);
            
            const tableContainer = document.createElement('div');
            tableContainer.className = 'table-container';

            const table = document.createElement('table');
            table.className = 'municipio-table'; // Reuse styling
            table.id = `table-${opTypeKey}`;

            table.innerHTML = `
                <thead>
                    <tr>
                        <th>MUNICÍPIO</th><th>AÇÕES</th><th>ABORDAGEM</th><th>TESTE</th>
                        <th>EMBRIAGUEZ</th><th>CONDUZIDOS (CRIME)</th><th>PIX</th>
                        <th>INABILITADO</th><th>AUTUAÇÕES</th><th>REMOÇÃO</th><th>FURTO/ROUBO</th>
                    </tr>
                </thead>
                <tbody></tbody>
                <tfoot></tfoot>
            `;
            tableContainer.appendChild(table);
            opContainer.appendChild(tableContainer);
            reportsContainer.appendChild(opContainer);

            const tableBody = table.querySelector('tbody');
            const tableFoot = table.querySelector('tfoot');

            const statsByMunicipio = opReports.reduce((acc, r) => {
                const municipio = r['municipio-acao'] || 'Não especificado';
                if (!acc[municipio]) {
                    acc[municipio] = {
                        municipio, acoes: new Set(), abordagens: 0, testes: 0, embriaguez: 0, conduzidos: 0, pix: 0,
                        inabilitados: 0, autuacoes: 0, remocoes: 0, furtoRoubo: 0,
                    };
                }
                const stats = acc[municipio];
                const opKey = `${r['data-operacao']}|${r.regional}`;
                stats.acoes.add(opKey);
                stats.abordagens++;

                if (r['breathalyzer'] === 'Ativo' || r['breathalyzer'] === 'Passivo') stats.testes++;
                if (r['resultado-tipo'] === '165') stats.embriaguez++;

                const isCrime = 
                    (r['resultado-tipo'] === '165' && parseFloat(r['resultado-valor']?.replace(',', '.')) > 0.33) ||
                    (r['resultado-tipo'] === 'TC') ||
                    (r['criminal-occurrence'] && r['criminal-occurrence'] !== 'Nenhuma');
                if (isCrime) stats.conduzidos++;

                if (r['vehicle-disposition'] === 'Removido') stats.remocoes++;
                if (r['vehicle-recovered'] === true || r['vehicle-recovered'] === "true") stats.furtoRoubo++;

                const infraData = r['infractions-data'];
                const infractions = (typeof infraData === 'string' && infraData.length > 2) ? JSON.parse(infraData) : [];
                stats.autuacoes += infractions.length;

                infractions.forEach(inf => {
                    if (inf.codigo === 'PIX') stats.pix++;
                    if (inf.codigo === '501-00') stats.inabilitados++; // Art 162 I
                });

                return acc;
            }, {});

            const sortedMunicipioData = Object.values(statsByMunicipio).sort((a, b) => a.municipio.localeCompare(b.municipio));
            
            const opTotals = { ...sortedMunicipioData[0] }; // init with first object structure
            Object.keys(opTotals).forEach(key => opTotals[key] = 0);
            opTotals.municipio = 'TOTAL';
            opTotals.acoes = new Set();
            
            sortedMunicipioData.forEach(stats => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${stats.municipio}</td><td>${stats.acoes.size}</td><td>${stats.abordagens}</td>
                    <td>${stats.testes}</td><td>${stats.embriaguez}</td><td>${stats.conduzidos}</td>
                    <td>${stats.pix}</td><td>${stats.inabilitados}</td><td>${stats.autuacoes}</td>
                    <td>${stats.remocoes}</td><td>${stats.furtoRoubo}</td>
                `;
                tableBody.appendChild(row);
                
                Object.keys(opTotals).forEach(key => {
                    if (typeof stats[key] === 'number') opTotals[key] += stats[key];
                });
                stats.acoes.forEach(a => opTotals.acoes.add(a));
                
            });

            const totalRow = document.createElement('tr');
            totalRow.style.fontWeight = 'bold';
            totalRow.style.backgroundColor = '#e9ecef';
            totalRow.innerHTML = `
                <td>${opTotals.municipio}</td><td>${opTotals.acoes.size}</td><td>${opTotals.abordagens}</td>
                <td>${opTotals.testes}</td><td>${opTotals.embriaguez}</td><td>${opTotals.conduzidos}</td>
                <td>${opTotals.pix}</td><td>${opTotals.inabilitados}</td><td>${opTotals.autuacoes}</td>
                <td>${opTotals.remocoes}</td><td>${opTotals.furtoRoubo}</td>
            `;
            tableFoot.appendChild(totalRow);

            // Add to grand totals
             Object.keys(grandTotals).forEach(key => {
                if (typeof opTotals[key] === 'number') grandTotals[key] += opTotals[key];
            });
            opTotals.acoes.forEach(a => grandTotals.acoes.add(a));
        });

        // Add Grand Total section at the end
        const grandTotalContainer = document.createElement('div');
        grandTotalContainer.className = 'operation-report-group';
        grandTotalContainer.innerHTML = `
            <h3 style="color: var(--danger-color); border-bottom: 2px solid var(--danger-color); padding-bottom: 0.5rem; margin-top: 2rem; margin-bottom: 1rem;">Balanço Geral (Todas Operações)</h3>
            <div class="table-container">
                <table id="grand-total-table" class="municipio-table">
                    <thead>
                        <tr>
                            <th>DESCRIÇÃO</th><th>AÇÕES</th><th>ABORDAGEM</th><th>TESTE</th>
                            <th>EMBRIAGUEZ</th><th>CONDUZIDOS (CRIME)</th><th>PIX</th>
                            <th>INABILITADO</th><th>AUTUAÇÕES</th><th>REMOÇÃO</th><th>FURTO/ROUBO</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="font-weight: bold; background-color: #e9ecef;">
                            <td>TOTAL GERAL</td>
                            <td>${grandTotals.acoes.size}</td><td>${grandTotals.abordagens}</td>
                            <td>${grandTotals.testes}</td><td>${grandTotals.embriaguez}</td><td>${grandTotals.conduzidos}</td>
                            <td>${grandTotals.pix}</td><td>${grandTotals.inabilitados}</td><td>${grandTotals.autuacoes}</td>
                            <td>${grandTotals.remocoes}</td><td>${grandTotals.furtoRoubo}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        reportsContainer.appendChild(grandTotalContainer);

        exportButtons.forEach(btn => btn.classList.remove('hidden'));
    };

    // --- EXPORT & SHARE ---
    const exportTable = (format) => {
        const docTitle = `Relatorio_por_Operacao_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}`;
        
        if (format === 'excel') {
            const finalTable = document.createElement('table');
            finalTable.id = 'temp-export-table';
            finalTable.style.borderCollapse = 'collapse'; // for better styling
            
            reportsContainer.querySelectorAll('.operation-report-group').forEach(group => {
                const title = group.querySelector('h3').textContent;
                const titleRow = finalTable.insertRow();
                const titleCell = titleRow.insertCell();
                titleCell.colSpan = 11;
                titleCell.textContent = title;
                titleCell.style.fontWeight = 'bold';
                titleCell.style.fontSize = '1.2em';
                titleCell.style.backgroundColor = '#e0e0e0';
                titleCell.style.border = '1px solid #999';

                const table = group.querySelector('table');
                if (table) {
                    const headerRow = finalTable.insertRow();
                    [...table.querySelectorAll('thead tr th')].forEach(th => {
                        const cell = headerRow.insertCell();
                        cell.textContent = th.textContent;
                        cell.style.fontWeight = 'bold';
                        cell.style.backgroundColor = '#f2f2f2';
                        cell.style.border = '1px solid #ccc';
                    });

                    [...table.querySelectorAll('tbody tr')].forEach(tr => {
                         const bodyRow = finalTable.insertRow();
                         [...tr.querySelectorAll('td')].forEach(td => {
                             const cell = bodyRow.insertCell();
                             cell.textContent = td.textContent;
                             cell.style.border = '1px solid #ccc';
                         });
                    });

                    [...table.querySelectorAll('tfoot tr')].forEach(tr => {
                         const footRow = finalTable.insertRow();
                         [...tr.querySelectorAll('td')].forEach(td => {
                             const cell = footRow.insertCell();
                             cell.textContent = td.textContent;
                             cell.style.fontWeight = 'bold';
                             cell.style.backgroundColor = '#f2f2f2';
                             cell.style.border = '1px solid #ccc';
                         });
                    });
                }
                const spacerRow = finalTable.insertRow(); // spacer row
                spacerRow.insertCell().style.height = '20px';
            });

            document.body.appendChild(finalTable);
            TableToExcel.convert(finalTable, { name: `${docTitle}.xlsx`, sheet: { name: "Relatório" } });
            document.body.removeChild(finalTable);

        } else if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'landscape' });

            doc.setFontSize(18);
            doc.text("Relatório de Ações por Tipo de Operação", 14, 15);

            let finalY = 25;

            const tablesToExport = reportsContainer.querySelectorAll('.operation-report-group table');

            tablesToExport.forEach(table => {
                const title = table.closest('.operation-report-group').querySelector('h3').textContent;

                // Check if there is enough space for the title and a few rows, otherwise add new page
                if (finalY > 185) { 
                    doc.addPage();
                    finalY = 15;
                }

                doc.setFontSize(14);
                doc.text(title, 14, finalY);
                finalY += 7;

                doc.autoTable({
                    html: table,
                    startY: finalY,
                    theme: 'grid',
                    headStyles: { fillColor: [0, 86, 179], textColor: 255 },
                    footStyles: { fillColor: [233, 236, 239], textColor: [0, 0, 0], fontStyle: 'bold' },
                    didDrawPage: (data) => {
                        // Reset Y position after page break
                        finalY = data.cursor.y;
                    }
                });
                
                finalY = doc.previousAutoTable.finalY + 15;
            });
            
            doc.save(`${docTitle}.pdf`);
        }
    };
    
    const shareSummary = () => {
        let summaryText = `*Resumo por Tipo de Operação*\n\n`;
        
        reportsContainer.querySelectorAll('.operation-report-group').forEach(group => {
            const title = group.querySelector('h3').textContent;
            const table = group.querySelector('table');
            if (!table) return;

            summaryText += `*${title}*\n`;
            const totalRow = table.querySelector('tfoot tr');
            if (totalRow) {
                 const cells = totalRow.querySelectorAll('td');
                 summaryText += `• Ações: ${cells[1].textContent.trim()}\n`;
                 summaryText += `• Abordagens: ${cells[2].textContent.trim()}\n`;
                 summaryText += `• Autuações: ${cells[8].textContent.trim()}\n`;
                 summaryText += `• Remoções: ${cells[9].textContent.trim()}\n\n`;
            } else if (table.id === 'grand-total-table') {
                 const cells = table.querySelectorAll('tbody td');
                 summaryText += `• Ações: ${cells[1].textContent.trim()}\n`;
                 summaryText += `• Abordagens: ${cells[2].textContent.trim()}\n`;
                 summaryText += `• Autuações: ${cells[8].textContent.trim()}\n`;
                 summaryText += `• Remoções: ${cells[9].textContent.trim()}\n\n`;
            }
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
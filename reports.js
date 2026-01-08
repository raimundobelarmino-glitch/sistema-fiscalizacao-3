document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS ---
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const filteredReportsContainer = document.getElementById('filtered-reports-container');
    const aggregatedContent = document.getElementById('aggregated-content');
    const aggregatedActions = document.getElementById('aggregated-actions');
    
    // Filter dropdowns
    const filterRegionalSelect = document.getElementById('filter-regional');
    const filterOperationSelect = document.getElementById('filter-operation');

    // --- DATA & STATE ---
    const getSavedReports = () => JSON.parse(localStorage.getItem('fiscalizacaoReports') || '[]');

    // --- UTILITY FUNCTIONS ---
    const populateFilterDropdowns = () => {
        const regionalOptions = ["Porto Velho", "Ariquemes", "Jaru", "Ji-Paraná", "Rolim de Moura", "Cacoal", "Vilhena"];
        const operationOptions = {
            "OLS": "OPERAÇÃO LEI SECA - OLS",
            "OCG": "OPERAÇÃO CORTA GIRO - OCG",
            "2R1V": "DUAS RODAS - 2R1V",
            "4R1V": "QUATRO RODAS - 4R1V",
            "PV": "PATRULHAMENTO VIÁRIO- PV",
            "FC": "FISCALIZAÇÃO CONVENCIONAL- FC",
            "FE": "FISCALIZAÇÃO ESCOLAR - FE",
            "ORS": "OPERAÇÃO ROTA SEGURA - ORS"
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

    const generateReportText = (data) => {
        const regional = data['regional'] || 'Não informado';
        const municipioAcao = data['municipio-acao'] || 'Não informado';
        const operation = data['operation-type'] || 'Não informado';
        const idType = data['id-type'] || 'Não informado';
        const idValue = data['id-value'] ? data['id-value'].toUpperCase() : 'Não informado';
        const vehicleType = data['vehicle-type'] || 'Não informado';
        const driverGender = data['driver-gender'] || 'Não informado';
        const driverAge = data['driver-age'] || 'Não informado';
        const breathalyzer = data['breathalyzer'] || 'Não informado';
        const observations = data['observations'] || 'Nenhuma';
        const vehicleDisposition = data['vehicle-disposition'] || 'Não informado';
        
        const abordador = data['abordador'] || 'Não informado';
        const condutorNome = data['condutor-nome'] || 'Não informado';
        const condutorCpf = data['condutor-cpf'] || 'Não informado';
        const condutorCnh = data.cnh || 'Não informado';
        const testeAtivoNum = data['teste-ativo-num'] || 'Não informado';
        const resultadoTeste = data['resultado-teste'] || 'Não informado';
        const infractionsJSON = data['infractions-data'];
        const infractions = infractionsJSON ? JSON.parse(infractionsJSON) : [];
        
        let infractionsText = '*Nenhuma infração registrada.*';
        if (infractions.length > 0) {
            infractionsText = infractions.map(inf => {
                const autoNum = inf.numeroAuto ? ` (Auto: ${inf.numeroAuto})` : '';
                return `• *Art. ${inf.artigo} (${inf.codigo})${autoNum}:* ${inf.descricao}`;
            }).join('\n');
        }

        const reportText = `
*RELATÓRIO DE OPERAÇÃO DE FISCALIZAÇÃO*
--------------------------------------
*1. REGIONAL:* ${regional}
*Município da Ação:* ${municipioAcao}
*2. TIPO DE OPERAÇÃO:* ${operation}
--------------------------------------
*3. VEÍCULO ABORDADO*
*Tipo de Veículo:* ${vehicleType}
*Identificação:* ${idType} - ${idValue}
*Situação do Veículo:* ${vehicleDisposition}
--------------------------------------
*4. CONDUTOR*
*Nome:* ${condutorNome}
*CPF:* ${condutorCpf}
*CNH:* ${condutorCnh}
*Sexo:* ${driverGender}
*Idade:* ${driverAge}
--------------------------------------
*5. TESTE DE ETILÔMETRO*
*Procedimento:* ${breathalyzer}
*Agente Abordador:* ${abordador}
*Nº do Teste:* ${testeAtivoNum}
*Resultado:* ${resultadoTeste}
--------------------------------------
*6. AUTUAÇÕES REALIZADAS:*
${infractionsText}
--------------------------------------
*7. OBSERVAÇÕES:*
${observations}
        `.trim().replace(/\n\n\n/g, '\n').replace(/\n\n/g, '\n');

        return reportText;
    };

    const copyToClipboard = (text, button) => {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = button.textContent;
            button.textContent = 'Copiado!';
            button.disabled = true;
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 2000);
        }).catch(err => {
            console.error('Falha ao copiar: ', err);
            alert('Não foi possível copiar o texto.');
        });
    };

    const exportReportToExcel = (reportText, report) => {
        const table = document.createElement('table');
        table.style.display = 'none';
        const tbody = table.createTBody();

        const lines = reportText.replace(/\*/g, '').split('\n');
        lines.forEach(line => {
            const parts = line.split(':');
            const row = tbody.insertRow();
            const keyCell = row.insertCell();
            const valueCell = row.insertCell();
            keyCell.textContent = parts[0] || '';
            valueCell.textContent = parts.slice(1).join(':').trim();
        });

        document.body.appendChild(table);

        TableToExcel.convert(table, {
            name: `Relatorio_${report['id-value'] || report.id}.xlsx`,
            sheet: { name: "Relatório" }
        });

        document.body.removeChild(table);
    };

    const exportReportToPdf = (reportText, report) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        
        const lines = doc.splitTextToSize(reportText.replace(/\*/g, ''), 180); // 180mm width
        doc.text(lines, 15, 20);

        const fileName = `Relatorio_${report['id-value'] || report.id}.pdf`;
        doc.save(fileName);
    };

    const shareReport = (reportText) => {
        if (navigator.share) {
            navigator.share({
                title: 'Relatório de Fiscalização',
                text: reportText,
            }).catch((error) => console.log('Error sharing:', error));
        } else {
            // Fallback for desktop
            const encodedText = encodeURIComponent(reportText);
            const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
            window.open(whatsappUrl, '_blank');
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
            infraction: document.getElementById('filter-infraction').value.toLowerCase().trim()
        };

        const filtered = reports.filter(r => {
            if (!r.timestamp) return false;
            const reportDate = new Date(r.timestamp);
            
            if (filters.startDate) {
                // Adjust for timezone to compare dates correctly
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
            if (filters.infraction) {
                const infractionsData = r['infractions-data'];
                const infractions = (typeof infractionsData === 'string' && infractionsData.length > 2) ? JSON.parse(infractionsData) : [];
                const hasInfraction = infractions.some(
                    inf => inf.artigo.toLowerCase().includes(filters.infraction) || 
                           inf.descricao.toLowerCase().includes(filters.infraction) ||
                           inf.codigo.toLowerCase().includes(filters.infraction)
                );
                const hasRefusal = r['resultado-teste']?.toLowerCase().includes(filters.infraction);
                if (!hasInfraction && !hasRefusal) return false;
            }
            return true;
        }).sort((a, b) => b.id - a.id);

        renderAggregatedReport(filtered);
        renderIndividualReports(filtered);
    };

    const renderAggregatedReport = (filteredReports) => {
        const infractionCounts = {};
        const refusalCounts = {
            '165A': 0,
            'TC': 0,
            '165': 0
        };
        let totalInfractions165 = 0;

        filteredReports.forEach(report => {
            // Count infractions from the list
            const infractionsData = report['infractions-data'];
            const infractions = (typeof infractionsData === 'string' && infractionsData.length > 2) ? JSON.parse(infractionsData) : [];
            infractions.forEach(inf => {
                const key = `Art. ${inf.artigo} (${inf.codigo})`;
                if (!infractionCounts[key]) {
                    infractionCounts[key] = { count: 0, description: inf.descricao };
                }
                infractionCounts[key].count++;
            });

            // Count refusals and positive tests from the specific field
            const resultado = report['resultado-tipo'];
            if (resultado && refusalCounts.hasOwnProperty(resultado)) {
                refusalCounts[resultado]++;
            }
             if (resultado === '165') {
                totalInfractions165++;
            }
        });
        
        const totalReports = filteredReports.length;
        if (totalReports === 0) {
            aggregatedContent.innerHTML = '<p>Nenhum relatório encontrado com os filtros aplicados.</p>';
            aggregatedActions.classList.add('hidden');
            return;
        }

        let reportText = `RELATÓRIO AGREGADO DE AUTUAÇÕES\n`;
        reportText += `Total de Abordagens: ${totalReports}\n`;
        reportText += `--------------------------------------\n\n`;

        let htmlContent = `<p><strong>Total de Abordagens:</strong> ${totalReports}</p>`;
        htmlContent += '<ul>';

        if (refusalCounts['165A'] > 0) {
            const desc = 'Recusa sem sintomas (Art. 165-A)';
            htmlContent += `<li><strong>${refusalCounts['165A']}x - Recusa (Art. 165-A):</strong> Recusa a se submeter ao teste do etilômetro sem sinais de embriaguez.</li>`;
            reportText += `${refusalCounts['165A']}x - ${desc}\n`;
        }
        if (refusalCounts['TC'] > 0) {
            const desc = 'Recusa com sintomas (Termo de Constatação)';
            htmlContent += `<li><strong>${refusalCounts['TC']}x - Recusa (TC):</strong> Recusa a se submeter ao teste com sinais de embriaguez (lavrado Termo de Constatação).</li>`;
            reportText += `${refusalCounts['TC']}x - ${desc}\n`;
        }
        if (totalInfractions165 > 0) {
             const desc = 'Infração por Embriaguez (Art. 165)';
            htmlContent += `<li><strong>${totalInfractions165}x - Embriaguez (Art. 165):</strong> Resultado positivo no teste do etilômetro.</li>`;
            reportText += `${totalInfractions165}x - ${desc}\n`;
        }

        const sortedInfractions = Object.entries(infractionCounts).sort(([, a], [, b]) => b.count - a.count);

        sortedInfractions.forEach(([key, value]) => {
            htmlContent += `<li><strong>${value.count}x - ${key}:</strong> ${value.description}</li>`;
            reportText += `${value.count}x - ${key}: ${value.description}\n`;
        });

        htmlContent += '</ul>';

        if (Object.keys(infractionCounts).length === 0 && Object.values(refusalCounts).every(v => v === 0)) {
             aggregatedContent.innerHTML = '<p>Nenhuma autuação encontrada com os filtros aplicados.</p>';
             aggregatedActions.classList.add('hidden');
        } else {
            aggregatedContent.innerHTML = htmlContent;
            aggregatedActions.classList.remove('hidden');

            const copyBtn = aggregatedActions.querySelector('.copy-report-btn');
            const pdfBtn = aggregatedActions.querySelector('.export-pdf-btn');
            const excelBtn = aggregatedActions.querySelector('.export-excel-btn');
            const shareBtn = aggregatedActions.querySelector('.share-aggregated-report-btn');

            copyBtn.onclick = () => copyToClipboard(reportText, copyBtn);
            shareBtn.onclick = () => shareReport(reportText);

            pdfBtn.onclick = () => {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                doc.setFontSize(10);
                const lines = doc.splitTextToSize(reportText.replace(/\*/g, ''), 180);
                doc.text("Relatório Agregado de Autuações", 15, 20);
                doc.text(lines, 15, 30);
                doc.save(`Relatorio_Agregado_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
            };

            excelBtn.onclick = () => {
                const table = document.createElement('table');
                table.style.display = 'none';
                const thead = table.createTHead();
                const tbody = table.createTBody();
                const headerRow = thead.insertRow();
                headerRow.insertCell().textContent = "Quantidade";
                headerRow.insertCell().textContent = "Tipo";
                headerRow.insertCell().textContent = "Descrição";

                if (refusalCounts['165A'] > 0) {
                    const row = tbody.insertRow();
                    row.insertCell().textContent = refusalCounts['165A'];
                    row.insertCell().textContent = "Recusa (Art. 165-A)";
                    row.insertCell().textContent = "Recusa a se submeter ao teste do etilômetro sem sinais de embriaguez.";
                }
                if (refusalCounts['TC'] > 0) {
                    const row = tbody.insertRow();
                    row.insertCell().textContent = refusalCounts['TC'];
                    row.insertCell().textContent = "Recusa (TC)";
                    row.insertCell().textContent = "Recusa a se submeter ao teste com sinais de embriaguez (lavrado Termo de Constatação).";
                }
                 if (totalInfractions165 > 0) {
                    const row = tbody.insertRow();
                    row.insertCell().textContent = totalInfractions165;
                    row.insertCell().textContent = "Embriaguez (Art. 165)";
                    row.insertCell().textContent = "Resultado positivo no teste do etilômetro.";
                }

                sortedInfractions.forEach(([key, value]) => {
                     const row = tbody.insertRow();
                     row.insertCell().textContent = value.count;
                     row.insertCell().textContent = key;
                     row.insertCell().textContent = value.description;
                });

                document.body.appendChild(table);
                TableToExcel.convert(table, {
                    name: `Relatorio_Agregado_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`,
                    sheet: { name: "Autuações" }
                });
                document.body.removeChild(table);
            };
        }
    };

    const renderIndividualReports = (filteredReports) => {
        filteredReportsContainer.innerHTML = '';
        if (filteredReports.length === 0) {
            filteredReportsContainer.innerHTML = '<p>Nenhum relatório encontrado com os filtros aplicados.</p>';
            return;
        }

        filteredReports.forEach(report => {
            const card = document.createElement('div');
            card.className = 'report-card';
            const reportDate = new Date(report.timestamp).toLocaleString('pt-BR');
            const reportText = generateReportText(report); // Use the existing function

            card.innerHTML = `
                <div class="report-card-header">
                    <h3>${report['id-value'] ? report['id-value'].toUpperCase() : 'N/A'} - ${report.regional}</h3>
                    <span>${reportDate}</span>
                </div>
                <div class="report-card-body">
                    <p><strong>Operação:</strong> ${report['operation-type'] || 'N/A'}</p>
                    <p><strong>Condutor:</strong> ${report['condutor-nome'] || 'N/A'} (${report['driver-gender'] || 'N/A'})</p>
                    <div class="report-card-actions">
                         <button class="toggle-details-btn secondary">Ver Detalhes</button>
                         <button class="copy-report-btn secondary">Copiar Relatório</button>
                         <button class="export-pdf-btn secondary">Exportar PDF</button>
                         <button class="export-excel-btn secondary">Exportar Excel</button>
                         <button class="share-btn secondary">Compartilhar</button>
                    </div>
                    <div class="report-details hidden">
                        <pre>${reportText}</pre>
                    </div>
                </div>
            `;
            
            const toggleBtn = card.querySelector('.toggle-details-btn');
            const copyBtn = card.querySelector('.copy-report-btn');
            const pdfBtn = card.querySelector('.export-pdf-btn');
            const excelBtn = card.querySelector('.export-excel-btn');
            const shareBtn = card.querySelector('.share-btn');
            const detailsDiv = card.querySelector('.report-details');

            toggleBtn.addEventListener('click', () => {
                const isHidden = detailsDiv.classList.toggle('hidden');
                toggleBtn.textContent = isHidden ? 'Ver Detalhes' : 'Ocultar Detalhes';
            });

            copyBtn.addEventListener('click', () => {
                copyToClipboard(reportText, copyBtn);
            });

            pdfBtn.addEventListener('click', () => {
                exportReportToPdf(reportText, report);
            });

            excelBtn.addEventListener('click', () => {
                exportReportToExcel(reportText, report);
            });

            shareBtn.addEventListener('click', () => {
                shareReport(reportText);
            });
            
            filteredReportsContainer.appendChild(card);
        });
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
    
    // --- INITIALIZATION ---
    populateFilterDropdowns();
    renderReports(); // Initial render on page load
});
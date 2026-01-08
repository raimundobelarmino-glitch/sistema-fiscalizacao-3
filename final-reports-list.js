document.addEventListener('DOMContentLoaded', () => {
    const reportsContainer = document.getElementById('final-reports-container');
    const noReportsMessage = document.getElementById('no-reports-message');
    const FINAL_REPORTS_KEY = 'fiscalizacaoFinalReports';

    const getFinalReports = () => {
        return JSON.parse(localStorage.getItem(FINAL_REPORTS_KEY) || '[]').sort((a, b) => {
            // Sort by save date, newest first
            return new Date(b.savedAt) - new Date(a.savedAt);
        });
    };

    const renderReports = () => {
        const reports = getFinalReports();
        reportsContainer.innerHTML = '';

        if (reports.length === 0) {
            noReportsMessage.classList.remove('hidden');
            return;
        }

        noReportsMessage.classList.add('hidden');

        reports.forEach(report => {
            const card = document.createElement('div');
            card.className = 'report-card';
            
            const savedDate = new Date(report.savedAt).toLocaleString('pt-BR');
            const opName = report['acao-desenvolvida'] || 'Operação Sem Nome';
            const regional = report['regional'] || 'N/A';
            const totalAITs = report['total-aits'] || 0;
            const totalAbordagens = report['veiculos-total'] || 0;
            const opDateRange = report.filter_startDate && report.filter_endDate 
                ? `${new Date(report.filter_startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a ${new Date(report.filter_endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`
                : 'Período não especificado';

            // Construct URL with parameters for the dashboard
            const params = new URLSearchParams({
                startDate: report.filter_startDate,
                endDate: report.filter_endDate,
                regional: report.filter_regional,
                operation: report.filter_operation,
                municipio: report.municipio || ''
            });
            const dashboardUrl = `dashboard.html?${params.toString()}`;

            card.innerHTML = `
                <div class="report-card-header">
                    <h3>${opName} - ${regional}</h3>
                    <span>Salvo em: ${savedDate}</span>
                </div>
                <div class="report-card-body">
                    <p><strong>Período da Operação:</strong> ${opDateRange}</p>
                    <p><strong>Total de Abordagens:</strong> ${totalAbordagens}</p>
                    <p><strong>Total de AITs:</strong> ${totalAITs}</p>
                    <p><strong>ID SEI:</strong> ${report['id-sei'] || 'Não informado'}</p>
                </div>
                <div class="report-card-actions">
                    <a href="${dashboardUrl}" class="secondary">Ver no Dashboard</a>
                    <button class="export-pdf-btn secondary" data-report-id="${report.id}">Exportar PDF</button>
                    <button class="export-excel-btn secondary" data-report-id="${report.id}">Exportar Excel</button>
                </div>
            `;
            
            reportsContainer.appendChild(card);
        });
    };

    const exportToPdf = (report) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(10);
        let y = 15;

        doc.setFont('helvetica', 'bold');
        doc.text('Relatório Final de Operação', 14, y);
        y += 10;

        const addLine = (title, value) => {
            if (value !== undefined && value !== null && value !== '' && value !== "0") {
                doc.setFont('helvetica', 'bold');
                doc.text(`${title}:`, 14, y);
                doc.setFont('helvetica', 'normal');
                const text = String(value);
                const splitText = doc.splitTextToSize(text, 150);
                doc.text(splitText, 50, y);
                y += (splitText.length * 5) + 2;
                if (y > 280) {
                    doc.addPage();
                    y = 15;
                }
            }
        };

        addLine('Ação Desenvolvida', report['acao-desenvolvida']);
        addLine('Regional', report.regional);
        addLine('Data', report.data);
        addLine('Município(s)', report.municipio);
        addLine('ID SEI', report['id-sei']);
        y += 5;
        
        addLine('Total de Veículos Abordados', report['veiculos-total']);
        addLine('Veículos 2/3 rodas', report['veiculos-2-rodas']);
        addLine('Veículos 4+ rodas', report['veiculos-4-rodas']);
        y += 5;
        
        addLine('Abordagens (Masculino)', report['abordagem-masculina']);
        addLine('Abordagens (Feminino)', report['abordagem-feminina']);
        y += 5;
        
        addLine('Total de AITs Lavrados', report['total-aits']);
        addLine('Veículos Removidos (2/3 rodas)', report['remocao-2-rodas']);
        addLine('Veículos Removidos (4+ rodas)', report['remocao-4-rodas']);
        addLine('Veículos Recuperados (Furto/Roubo)', report['furto-roubo']);
        y += 5;
        
        addLine('Etilômetro: Negativos', report['etilometro-negativo']);
        addLine('Etilômetro: Infração (0.05-0.33)', report['etilometro-infracao']);
        addLine('Etilômetro: Crime (>0.33)', report['etilometro-crime']);
        addLine('Recusa (Art. 165-A)', report['recusa-165a']);
        addLine('Recusa (TC)', (parseInt(report['recusa-tc-masculino'] || 0) + parseInt(report['recusa-tc-feminino'] || 0)));

        doc.save(`Relatorio_Final_${report.id}.pdf`);
    };

    const exportToExcel = (report) => {
        const data = Object.entries(report).map(([key, value]) => ({ Chave: key, Valor: value }));

        const table = document.createElement('table');
        const thead = table.createTHead();
        const tbody = table.createTBody();
        const headerRow = thead.insertRow();
        headerRow.insertCell().textContent = "Item";
        headerRow.insertCell().textContent = "Valor";

        Object.entries(report).forEach(([key, value]) => {
            if (value) { // Only add rows that have a value
                const row = tbody.insertRow();
                row.insertCell().textContent = key;
                row.insertCell().textContent = value;
            }
        });
        
        document.body.appendChild(table);
        TableToExcel.convert(table, {
            name: `Relatorio_Final_${report.id}.xlsx`,
            sheet: { name: "Dados" }
        });
        document.body.removeChild(table);
    };

    reportsContainer.addEventListener('click', (e) => {
        const reportId = e.target.dataset.reportId;
        if (!reportId) return;

        const reports = getFinalReports();
        const report = reports.find(r => r.id === reportId);
        if (!report) return;

        if (e.target.classList.contains('export-pdf-btn')) {
            exportToPdf(report);
        } else if (e.target.classList.contains('export-excel-btn')) {
            exportToExcel(report);
        }
    });

    renderReports();
});
import { saveOperationData, getOperationData } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('operation-setup-form');
    const dateInput = document.getElementById('data-operacao');
    const timeStartInput = document.getElementById('hora-inicial');
    const timeEndInput = document.getElementById('hora-final');

    const activeSessionSection = document.getElementById('active-session-section');
    const activeSessionInfo = document.getElementById('active-session-info');
    const continueActiveSessionBtn = document.getElementById('continue-active-session-btn');
    const startNewBtn = document.getElementById('start-new-operation-anyway-btn');

    const operationTypes = {
        "OLS": "OPERAÇÃO LEI SECA - OLS", "OCG": "OPERAÇÃO CORTA GIRO - OCG", "2R1V": "DUAS RODAS - 2R1V",
        "4R1V": "QUATRO RODAS - 4R1V", "PV": "PATRULHAMENTO VIÁRIO- PV", "FC": "FISCALIZAÇÃO CONVENCIONAL- FC",
        "FE": "FISCALIZAÇÃO ESCOLAR - FE", "ORS": "OPERAÇÃO ROTA SEGURA - ORS"
    };

    const checkForActiveSession = () => {
        const activeOperation = getOperationData();
        if (activeOperation) {
            form.classList.add('hidden');
            activeSessionSection.classList.remove('hidden');

            const operationDate = new Date(activeOperation['data-operacao'] + 'T00:00:00');
            activeSessionInfo.innerHTML = `
                <p><strong>Tipo:</strong> ${operationTypes[activeOperation['operation-type']] || 'N/A'}</p>
                <p><strong>Data:</strong> ${operationDate.toLocaleDateString('pt-BR')}</p>
                <p><strong>Regional:</strong> ${activeOperation.regional}</p>
                <p><strong>Chefe de Equipe:</strong> ${activeOperation['chefe-equipe']}</p>
            `;
        } else {
            form.classList.remove('hidden');
            activeSessionSection.classList.add('hidden');
        }
    };

    continueActiveSessionBtn.addEventListener('click', () => {
        // The session data is already loaded, just go to the form.
        window.location.href = 'form.html';
    });

    startNewBtn.addEventListener('click', () => {
        if (confirm('Tem certeza? Isso irá substituir os dados da operação ativa na sua sessão atual.')) {
            activeSessionSection.classList.add('hidden');
            form.classList.remove('hidden');
        }
    });
    
    // Set default date to today
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const operationData = Object.fromEntries(formData.entries());
        
        saveOperationData(operationData);
        
        window.location.href = 'form.html';
    });

    // Initial check when the page loads
    checkForActiveSession();
});
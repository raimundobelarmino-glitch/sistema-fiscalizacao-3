import { saveReport, getOperationData, getSavedReports, updateReport } from './storage.js';
import { initializeInfractionAdder } from './form-ui-handler.js';
import { formatCpf } from './form-utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- FORM ELEMENTS ---
    const form = document.getElementById('report-form');
    const successMessageSection = document.getElementById('success-message');
    const newReportBtn = document.getElementById('new-report-btn');

    // Steps
    const steps = Array.from(document.querySelectorAll('.form-step'));
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const submitBtn = document.getElementById('submit-btn');
    const saveBtn = document.getElementById('save-btn');
    const formNav = document.querySelector('.form-navigation');
    const operationInfoDiv = document.getElementById('operation-info');
    const addPixBtn = document.getElementById('add-pix-btn');

    // Inputs
    const idTypeRadios = document.querySelectorAll('input[name="id-type"]');
    const idValueLabel = document.getElementById('id-value-label');
    const idValueInput = document.getElementById('id-value');
    const condutorCpfInput = document.getElementById('condutor-cpf');
    const imageSelectorGroups = document.querySelectorAll('.image-selector-group');
    const breathalyzerRadios = document.querySelectorAll('input[name="breathalyzer"]');
    const resultadoTipoRadios = document.querySelectorAll('input[name="resultado-tipo"]');
    const valorMedidoContainer = document.getElementById('valor-medido-container');
    const resultadoValorInput = document.getElementById('resultado-valor');
    const resultadoFinalInput = document.getElementById('resultado-teste');

    // --- STATE ---
    let addedInfractions = [];
    let currentStep = 1;
    const totalSteps = 3;
    let operationData = null;
    let editMode = false;
    let reportToEditId = null;
    let returnUrl = null;

    // --- Infraction Adder State ---
    let addInfractionFunction = () => {};

    // --- VALIDATION ---
    const validateStep1 = () => {
        if (!form.querySelector('input[name="id-type"]:checked')) {
            alert('Por favor, selecione o tipo de identificação.');
            return false;
        }
        if (!idValueInput.value.trim()) {
            alert('Por favor, preencha o campo de identificação.');
            idValueInput.focus();
            return false;
        }
        if (!form.querySelector('input[name="vehicle-type"]:checked')) {
            alert('Por favor, selecione o tipo de veículo.');
            return false;
        }
        if (!form.querySelector('input[name="driver-gender"]:checked')) {
            alert('Por favor, selecione o sexo do condutor.');
            return false;
        }
        if (!document.getElementById('driver-age').value.trim()) {
            alert('Por favor, digite a idade do condutor.');
            document.getElementById('driver-age').focus();
            return false;
        }
        if (!form.querySelector('input[name="breathalyzer"]:checked')) {
            alert('Por favor, selecione se o teste de etilômetro foi realizado.');
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (!form.querySelector('#abordador').value.trim()) {
            alert('Por favor, preencha o nome do abordador.');
            form.querySelector('#abordador').focus();
            return false;
        }
        if (!form.querySelector('#condutor-nome').value.trim()) {
            alert('Por favor, preencha o nome do condutor abordado.');
            form.querySelector('#condutor-nome').focus();
            return false;
        }
        const cpfValue = condutorCpfInput.value.replace(/\D/g, '');
        if (cpfValue && cpfValue.length !== 11) {
            alert('O CPF deve conter 11 dígitos.');
            condutorCpfInput.focus();
            return false;
        }
        
        const resultadoTipo = form.querySelector('input[name="resultado-tipo"]:checked');
        if (!resultadoTipo) {
            alert('Por favor, selecione o resultado do teste.');
            return false;
        }

        // Only require test number and value for Art. 165
        if (resultadoTipo.value === '165') {
            if (!form.querySelector('#teste-ativo-num').value.trim()) {
                alert('Por favor, preencha o número do teste ativo para a infração do Art. 165.');
                form.querySelector('#teste-ativo-num').focus();
                return false;
            }
            if (!resultadoValorInput.value.trim()) {
                alert('Por favor, preencha o valor medido para a infração do Art. 165.');
                resultadoValorInput.focus();
                return false;
            }
        }
        
        return true;
    };

    // --- POPULATE FORM FOR EDITING ---
    const populateFormForEdit = (report) => {
        if (!report) return;

        // Step 1
        document.querySelector(`input[name="id-type"][value="${report['id-type'] || 'Placa'}"]`).checked = true;
        idValueInput.value = report['id-value'] || '';
        document.querySelector(`input[name="vehicle-type"][value="${report['vehicle-type'] || '4 rodas'}"]`).checked = true;
        document.querySelector(`input[name="driver-gender"][value="${report['driver-gender'] || 'Masculino'}"]`).checked = true;
        document.getElementById('driver-age').value = report['driver-age'] || '';
        
        let breathalyzerValue = report['breathalyzer'] || 'Não';
        if (breathalyzerValue === 'NÃO OFERECIDO') {
            breathalyzerValue = 'Não'; // Compatibility for old data
        }
        const breathalyzerRadio = document.querySelector(`input[name="breathalyzer"][value="${breathalyzerValue}"]`);
        if (breathalyzerRadio) breathalyzerRadio.checked = true;
        document.getElementById('observations').value = report.observations || '';

        // Step 2
        document.getElementById('abordador').value = report.abordador || '';
        document.getElementById('condutor-nome').value = report['condutor-nome'] || '';
        condutorCpfInput.value = report['condutor-cpf'] || '';
        document.getElementById('teste-ativo-num').value = report['teste-ativo-num'] || '';
        
        const resultadoTipo = report['resultado-tipo'] || null;
        if(resultadoTipo) {
            const resultadoRadio = document.querySelector(`input[name="resultado-tipo"][value="${resultadoTipo}"]`);
            if(resultadoRadio) resultadoRadio.checked = true;
        }

        if (resultadoTipo === '165' && report['resultado-valor']) {
            resultadoValorInput.value = report['resultado-valor'];
        }

        // Step 3
        addedInfractions = (report['infractions-data'] && report['infractions-data'].length > 2) ? JSON.parse(report['infractions-data']) : [];

        // Manually trigger change events to update UI
        idTypeRadios.forEach(radio => { if (radio.checked) radio.dispatchEvent(new Event('change')); });
        breathalyzerRadios.forEach(radio => { if (radio.checked) radio.dispatchEvent(new Event('change')); });
        imageSelectorGroups.forEach(group => {
            const checkedRadio = group.querySelector('input[type="radio"]:checked');
            if (checkedRadio) {
                updateImageSelectorStyles(group);
            }
        });

        updateButtonVisibility();
    };

    // --- UI LOGIC ---
    const updateImageSelectorStyles = (group) => {
        const selectors = group.querySelectorAll('.image-selector');
        selectors.forEach(selector => {
            const radio = selector.querySelector('input[type="radio"]');
            if (radio.checked) {
                selector.classList.add('selected');
            } else {
                selector.classList.remove('selected');
            }
        });
    };

    const updateStepView = () => {
        steps.forEach((step, index) => {
            if (index + 1 === currentStep) {
                step.classList.remove('hidden');
            } else {
                step.classList.add('hidden');
            }
        });
    };

    const updateButtonVisibility = () => {
        const breathalyzerChoiceRadio = document.querySelector('input[name="breathalyzer"]:checked');
        const breathalyzerChoice = breathalyzerChoiceRadio ? breathalyzerChoiceRadio.value : null;
        const shouldGoToStep2 = (breathalyzerChoice === 'Ativo');

        prevBtn.classList.toggle('hidden', currentStep === 1);
        nextBtn.classList.add('hidden');
        submitBtn.classList.add('hidden');
        
        if (currentStep === 1) {
            nextBtn.classList.remove('hidden');
        } else if (currentStep === 2) {
             nextBtn.classList.remove('hidden');
        } else if (currentStep === 3) {
            submitBtn.classList.remove('hidden');
        }
    };
    
    const displayOperationInfo = () => {
        operationData = getOperationData();
        if (!operationData) {
            // Redirect if no operation data is set
            alert("Nenhuma operação iniciada. Redirecionando para a tela de configuração.");
            window.location.href = 'operation-setup.html';
            return;
        }

        const operationTypes = {
            "OLS": "OPERAÇÃO LEI SECA - OLS", "OCG": "OPERAÇÃO CORTA GIRO - OCG", "2R1V": "DUAS RODAS - 2R1V",
            "4R1V": "QUATRO RODAS - 4R1V", "PV": "PATRULHAMENTO VIÁRIO- PV", "FC": "FISCALIZAÇÃO CONVENCIONAL- FC",
            "FE": "FISCALIZAÇÃO ESCOLAR - FE", "ORS": "OPERAÇÃO ROTA SEGURA - ORS"
        };
        
        const operationDate = new Date(operationData['data-operacao'] + 'T00:00:00');

        operationInfoDiv.innerHTML = `
            <p><strong>Operação:</strong> ${operationTypes[operationData['operation-type']] || 'N/A'}</p>
            <p><strong>Chefe de Equipe:</strong> ${operationData['chefe-equipe'] || 'N/A'}</p>
            <p><strong>Regional:</strong> ${operationData.regional}</p>
            <p><strong>Município:</strong> ${operationData['municipio-acao']}</p>
            <p><strong>Data:</strong> ${operationDate.toLocaleDateString('pt-BR')}</p>
            <p><strong>Horário Inicial:</strong> ${operationData['hora-inicial'] || 'N/A'}</p>
        `;
    };

    const updateResultado = () => {
        const selectedRadio = document.querySelector('input[name="resultado-tipo"]:checked');
        if (!selectedRadio) {
             valorMedidoContainer.style.display = 'none';
             resultadoFinalInput.value = ''; // Clear value if nothing is selected
            return;
        }
        const selectedType = selectedRadio.value;

        if (selectedType === '165') {
            valorMedidoContainer.style.display = 'block';
            resultadoFinalInput.value = `Art. 165 - ${resultadoValorInput.value.trim() || 'valor não informado'}`;
        } else {
            valorMedidoContainer.style.display = 'none';
            resultadoFinalInput.value = selectedType;
        }
    };

    const resetFormState = () => {
        if (editMode) {
            window.location.href = 'continue-form.html';
            return;
        }
        form.reset();
        
        // Manually clear any selected state from image selectors
        imageSelectorGroups.forEach(group => {
             group.querySelectorAll('.image-selector').forEach(sel => sel.classList.remove('selected'));
        });
        
        // Explicitly clear text/number/textarea fields to ensure a clean slate
        idValueInput.value = '';
        document.getElementById('driver-age').value = '';
        document.getElementById('observations').value = '';
        document.getElementById('abordador').value = '';
        document.getElementById('condutor-nome').value = '';
        condutorCpfInput.value = '';
        document.getElementById('teste-ativo-num').value = '';
        resultadoValorInput.value = '';
        idValueLabel.textContent = 'Placa:';

        currentStep = 1;
        addedInfractions = [];
        
        // Re-initialize the infraction adder to clear it
        initializeInfractionAdder({
            ctbSearchInputId: 'ctb-search',
            ctbSuggestionsContainerId: 'ctb-suggestions',
            infractionsListId: 'infractions-list',
            infractionsDataInputId: 'infractions-data',
            initialInfractions: [],
            onUpdate: (updatedInfractions) => {
                addedInfractions = updatedInfractions;
            }
        });

        updateStepView();
        updateButtonVisibility();
        updateResultado();
        
        // Swap visibility back to the form
        successMessageSection.classList.add('hidden');
        form.classList.remove('hidden');
        form.scrollIntoView({ behavior: 'smooth' });
    };

    // --- EVENT LISTENERS ---
    nextBtn.addEventListener('click', () => {
        if (currentStep === 1) {
            if (!validateStep1()) {
                return;
            }

            // Check for duplicate entry before proceeding, but only in create mode
            if (!editMode) {
                const plate = idValueInput.value.trim().toUpperCase();
                const currentOperationDate = operationData['data-operacao'];
                const currentOperationType = operationData['operation-type'];

                if (plate) { // Only check if a plate is entered
                    const reports = getSavedReports();
                    const isDuplicate = reports.some(report =>
                        report['id-value']?.trim().toUpperCase() === plate &&
                        report['data-operacao'] === currentOperationDate &&
                        report['operation-type'] === currentOperationType
                    );

                    if (isDuplicate) {
                        alert('Este veículo já foi cadastrado nesta operação hoje. Verifique a placa e tente novamente, ou utilize a opção "Continuar Cadastro" no menu principal para adicionar informações a um cadastro existente.');
                        return; // Stop execution
                    }
                }
            }

            const breathalyzerChoice = document.querySelector('input[name="breathalyzer"]:checked').value;
            const shouldGoToStep2 = (breathalyzerChoice === 'Ativo');
            currentStep = shouldGoToStep2 ? 2 : 3;

        } else if (currentStep === 2) {
            if (!validateStep2()) {
                return;
            }
            currentStep = 3;
        }
        
        updateStepView();
        updateButtonVisibility();
    });

    prevBtn.addEventListener('click', () => {
        const breathalyzerChoiceRadio = document.querySelector('input[name="breathalyzer"]:checked');
        const breathalyzerChoice = breathalyzerChoiceRadio ? breathalyzerChoiceRadio.value : null;

        // Only go back to step 2 if the test was "Ativo"
        const wasStep2Applicable = (breathalyzerChoice === 'Ativo');

        if (currentStep === 3) {
            currentStep = wasStep2Applicable ? 2 : 1;
        } else if (currentStep === 2) {
            currentStep = 1;
        }
        
        updateStepView();
        updateButtonVisibility();
    });

    addPixBtn.addEventListener('click', () => {
        if (addInfractionFunction) {
            addInfractionFunction({
                artigo: "PIX",
                codigo: "PIX",
                descricao: "Auto de Infração PIX (Pagamento Imediato)"
            });
        }
    });

    idTypeRadios.forEach(radio => radio.addEventListener('change', e => {
        const newLabel = e.target.value;
        idValueLabel.textContent = `${newLabel}:`;
        idValueInput.placeholder = `Digite o ${newLabel.toLowerCase()}`;
    }));

    imageSelectorGroups.forEach(group => {
        group.addEventListener('change', (e) => {
            if (e.target.type === 'radio') {
                updateImageSelectorStyles(group);
            }
        });
    });

    breathalyzerRadios.forEach(radio => radio.addEventListener('change', () => {
        // When the choice changes on step 1, re-evaluate button visibility
        if (currentStep === 1) {
             updateButtonVisibility();
        }
    }));

    resultadoTipoRadios.forEach(radio => radio.addEventListener('change', updateResultado));

    resultadoValorInput.addEventListener('input', () => {
        const selectedRadio = document.querySelector('input[name="resultado-tipo"]:checked');
        if (selectedRadio && selectedRadio.value === '165') {
            resultadoFinalInput.value = `Art. 165 - ${resultadoValorInput.value.trim() || 'valor não informado'}`;
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        updateResultado();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        if (editMode && reportToEditId) {
            data.id = reportToEditId;
            updateReport(data);
             // On successful update, redirect back to the continue form
            alert('Cadastro atualizado com sucesso!');
            window.location.href = 'continue-form.html';
        } else {
            saveReport(data);
            if (returnUrl) {
                alert('Cadastro salvo com sucesso! Retornando à tela anterior.');
                window.location.href = returnUrl;
            } else {
                form.classList.add('hidden');
                successMessageSection.classList.remove('hidden');
                successMessageSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });

    form.addEventListener('reset', (e) => {
        e.preventDefault();
        resetFormState();
    });

    newReportBtn.addEventListener('click', () => {
        resetFormState();
    });

    // --- INITIALIZATION ---
    async function init() {
        displayOperationInfo();
        
        const urlParams = new URLSearchParams(window.location.search);
        const reportIdToEdit = urlParams.get('edit');
        const plateToPreFill = urlParams.get('plate');
        const fromSource = urlParams.get('from');

        if (fromSource === 'continue') {
            returnUrl = 'continue-form.html';
        }

        if (reportIdToEdit) {
            editMode = true;
            reportToEditId = parseInt(reportIdToEdit, 10);
            const reports = getSavedReports();
            const reportToEdit = reports.find(r => r.id === reportToEditId);
            
            if (reportToEdit) {
                document.querySelector('header h1').textContent = "Editar Cadastro de Fiscalização";
                submitBtn.textContent = 'Atualizar Cadastro';
                populateFormForEdit(reportToEdit);
            } else {
                alert('Cadastro para edição não encontrado. Redirecionando...');
                window.location.href = 'index.html';
                return;
            }
        } else if (plateToPreFill) {
            // Pre-fill from continue-form.html
            const placaRadio = document.querySelector(`input[name="id-type"][value="Placa"]`);
            if (placaRadio) {
                placaRadio.checked = true;
                placaRadio.dispatchEvent(new Event('change')); // This will update the label text
            }
            idValueInput.value = decodeURIComponent(plateToPreFill).toUpperCase();
        }

        initializeInfractionAdder({
            ctbSearchInputId: 'ctb-search',
            ctbSuggestionsContainerId: 'ctb-suggestions',
            infractionsListId: 'infractions-list',
            infractionsDataInputId: 'infractions-data',
            initialInfractions: addedInfractions, // Pass existing infractions if in edit mode
            onUpdate: (updatedInfractions) => {
                addedInfractions = updatedInfractions;
            },
            onReady: (adder) => {
                addInfractionFunction = adder.add;
            }
        });

        updateStepView();
        updateButtonVisibility();
        updateResultado();
        formatCpf(condutorCpfInput);
        // Initial style update for image selectors
        imageSelectorGroups.forEach(updateImageSelectorStyles);
    }

    init();
});
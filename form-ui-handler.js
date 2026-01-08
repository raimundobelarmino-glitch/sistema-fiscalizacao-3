/**
 * @typedef {Object} Infraction
 * @property {string} artigo
 * @property {string} codigo
 * @property {string} descricao
 * @property {string} [numeroAuto]
 */

/**
 * @typedef {Object} InfractionItemConfig
 * @property {boolean} [showAutoNumberInput=false] - Whether to show the "Nº do Auto" input field.
 */

/**
 * @typedef {Object} InfractionAdderConfig
 * @property {string} ctbSearchInputId - ID of the search input element.
 * @property {string} ctbSuggestionsContainerId - ID of the suggestions container element.
 * @property {string} infractionsListId - ID of the UL element for the infractions list.
 * @property {string} infractionsDataInputId - ID of the hidden input to store infraction JSON data.
 * @property {Infraction[]} initialInfractions - Array of infractions to populate the list with initially.
 * @property {(updatedInfractions: Infraction[]) => void} onUpdate - Callback function triggered when infractions are added or removed.
 * @property {(adder: { add: (infraction: Infraction) => void }) => void} [onReady] - Callback function triggered when the adder is ready, passing control functions.
 * @property {InfractionItemConfig} [infractionItemConfig] - Configuration for each list item.
 */

let ctbArticles = [];
let selectedInfraction = null;

/**
 * Fetches CTB data if not already loaded.
 */
async function loadCtbData() {
    if (ctbArticles.length > 0) return;
    try {
        const response = await fetch('./ctb.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        ctbArticles = await response.json();
    } catch (error) {
        console.error("Could not load CTB articles:", error);
        // We can't disable the input from here easily without access to the element,
        // so we'll just log the error. The calling script can handle UI feedback.
    }
}

/**
 * Initializes a reusable infraction adder component on a form.
 * @param {InfractionAdderConfig} config
 */
export async function initializeInfractionAdder(config) {
    await loadCtbData();

    const {
        ctbSearchInputId,
        ctbSuggestionsContainerId,
        infractionsListId,
        infractionsDataInputId,
        initialInfractions,
        onUpdate,
        onReady,
        infractionItemConfig = {}
    } = config;
    
    const { showAutoNumberInput = false } = infractionItemConfig;

    const searchInput = document.getElementById(ctbSearchInputId);
    const suggestionsContainer = document.getElementById(ctbSuggestionsContainerId);
    const listContainer = document.getElementById(infractionsListId);
    const dataInput = document.getElementById(infractionsDataInputId);

    if (!searchInput || !suggestionsContainer || !listContainer || !dataInput) {
        console.error("One or more elements for the infraction adder were not found in the DOM.");
        return;
    }

    let addedInfractions = [...initialInfractions];

    const render = () => {
        listContainer.innerHTML = '';
        if (addedInfractions.length === 0) {
            listContainer.innerHTML = '<li class="no-infraction-item">Nenhuma infração adicionada.</li>';
        } else {
            addedInfractions.forEach((infraction, index) => {
                const li = document.createElement('li');
                
                let numeroAutoInput = '';
                if (showAutoNumberInput) {
                    numeroAutoInput = `
                        <div class="infraction-number-input">
                            <label for="auto-num-${infraction.codigo}-${index}">Nº do Auto:</label>
                            <input type="text" id="auto-num-${infraction.codigo}-${index}" class="auto-number-input" data-index="${index}" value="${infraction.numeroAuto || ''}" placeholder="Digite o nº do auto">
                        </div>
                    `;
                }

                li.innerHTML = `
                    <div class="infraction-details">
                        <span><strong>Art. ${infraction.artigo} (${infraction.codigo}):</strong> ${infraction.descricao}</span>
                        ${numeroAutoInput}
                    </div>
                    <button type="button" class="remove-infraction-btn" data-index="${index}">&times;</button>
                `;
                listContainer.appendChild(li);
            });
        }
        dataInput.value = JSON.stringify(addedInfractions);
        if (onUpdate) {
            onUpdate(addedInfractions);
        }
    };

    const add = (infractionToAdd) => {
        if (infractionToAdd && !addedInfractions.some(i => i.codigo === infractionToAdd.codigo)) {
            const newInfraction = { ...infractionToAdd, numeroAuto: '' };
            addedInfractions.push(newInfraction);
            render();
        }
        searchInput.value = '';
        selectedInfraction = null;
        searchInput.focus();
        suggestionsContainer.classList.add('hidden');
    };

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        suggestionsContainer.innerHTML = '';
        selectedInfraction = null;
        if (query.length < 2 || ctbArticles.length === 0) {
            suggestionsContainer.classList.add('hidden');
            return;
        }
        const filtered = ctbArticles.filter(item =>
            item.artigo.toLowerCase().includes(query) ||
            item.descricao.toLowerCase().includes(query) ||
            item.codigo.toLowerCase().includes(query)
        ).slice(0, 10);

        if (filtered.length > 0) {
            filtered.forEach(item => {
                const div = document.createElement('div');
                div.classList.add('suggestion-item');
                div.innerHTML = `<strong>Art. ${item.artigo} (${item.codigo}):</strong> ${item.descricao}`;
                div.addEventListener('click', () => {
                    selectedInfraction = item;
                    add(selectedInfraction);
                });
                suggestionsContainer.appendChild(div);
            });
            suggestionsContainer.classList.remove('hidden');
        } else {
            suggestionsContainer.classList.add('hidden');
        }
    });

    listContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-infraction-btn')) {
            const index = e.target.getAttribute('data-index');
            addedInfractions.splice(index, 1);
            render();
        }
    });
    
    if (showAutoNumberInput) {
        listContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('auto-number-input')) {
                const index = e.target.getAttribute('data-index');
                if (addedInfractions[index]) {
                    addedInfractions[index].numeroAuto = e.target.value;
                    dataInput.value = JSON.stringify(addedInfractions);
                     if (onUpdate) {
                        onUpdate(addedInfractions);
                    }
                }
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (!suggestionsContainer.contains(e.target) && e.target !== searchInput) {
            suggestionsContainer.classList.add('hidden');
        }
    });

    // Initial render
    render();

    // Expose the add function if a callback is provided
    if (onReady) {
        onReady({ add });
    }
}
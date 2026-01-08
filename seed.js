import { aggregateReportData } from './report-aggregator.js';

// This file contains sample data and logic to populate localStorage for testing purposes.

// Helper function to get a random element from an array
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to get a random number in a range
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
// Helper to get a random float in a range
const getRandomFloat = (min, max, decimals) => {
    const str = (Math.random() * (max - min) + min).toFixed(decimals);
    return parseFloat(str);
};

// Represents the municipalities for generation, grouped by regional
const regionalMunicipalities = {
    "Porto Velho": ["Porto Velho", "Candeias do Jamari", "Guajará-Mirim", "Itapuã do Oeste", "Nova Mamoré"],
    "Ariquemes": ["Ariquemes", "Alto Paraíso", "Cacaulândia", "Machadinho d'Oeste", "Monte Negro", "Rio Crespo", "Vale do Anari"],
    "Jaru": ["Jaru", "Governador Jorge Teixeira", "Theobroma"],
    "Ji-Paraná": ["Ji-Paraná", "Alvorada d'Oeste", "Ministro Andreazza", "Nova União", "Ouro Preto do Oeste", "Presidente Médici", "Teixeirópolis", "Urupá", "Vale do Paraíso"],
    "Rolim de Moura": ["Rolim de Moura", "Alta Floresta d'Oeste", "Alto Alegre dos Parecis", "Castanheiras", "Nova Brasilândia d'Oeste", "Novo Horizonte do Oeste", "Parecis", "Santa Luzia d'Oeste"],
    "Cacoal": ["Cacoal", "Espigão d'Oeste", "Pimenta Bueno", "Primavera de Rondônia", "São Felipe d'Oeste"],
    "Vilhena": ["Vilhena", "Cabixi", "Cerejeiras", "Chupinguaia", "Colorado do Oeste", "Corumbiara", "Pimenteiras do Oeste"],
};

const operationTypes = {
    "OLS": "OPERAÇÃO LEI SECA - OLS", "OCG": "OPERAÇÃO CORTA GIRO - OCG", "2R1V": "DUAS RODAS - 2R1V",
    "4R1V": "QUATRO RODAS - 4R1V", "PV": "PATRULHAMENTO VIÁRIO- PV", "FC": "FISCALIZAÇÃO CONVENCIONAL- FC",
    "FE": "FISCALIZAÇÃO ESCOLAR - FE", "ORS": "OPERAÇÃO ROTA SEGURA - ORS"
};

// Available agents for variety
const agents = ["SGT. Rocha", "CB. Santos", "SGT. Andrade", "TEN. Silva", "CB. Lima", "SGT. Novaes", "CB. Freire", "SGT. Patrícia", "TEN. Barroso", "CB. Mendes", "SGT. Farias", "TEN. Pires"];
const matrics = ["1001", "2002", "3003", "4004", "5005", "6001", "6002", "6003", "6004", "6005", "6006", "6007"];
const namesMasculino = ["João", "Carlos", "Pedro", "Lucas", "Fernando", "José", "Rafael", "Ricardo", "Marcos", "Bruno", "Antônio", "Marcelo", "Rodrigo"];
const namesFeminino = ["Maria", "Ana", "Juliana", "Beatriz", "Valeria", "Sonia", "Lúcia", "Carla", "Fernanda", "Patrícia", "Gabriela", "Carolina"];
const lastNames = ["Silva", "Souza", "Pereira", "Costa", "Lima", "Martins", "Almeida", "Nunes", "Rocha", "Santos", "Oliveira", "Ferreira"];

const infractionDefinitions = {
    '165_crime': { artigo: "165", codigo: "516-91", descricao: "Dirigir sob a influência de álcool" },
    '165_admin': { artigo: "165", codigo: "516-91", descricao: "Dirigir sob a influência de álcool" },
    '165A_recusa': { artigo: "165-A", codigo: "757-90", descricao: "Recusar-se a submeter a teste..." },
    '162_I': { artigo: "162 I", codigo: "501-00", descricao: "Dirigir veículo sem possuir CNH, PPD ou ACC" },
    '164_cc_162_I': { artigo: "164 c/c 162 I", codigo: "511-80", descricao: "Permitir posse e condução do veículo a pessoa sem CNH, PPD ou ACC" },
    '230_V': { artigo: "230 V", codigo: "659-92", descricao: "Conduzir o veículo registrado que não esteja devidamente licenciado." },
    '230_IX': { artigo: "230 IX", codigo: "663-71", descricao: "Conduzir o veículo com equipamento obrigatório ineficiente/inoperante" },
    '167_cinto': { artigo: "167", codigo: "518-51", descricao: "Deixar o condutor de usar o cinto de segurança" },
    '252_celular': { artigo: "252 parágrafo único", codigo: "763-32", descricao: "Dirigir veículo manuseando telefone celular" },
    '181_estacionamento': { artigo: "181 XVII", codigo: "554-11", descricao: "Estacionar em desacordo com a regulamentação especificada pela sinalização" },
    '244_capacete': { artigo: "244 I", codigo: "703-01", descricao: "Conduzir motocicleta, motoneta e ciclomotor sem capacete de segurança." }
};

/**
 * Generates a creative and varied test dataset.
 * @param {number} numberOfReports - The number of reports to generate.
 * @returns {Object} An object containing `reports` and `finalReports`.
 */
function generateCreativeTestData(numberOfReports) {
    const allGeneratedReports = [];

    let reportIdCounter = Date.now() + 1000000; // Use a different starting point to avoid ID clashes
    const today = new Date();

    for (let i = 0; i < numberOfReports; i++) {
        reportIdCounter++;
        const regional = getRandom(Object.keys(regionalMunicipalities));
        const municipio = getRandom(regionalMunicipalities[regional]);
        const opType = getRandom(Object.keys(operationTypes));
        
        const reportDate = new Date(today);
        reportDate.setDate(today.getDate() - getRandomInt(0, 365)); // spread over last year
        const reportDateString = reportDate.toISOString().split('T')[0];
        
        const timestamp = new Date(reportDate);
        timestamp.setHours(getRandomInt(0, 23), getRandomInt(0, 59));

        const gender = getRandom(['Masculino', 'Feminino']);
        const age = getRandomInt(18, 70);
        const condutorNome = `${getRandom(gender === 'Masculino' ? namesMasculino : namesFeminino)} ${getRandom(lastNames)}`;
        const isMoto = Math.random() < 0.4;

        const report = {
            "matricula": getRandom(matrics),
            "chefe-equipe": getRandom(agents),
            "data-operacao": reportDateString,
            "hora-inicial": `${String(getRandomInt(8,16)).padStart(2,'0')}:${String(getRandomInt(0,59)).padStart(2,'0')}`,
            "hora-final": `${String(getRandomInt(17,23)).padStart(2,'0')}:${String(getRandomInt(0,59)).padStart(2,'0')}`,
            "regional": regional,
            "municipio-acao": municipio,
            "operation-type": opType,
            "id": reportIdCounter,
            "timestamp": timestamp.toISOString(),
            "id-type": "Placa",
            "id-value": `RDN${getRandomInt(1000, 9999)}`,
            "vehicle-type": isMoto ? '2 ou 3 rodas' : '4 rodas',
            "driver-gender": gender,
            "driver-age": age,
            "condutor-nome": condutorNome,
            "condutor-cpf": `${getRandomInt(100,999)}.${getRandomInt(100,999)}.${getRandomInt(100,999)}-${getRandomInt(10,99)}`,
            "cnh": `${getRandomInt(10000000000, 99999999999)}`,
            "cnh-categoria": isMoto ? getRandom(['A', 'AB']) : getRandom(['B', 'AB', 'C', 'D', 'E']),
            "abordador": getRandom(agents),
            "isTestData": true,
            "vehicle-disposition": getRandom(['Removido', 'Liberado Art. 270 § 2º', 'Liberado Art. 271 §9º-A', 'Liberado']),
            "criminal-occurrence": "Nenhuma",
            "vehicle-recovered": Math.random() < 0.02, // 2% chance of being recovered
            "observations": "Veículo abordado em fiscalização de rotina.",
        };

        let infractions = [];
        const nonAlcoholInfractions = Object.keys(infractionDefinitions).filter(k => !k.startsWith('165'));

        // Alcohol-related check
        if (Math.random() < 0.3) { // 30% chance of alcohol test
            report.breathalyzer = 'Ativo';
            const alcoholScenario = getRandom(['crime', 'admin', 'recusa', 'recusa_crime']);
            if (alcoholScenario === 'crime') {
                report.resultado = { tipo: '165', valor: getRandomFloat(0.34, 1.2, 2) };
                infractions.push(infractionDefinitions['165_crime']);
                report['criminal-occurrence'] = 'Art. 306 CTB';
            } else if (alcoholScenario === 'admin') {
                report.resultado = { tipo: '165', valor: getRandomFloat(0.05, 0.33, 2) };
                infractions.push(infractionDefinitions['165_admin']);
            } else if (alcoholScenario === 'recusa') {
                report.resultado = { tipo: '165A' };
                infractions.push(infractionDefinitions['165A_recusa']);
            } else { // recusa_crime
                report.resultado = { tipo: 'TC' };
                 infractions.push(infractionDefinitions['165A_recusa']);
                 report['criminal-occurrence'] = 'Art. 306 CTB';
            }
            report['resultado-tipo'] = report.resultado.tipo;
            report['resultado-valor'] = report.resultado.valor?.toString().replace('.', ',');
            report['resultado-teste'] = report.resultado.tipo === '165' ? `Art. 165 - ${report['resultado-valor']}` : report.resultado.tipo;

        } else {
            report.breathalyzer = 'Não';
        }

        // Add other random infractions
        const numOtherInfractions = getRandom([0, 1, 1, 1, 2]);
        for (let j = 0; j < numOtherInfractions; j++) {
            const randomInfractionKey = getRandom(nonAlcoholInfractions);
            infractions.push(infractionDefinitions[randomInfractionKey]);
        }
        
        // Remove duplicates
        infractions = [...new Map(infractions.map(item => [item['codigo'], item])).values()];
        
        report["infractions-data"] = JSON.stringify(infractions.map(inf => ({...inf, numeroAuto: `T${getRandomInt(100000, 999999)}`})));

        allGeneratedReports.push(report);
    }

    // --- CONSOLIDATE INTO FINAL REPORTS ---
    return consolidateReports(allGeneratedReports);
}


/**
 * Consolidates individual reports into final operation reports.
 * @param {Array} generatedReports - Array of individual report objects.
 * @returns {Object} An object containing `reports` and `finalReports`.
 */
function consolidateReports(generatedReports) {
    const allFinalReports = [];

    // Group reports by operation
    const operations = generatedReports.reduce((acc, report) => {
        const opKey = `${report['data-operacao']}|${report['operation-type']}|${report.regional}`;
        if (!acc[opKey]) {
            acc[opKey] = [];
        }
        acc[opKey].push(report);
        return acc;
    }, {});

    // Process each operation to create a final report
    Object.values(operations).forEach(operationReports => {
        if (operationReports.length === 0) return;
        const firstReport = operationReports[0];
        const { counts, infractionCounts, uniqueMunicipios } = aggregateReportData(operationReports);

        const finalReport = {
            'isTestData': true,
            'id-sei': `SEI-${getRandomInt(10000, 99999)}`,
            'acao-desenvolvida': operationTypes[firstReport['operation-type']],
            'relatorio-sei': `Relatorio SEI ${getRandomInt(100, 999)}`,
            'regional': firstReport.regional,
            'observacao': `Operação de teste criativo gerada em ${new Date().toLocaleDateString()}.`,
            'data': firstReport['data-operacao'],
            'municipio': [...uniqueMunicipios].join(', '),
            'endereco': `Local variado em ${[...uniqueMunicipios].join(', ')}`,
            'veiculos-2-rodas': counts.veiculos2Rodas,
            'veiculos-4-rodas': counts.veiculos4Rodas,
            'veiculos-total': counts.veiculosTotal,
            'abordagem-masculina': counts.masculino,
            'abordagem-feminina': counts.feminino,
            'etilometro-negativo': counts.etilometroNegativo,
            'etilometro-infracao': counts.etilometroInfracao,
            'etilometro-crime': counts.etilometroCrime,
            'recusa-165a': counts.recusa165a,
            'recusa-tc-masculino': counts.recusaTcMasc,
            'recusa-tc-feminino': counts.recusaTcFemi,
            'recusa-total': counts.recusa165a + counts.recusaTcMasc + counts.recusaTcFemi,
            'art165-2-rodas': counts.art165_2Rodas,
            'art165-4-rodas': counts.art165_4Rodas,
            'remocao-2-rodas': counts.remocao2Rodas,
            'remocao-4-rodas': counts.remocao4Rodas,
            'total-aits': counts.totalAITs,
            'furto-roubo': counts.furtoRoubo,
            'adulteracoes': Math.random() < 0.1 ? getRandomInt(1, 3) : 0,
            'idade-0-17': counts.idade['0-17'],
            'idade-18-27': counts.idade['18-27'],
            'idade-28-37': counts.idade['28-37'],
            'idade-38-47': counts.idade['38-47'],
            'idade-48-57': counts.idade['48-57'],
            'idade-58-mais': counts.idade['58+'],
            'idade-total': counts.idadeTotal,
            'doc-cnh': counts.docCnh,
            'doc-crlv': counts.docCrlv,
            'filter_startDate': firstReport['data-operacao'],
            'filter_endDate': firstReport['data-operacao'],
            'filter_regional': firstReport.regional,
            'filter_operation': firstReport['operation-type'],
            'id': `final_${Date.now()}_${getRandomInt(100,999)}`,
            'savedAt': new Date().toISOString(),
        };

        // Add the dynamically generated infraction counts
        Object.keys(infractionCounts).forEach(codigo => {
            finalReport[`infraction-${codigo}`] = infractionCounts[codigo].count;
        });

        allFinalReports.push(finalReport);
    });

    return {
        reports: generatedReports,
        finalReports: allFinalReports
    };
}


/**
 * Generates a new massive test dataset based on specific infraction counts.
 */
function generateNewMassiveTestData() {
    const allGeneratedReports = [];

    const infractionsToGenerate = [
        ...Array(300).fill({ type: '165_crime' }),
        ...Array(34).fill({ type: '165A_recusa_crime' }),
        ...Array(50).fill({ type: '165A_recusa' }),
        ...Array(50).fill({ type: '165_admin' }),
        ...Array(50).fill({ type: '162_I' }),
        ...Array(30).fill({ type: '164_cc_162_I' }),
        ...Array(350).fill({ type: '230_V' }),
        ...Array(80).fill({ type: '230_IX' }),
        // "Creative" part for the remainder
        ...Array(14).fill({ type: '167_cinto' }),
        ...Array(14).fill({ type: '252_celular' }),
        ...Array(14).fill({ type: '181_estacionamento' }),
        ...Array(14).fill({ type: '244_capacete' }),
    ];

    // Shuffle the array to distribute infractions randomly across dates/regionals
    for (let i = infractionsToGenerate.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [infractionsToGenerate[i], infractionsToGenerate[j]] = [infractionsToGenerate[j], infractionsToGenerate[i]];
    }

    let reportIdCounter = Date.now();
    const today = new Date();

    infractionsToGenerate.forEach(infractionInfo => {
        reportIdCounter++;
        const regional = getRandom(Object.keys(regionalMunicipalities));
        const municipio = getRandom(regionalMunicipalities[regional]);
        const opType = getRandom(["OLS", "OCG", "2R1V", "ORS", "FC", "PV"]);

        const reportDate = new Date(today);
        reportDate.setDate(today.getDate() - getRandomInt(0, 90)); // spread over last 3 months
        const reportDateString = reportDate.toISOString().split('T')[0];
        
        const timestamp = new Date(reportDate);
        timestamp.setHours(getRandomInt(0, 23), getRandomInt(0, 59));

        const gender = getRandom(['Masculino', 'Feminino']);
        const age = getRandomInt(18, 70);
        const condutorNome = `${getRandom(gender === 'Masculino' ? namesMasculino : namesFeminino)} ${getRandom(lastNames)}`;
        const isMoto = Math.random() < 0.4;

        const report = {
            "matricula": getRandom(matrics),
            "chefe-equipe": getRandom(agents),
            "data-operacao": reportDateString,
            "hora-inicial": `${String(getRandomInt(0,23)).padStart(2,'0')}:${String(getRandomInt(0,59)).padStart(2,'0')}`,
            "hora-final": `${String(getRandomInt(0,23)).padStart(2,'0')}:${String(getRandomInt(0,59)).padStart(2,'0')}`,
            "regional": regional,
            "municipio-acao": municipio,
            "operation-type": opType,
            "id": reportIdCounter,
            "timestamp": timestamp.toISOString(),
            "id-type": "Placa",
            "id-value": `NEW${getRandomInt(1000, 9999)}`,
            "vehicle-type": isMoto ? '2 ou 3 rodas' : '4 rodas',
            "driver-gender": gender,
            "driver-age": age,
            "condutor-nome": condutorNome,
            "condutor-cpf": `${getRandomInt(100,999)}.${getRandomInt(100,999)}.${getRandomInt(100,999)}-${getRandomInt(10,99)}`,
            "cnh": `${getRandomInt(10000000000, 99999999999)}`,
            "cnh-categoria": isMoto ? getRandom(['A', 'AB']) : getRandom(['B', 'AB', 'C', 'D', 'E']),
            "abordador": getRandom(agents),
            "isTestData": true,
            "vehicle-disposition": getRandom(['Removido', 'Liberado Art. 270 § 2º', 'Liberado Art. 271 §9º-A', 'Liberado']),
            "criminal-occurrence": "Nenhuma",
            "vehicle-recovered": Math.random() < 0.05 // 5% chance of being recovered
        };

        let infractions = [];
        
        switch(infractionInfo.type) {
            case '165_crime':
                report['breathalyzer'] = 'Ativo';
                report['resultado-tipo'] = '165';
                report['resultado-valor'] = getRandomFloat(0.34, 1.5, 2).toString().replace('.', ',');
                report['resultado-teste'] = `Art. 165 - ${report['resultado-valor']}`;
                report['criminal-occurrence'] = 'Art. 306 CTB';
                infractions.push(infractionDefinitions['165_crime']);
                break;
            case '165A_recusa_crime':
                report['breathalyzer'] = 'Ativo';
                report['resultado-tipo'] = 'TC';
                report['resultado-teste'] = `TC`;
                report['criminal-occurrence'] = 'Art. 306 CTB';
                infractions.push(infractionDefinitions['165A_recusa']);
                break;
            case '165A_recusa':
                report['breathalyzer'] = 'Ativo';
                report['resultado-tipo'] = '165A';
                report['resultado-teste'] = `165A`;
                infractions.push(infractionDefinitions['165A_recusa']);
                break;
            case '165_admin':
                report['breathalyzer'] = 'Ativo';
                report['resultado-tipo'] = '165';
                report['resultado-valor'] = getRandomFloat(0.05, 0.33, 2).toString().replace('.', ',');
                report['resultado-teste'] = `Art. 165 - ${report['resultado-valor']}`;
                infractions.push(infractionDefinitions['165_admin']);
                break;
            default:
                report['breathalyzer'] = 'Não';
                // Add a random second infraction sometimes for variety
                if (Math.random() < 0.2) {
                     infractions.push(getRandom(Object.values(infractionDefinitions)));
                }
                infractions.push(infractionDefinitions[infractionInfo.type]);
                break;
        }

        report["infractions-data"] = JSON.stringify(infractions.map(inf => ({...inf, numeroAuto: `${getRandomInt(100000, 999999)}`})));

        allGeneratedReports.push(report);
    });

    // --- CONSOLIDATE INTO FINAL REPORTS ---
    return consolidateReports(allGeneratedReports);
}

// Function to load the test data into localStorage
function loadTestData() {
    if (confirm('Deseja carregar um novo e massivo conjunto de dados de teste (~1000 infrações)? Isso substituirá quaisquer dados de teste existentes, mas preservará os dados de operações reais. TODAS as operações de teste serão marcadas como FINALIZADAS.')) {
        try {
            console.log("Gerando novo conjunto de dados de teste...");
            const { reports: newReports, finalReports: newFinalReportsData } = generateNewMassiveTestData();
            console.log(`Gerado ${newReports.length} relatórios individuais e ${newFinalReportsData.length} relatórios finais.`);

            const existingReports = JSON.parse(localStorage.getItem('fiscalizacaoReports') || '[]');
            const existingFinalReports = JSON.parse(localStorage.getItem('fiscalizacaoFinalReports') || '[]');
            
            // Filter out old test data before adding new test data
            const nonTestReports = existingReports.filter(r => !r.isTestData);
            const nonTestFinalReports = existingFinalReports.filter(r => !r.isTestData);

            // Combine non-test data with new test data
            const combinedReports = [...nonTestReports, ...newReports];
            const combinedFinalReports = [...nonTestFinalReports, ...newFinalReportsData];

            localStorage.setItem('fiscalizacaoReports', JSON.stringify(combinedReports));
            localStorage.setItem('fiscalizacaoFinalReports', JSON.stringify(combinedFinalReports));
            
            alert('Novos dados de teste foram carregados com sucesso! A página será atualizada.');
            location.reload();
        } catch (error) {
            console.error("Erro ao carregar dados de teste:", error);
            alert("Ocorreu um erro ao carregar os dados de teste. Verifique o console para mais detalhes.");
        }
    }
}

// Function to load the creative test data into localStorage
function loadCreativeTestData() {
    if (confirm('Deseja carregar um novo conjunto de dados criativos (~500 abordagens)? Isso substituirá quaisquer dados de teste existentes, mas preservará os dados de operações reais.')) {
        try {
            console.log("Gerando novo conjunto de dados criativos de teste...");
            const { reports: newReports, finalReports: newFinalReportsData } = generateCreativeTestData(500);
            console.log(`Gerado ${newReports.length} relatórios individuais e ${newFinalReportsData.length} relatórios finais.`);

            const existingReports = JSON.parse(localStorage.getItem('fiscalizacaoReports') || '[]');
            const existingFinalReports = JSON.parse(localStorage.getItem('fiscalizacaoFinalReports') || '[]');
            
            // Filter out old test data before adding new test data
            const nonTestReports = existingReports.filter(r => !r.isTestData);
            const nonTestFinalReports = existingFinalReports.filter(r => !r.isTestData);

            // Combine non-test data with new test data
            const combinedReports = [...nonTestReports, ...newReports];
            const combinedFinalReports = [...nonTestFinalReports, ...newFinalReportsData];

            localStorage.setItem('fiscalizacaoReports', JSON.stringify(combinedReports));
            localStorage.setItem('fiscalizacaoFinalReports', JSON.stringify(combinedFinalReports));
            
            alert('Novos dados de teste criativos foram carregados com sucesso! A página será atualizada.');
            location.reload();
        } catch (error) {
            console.error("Erro ao carregar dados de teste criativos:", error);
            alert("Ocorreu um erro ao carregar os dados de teste. Verifique o console para mais detalhes.");
        }
    }
}

document.getElementById('load-data-btn')?.addEventListener('click', loadTestData);
document.getElementById('load-creative-data-btn')?.addEventListener('click', loadCreativeTestData);
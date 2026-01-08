/**
 * Aggregates raw report data into summarized counts.
 * @param {Array<Object>} data - An array of raw report objects.
 * @returns {Object} An object containing `counts`, `infractionCounts`, and `uniqueMunicipios`.
 */
export function aggregateReportData(data) {
    const counts = {
        veiculosTotal: data.length,
        veiculos2Rodas: 0, veiculos4Rodas: 0,
        masculino: 0, feminino: 0,
        etilometroNegativo: 0, etilometroInfracao: 0, etilometroCrime: 0,
        recusa165a: 0, recusaTcMasc: 0, recusaTcFemi: 0,
        art165_2Rodas: 0, art165_4Rodas: 0,
        remocao2Rodas: 0, remocao4Rodas: 0,
        furtoRoubo: 0,
        idade: { '0-17': 0, '18-27': 0, '28-37': 0, '38-47': 0, '48-57': 0, '58+': 0 },
        idadeTotal: 0,
        docCnh: 0, docCrlv: 0,
        totalAITs: 0
    };

    const infractionCounts = {};
    const uniqueMunicipios = new Set();

    data.forEach(r => {
        if (r['municipio-acao']) {
            uniqueMunicipios.add(r['municipio-acao']);
        }
        if (r['vehicle-type'] === '2 ou 3 rodas') counts.veiculos2Rodas++;
        else counts.veiculos4Rodas++;

        if (r['vehicle-disposition'] === 'Removido') {
            if (r['vehicle-type'] === '2 ou 3 rodas') {
                counts.remocao2Rodas++;
            } else {
                counts.remocao4Rodas++;
            }
        }

        if (r['vehicle-recovered'] === true || r['vehicle-recovered'] === "true") {
            counts.furtoRoubo++;
        }

        if (r['driver-gender'] === 'Masculino') counts.masculino++;
        else if (r['driver-gender'] === 'Feminino') counts.feminino++;

        const age = parseInt(r['driver-age'], 10);
        if (age) {
            counts.idadeTotal++;
            if (age <= 17) counts.idade['0-17']++;
            else if (age <= 27) counts.idade['18-27']++;
            else if (age <= 37) counts.idade['28-37']++;
            else if (age <= 47) counts.idade['38-47']++;
            else if (age <= 57) counts.idade['48-57']++;
            else counts.idade['58+']++;
        }

        const resultadoTipo = r['resultado-tipo'];
        if (resultadoTipo === 'Negativo') counts.etilometroNegativo++;
        else if (resultadoTipo === '165A') counts.recusa165a++;
        else if (resultadoTipo === 'TC') {
            if (r['driver-gender'] === 'Masculino') counts.recusaTcMasc++;
            else counts.recusaTcFemi++;
        } else if (resultadoTipo === '165') {
            const valor = parseFloat(r['resultado-valor']?.replace(',', '.'));
            if (!isNaN(valor)) {
                if (valor <= 0.33) counts.etilometroInfracao++;
                else counts.etilometroCrime++;
            }
            if (r['vehicle-type'] === '2 ou 3 rodas') counts.art165_2Rodas++;
            else counts.art165_4Rodas++;
        }

        const infraData = r['infractions-data'];
        const infractionsList = (typeof infraData === 'string' && infraData.length > 2) ? JSON.parse(infraData) : [];
        counts.totalAITs += infractionsList.length;

        infractionsList.forEach(inf => {
            if (!infractionCounts[inf.codigo]) {
                infractionCounts[inf.codigo] = {
                    count: 0,
                    label: `Art. ${inf.artigo} (${inf.codigo})`
                };
            }
            infractionCounts[inf.codigo].count++;

            if (inf.artigo === '232') {
                const descLower = inf.descricao.toLowerCase();
                if (descLower.includes('cnh') || descLower.includes('acc') || descLower.includes('ppd')) counts.docCnh++;
                if (descLower.includes('crlv') || descLower.includes('crv')) counts.docCrlv++;
            }
        });
    });

    return { counts, infractionCounts, uniqueMunicipios };
}
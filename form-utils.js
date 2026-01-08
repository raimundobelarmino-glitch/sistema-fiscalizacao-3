/**
 * Automatically converts the input value to uppercase while preserving cursor position.
 * @param {HTMLInputElement} inputElement - The input element to apply the transformation to.
 */
export function autoUppercase(inputElement) {
    inputElement.addEventListener('input', (e) => {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toUpperCase();
        e.target.setSelectionRange(start, end);
    });
}

/**
 * Formats an input's value to a CPF format (000.000.000-00) as the user types.
 * @param {HTMLInputElement} inputElement - The input element for the CPF.
 */
export function formatCpf(inputElement) {
    inputElement.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) {
            value = value.substring(0, 11);
        }

        let formattedValue = value;
        if (value.length > 9) {
            formattedValue = `${value.substring(0, 3)}.${value.substring(3, 6)}.${value.substring(6, 9)}-${value.substring(9)}`;
        } else if (value.length > 6) {
            formattedValue = `${value.substring(0, 3)}.${value.substring(3, 6)}.${value.substring(6)}`;
        } else if (value.length > 3) {
            formattedValue = `${value.substring(0, 3)}.${value.substring(3)}`;
        }
        e.target.value = formattedValue;
    });
}

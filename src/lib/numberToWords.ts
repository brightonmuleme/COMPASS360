export function numberToWords(amount: number): string {
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Million', 'Billion'];

    if (amount === 0) return 'Zero';

    const formatChunk = (n: number): string => {
        if (n === 0) return '';
        if (n < 20) return units[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
        return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + formatChunk(n % 100) : '');
    };

    let words = '';
    let scaleIndex = 0;

    // Split into integer and decimal parts
    const parts = amount.toString().split('.');
    let integerPart = parseInt(parts[0], 10);

    while (integerPart > 0) {
        const chunk = integerPart % 1000;
        if (chunk !== 0) {
            const chunkText = formatChunk(chunk);
            words = chunkText + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + (words ? ' ' + words : '');
        }
        integerPart = Math.floor(integerPart / 1000);
        scaleIndex++;
    }

    // Handle currency suffix if needed, but for now just returning words
    return words.trim();
}

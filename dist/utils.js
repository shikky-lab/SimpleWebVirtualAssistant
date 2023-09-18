export function isEnglishSentence(text, readCharacters = 50) {
    // 先頭から最大で50文字目までの部分文字列を取得
    const subText = text.substring(0, readCharacters);
    // 英語のアルファベット（大文字、小文字）や数字、一般的な記号を判定に加える
    const englishPattern = /^[a-zA-Z0-9\s.,!?'"()\-:;]*$/;
    return englishPattern.test(subText);
}
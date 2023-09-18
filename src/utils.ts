
export const isEnglishSentence=(text:string,readCharacters:number=50):boolean =>{
    // 先頭から最大で50文字目までの部分文字列を取得
    const subText = text.substring(0, readCharacters);

    // 英語のアルファベット（大文字、小文字）や数字、一般的な記号を判定に加える
    const englishPattern = /^[a-zA-Z0-9\s.,!?'"()\-:;]*$/;

    return englishPattern.test(subText);
}

export const playAudio=(audio:HTMLAudioElement,timeout:number=0)=>{
    return new Promise(res=>{
        audio.play()
        if(timeout) {
            setTimeout(res,timeout)
        }
        else{//再生が終わったらresolveする
            audio.onended = res
        }
    })
}
(() => {
    const keywordPriority = ["R1", "P", "CL", "TM", "D", "C", "컨설팅"];
    const keywordMap = {
        "컷": "C",
        "펌": "P",
        "컬러": "CL",
        "클리닉": "TM",
        "드라이": "D",
        "R1": "R1",
        "부분펌": "P",
        "컨설팅": "컨설팅"
    };

    const frameId = 'mainFrame';
    let observer = null;
    let mutationTimeout = null;
    let lastProcessTime = 0;
    const PROCESS_INTERVAL = 1000; // 최소 처리 간격 (1초)
    const DEBOUNCE_DELAY = 500; // 디바운스 지연 시간 (0.5초)

    // iframe 문서 감시 초기화
    function initializeObserver() {
        const frame = document.getElementById(frameId);
        if (frame && frame.contentDocument && frame.contentDocument.body) {
            if (observer) observer.disconnect();

            observer = new MutationObserver(processMutations);
            observer.observe(frame.contentDocument.body, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeFilter: ['value', 'textContent'] // 필요한 속성만 감시
            });

            console.log('✅ Mutation Observer가 (재)시작되었습니다.');
            process();
        } else {
            console.warn('⚠️ iframe 내부 문서 또는 body에 접근할 수 없습니다.');
        }
    }

    // 변경 감지 처리 (디바운싱 적용)
    function processMutations(mutationsList, observer) {
        if (mutationTimeout) clearTimeout(mutationTimeout);
        mutationTimeout = setTimeout(() => {
            const now = Date.now();
            if (now - lastProcessTime >= PROCESS_INTERVAL) {
                try {
                    process();
                    lastProcessTime = now;
                } catch (err) {
                    console.error("❌ process() 실행 중 오류:", err);
                }
            }
        }, DEBOUNCE_DELAY);
    }

    // 주요 처리 함수
    const process = () => {
        const frame = document.getElementById(frameId);
        if (!frame?.contentDocument?.body) {
            console.warn('⚠️ iframe 또는 내부 문서가 없습니다.');
            return;
        }

        const frameDoc = frame.contentDocument;
        const processedElements = new Set(); // 이미 처리된 요소 추적

        // strMemo_ 텍스트 영역 처리
        try {
            const timeTblDivs = frameDoc.querySelectorAll('textarea[id^="strMemo_"]');
            timeTblDivs.forEach(textarea => {
                const idMatch = textarea.id.match(/strMemo_(\d+)/);
                if (!idMatch) return;

                const number = idMatch[1];
                if (processedElements.has(number)) return;
                processedElements.add(number);

                const memoText = textarea.value;
                const serviceMenuMatch = memoText.match(/예약시술메뉴\s*:\s*(.*?)\s*2024년/);
                if (!serviceMenuMatch) return;

                const serviceText = serviceMenuMatch[1];
                const foundCodes = Object.entries(keywordMap)
                    .filter(([keyword, code]) => serviceText.includes(keyword))
                    .map(([keyword, code]) => code);

                if (foundCodes.length === 0) return;

                const selectedCode = keywordPriority.find(pri => foundCodes.includes(pri));
                if (!selectedCode) return;

                const target = frameDoc.querySelector(`div[event_id="${number}"] div.dhx_body a.regLink span.menuType span`);
                if (target && target.textContent !== selectedCode) {
                    target.textContent = selectedCode;
                }

                if (memoText.includes('요청사항:')) {
                    const targetTitleDiv = frameDoc.querySelector(`div[event_id="${number}"] div.dhx_event_move.dhx_title`);
                    if (targetTitleDiv) {
                        targetTitleDiv.textContent = "요청사항 확인";
                        targetTitleDiv.style.background = "#546679";
                        targetTitleDiv.style.color = "#ffffff";
                        targetTitleDiv.style.fontWeight = "bold";
                    }
                }
            });
        } catch (err) {
            console.error("❌ strMemo_ 처리 중 오류:", err);
        }

        // rDetail 및 rInner 처리
        try {
            const rDetails = frameDoc.querySelectorAll('div.rDetail');
            rDetails.forEach(rDetail => {
                const nrRMemo = rDetail.querySelector('div > dl > dd:last-child > div.nrRMemo');
                if (!nrRMemo) return;

                const rInner = rDetail.parentElement.querySelector('div.rInner');
                if (!rInner) return;

                if (nrRMemo.textContent.includes('요청사항:')) {
                    rInner.style.boxShadow = 'inset 0 0 0 2px red';
                }
            });
        } catch (err) {
            console.error("❌ rDetail 처리 중 오류:", err);
        }
    };

    // iframe 로드 완료 시 observer 초기화
    const frameElement = document.getElementById(frameId);
    if (frameElement) {
        frameElement.addEventListener('load', initializeObserver);

        if (frameElement.contentDocument?.readyState === 'complete') {
            initializeObserver();
        }
    } else {
        console.error('❌ mainFrame 요소를 찾을 수 없습니다.');
    }

    // window 로드 시 초기화 백업
    if (document.readyState === 'complete') {
        initializeObserver();
    } else {
        window.addEventListener('load', () => {
            const frame = document.getElementById(frameId);
            if (frame?.contentDocument?.readyState === 'complete') {
                initializeObserver();
            } else {
                setTimeout(initializeObserver, 500);
            }
        });
    }
})();

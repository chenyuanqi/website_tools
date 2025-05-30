// 极简测试 content script
console.log('=== 测试脚本开始 ===');
console.log('当前时间:', new Date().toISOString());
console.log('当前URL:', window.location.href);
console.log('当前域名:', window.location.hostname);
console.log('DOM状态:', document.readyState);

// 简单的CSS注入测试
try {
    const testStyle = document.createElement('style');
    testStyle.textContent = 'body { border: 2px solid red !important; }';
    document.head.appendChild(testStyle);
    console.log('CSS注入测试：成功');
} catch (e) {
    console.error('CSS注入测试：失败', e);
}

// 消息监听测试
try {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('收到测试消息:', request);
        sendResponse({ success: true, timestamp: Date.now() });
        return true;
    });
    console.log('消息监听器设置：成功');
} catch (e) {
    console.error('消息监听器设置：失败', e);
}

console.log('=== 测试脚本完成 ==='); 
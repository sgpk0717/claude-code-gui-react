// 브라우저 콘솔에 복사하여 실행할 디버그 스크립트
(() => {
  console.log('=== Debugging Drag Issue ===');
  
  // 모든 draggable window 찾기
  const windows = document.querySelectorAll('.react-draggable');
  console.log(`Found ${windows.length} draggable windows`);
  
  windows.forEach((win, index) => {
    const resizable = win.querySelector('.react-resizable');
    const innerDiv = resizable?.querySelector('.bg-white.border.rounded-lg');
    
    console.log(`\nWindow ${index + 1}:`);
    console.log('- Draggable element:', win);
    console.log('- Transform:', win.style.transform);
    console.log('- Resizable element:', resizable);
    if (resizable) {
      console.log('- Resizable size:', {
        width: resizable.style.width,
        height: resizable.style.height
      });
    }
    if (innerDiv) {
      console.log('- Inner div style:', {
        width: innerDiv.style.width,
        height: innerDiv.style.height
      });
      console.log('- Inner div actual size:', {
        width: innerDiv.offsetWidth,
        height: innerDiv.offsetHeight
      });
    }
    
    // mousedown 이벤트 리스너 추가
    const header = win.querySelector('.window-header');
    if (header) {
      const originalMouseDown = header.onmousedown;
      header.addEventListener('mousedown', (e) => {
        console.log('\n=== MOUSEDOWN EVENT ===');
        console.log('Before mousedown:');
        console.log('- Resizable size:', resizable?.style.width, 'x', resizable?.style.height);
        console.log('- Inner div size:', innerDiv?.offsetWidth, 'x', innerDiv?.offsetHeight);
        
        setTimeout(() => {
          console.log('After mousedown (0ms):');
          console.log('- Resizable size:', resizable?.style.width, 'x', resizable?.style.height);
          console.log('- Inner div size:', innerDiv?.offsetWidth, 'x', innerDiv?.offsetHeight);
          
          // React의 상태 업데이트 확인
          const reactProps = Object.keys(win).find(key => key.startsWith('__reactInternalInstance'));
          if (reactProps) {
            console.log('React internal state:', win[reactProps]);
          }
        }, 0);
      });
    }
  });
  
  console.log('\nDebug script loaded. Try dragging a window now.');
})();
import React, { useState, KeyboardEvent, ChangeEvent, useEffect, useRef } from 'react';

interface InputControllerProps {
  /** 메시지가 확정되었을 때 호출될 콜백 함수 */
  onSendMessage: (message: string) => void;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 버튼 텍스트 */
  buttonText?: string;
  /** 비활성화 상태 */
  disabled?: boolean;
}

/**
 * 사용자 입력을 처리하고 부모 컴포넌트로 메시지를 전송하는 컨트롤러 컴포넌트입니다.
 * 한글 입력 중복 문제를 해결하기 위해 Composition Event를 올바르게 처리합니다.
 */
export const InputController: React.FC<InputControllerProps> = ({ 
  onSendMessage, 
  placeholder = "메시지를 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)",
  buttonText = "전송",
  disabled = false
}) => {
  // 입력창의 현재 값을 관리하는 state입니다.
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * 키보드 입력 이벤트를 처리하는 핸들러입니다.
   * @param {KeyboardEvent<HTMLTextAreaElement>} e - 키보드 이벤트 객체
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // ✨ 핵심 해결책 ✨
    // e.nativeEvent.isComposing은 현재 IME 조합 세션이 활성 상태인지 (예: 한글 조합 중) 알려주는
    // 브라우저 네이티브 속성입니다. 이 값이 true이면, 사용자가 조합을 완료하기 위해 Enter를 누른 것일 수 있으므로,
    // 전송 로직을 실행하지 않고 즉시 함수를 종료해야 합니다.
    // 이를 통해 마지막 글자 중복 입력 버그를 원천적으로 방지합니다.
    if (e.nativeEvent.isComposing) {
      return;
    }

    // Shift 키를 누르지 않은 상태에서 Enter 키가 눌렸을 때만 메시지를 전송합니다.
    // 이를 통해 사용자는 Shift+Enter로 줄바꿈을 할 수 있습니다.
    if (e.key === 'Enter' && !e.shiftKey) {
      // 기본 동작(줄바꿈 또는 폼 제출)을 막습니다.
      e.preventDefault();

      const trimmedValue = inputValue.trim();
      // 입력값이 공백이 아닐 경우에만 메시지를 전송합니다.
      if (trimmedValue && !disabled) {
        onSendMessage(trimmedValue);
        // 메시지 전송 후 입력창을 비웁니다.
        setInputValue('');
      }
    }
  };

  /**
   * 입력창의 내용이 변경될 때마다 state를 업데이트하는 핸들러입니다.
   * @param {ChangeEvent<HTMLTextAreaElement>} e - 변경 이벤트 객체
   */
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  /**
   * 전송 버튼 클릭 이벤트를 처리하는 핸들러입니다.
   */
  const handleSendClick = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !disabled) {
      onSendMessage(trimmedValue);
      setInputValue('');
    }
  };

  /**
   * textarea 높이를 내용에 맞게 자동 조절하는 함수입니다.
   */
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120); // 최대 120px
      textareaRef.current.style.height = `${newHeight}px`;
    }
  };

  // 입력값이 변경될 때마다 textarea 높이를 조절합니다.
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  return (
    <div className="border-t bg-gray-50 p-3">
      <div className="flex space-x-2">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none 
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
          `}
          style={{ minHeight: '40px', maxHeight: '120px' }}
          rows={1}
        />
        <button
          onClick={handleSendClick}
          disabled={!inputValue.trim() || disabled}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap
            ${!inputValue.trim() || disabled 
              ? 'bg-gray-400 cursor-not-allowed text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
          `}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}; 
import React, { useState, KeyboardEvent, ChangeEvent, useEffect, useRef, DragEvent } from 'react';

interface InputControllerProps {
  /** 메시지가 확정되었을 때 호출될 콜백 함수 */
  onSendMessage: (message: string) => void;
  /** 키 입력이 있을 때 호출될 콜백 함수 (Esc 등 특수키용) */
  onKeyInput?: (key: string) => void;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 버튼 텍스트 */
  buttonText?: string;
  /** 비활성화 상태 */
  disabled?: boolean;
  /** 세션 ID */
  sessionId?: string;
  /** Socket ID */
  socketId?: string;
}

/**
 * 사용자 입력을 처리하고 부모 컴포넌트로 메시지를 전송하는 컨트롤러 컴포넌트입니다.
 * 한글 입력 중복 문제를 해결하기 위해 Composition Event를 올바르게 처리합니다.
 */
interface AttachedImage {
  id: string;
  file: File;
  url: string;
  path?: string;
}

export const InputController: React.FC<InputControllerProps> = ({ 
  onSendMessage, 
  onKeyInput,
  placeholder = "Claude에게 메시지를 입력하세요... (Enter: 전송)",
  buttonText = "전송",
  disabled = false,
  sessionId,
  socketId
}) => {
  // 입력창의 현재 값을 관리하는 state입니다.
  const [inputValue, setInputValue] = useState('');
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Esc 키는 터미널로 직접 전송 (vim 나가기, 명령어 취소 등)
    if (e.key === 'Escape') {
      e.preventDefault();
      if (onKeyInput && !disabled) {
        onKeyInput('\x1b'); // ESC 문자 전송
      }
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
  const handleSendClick = async () => {
    const trimmedValue = inputValue.trim();
    if ((trimmedValue || attachedImages.length > 0) && !disabled) {
      // 이미지가 있으면 먼저 업로드
      if (attachedImages.length > 0) {
        try {
          const uploadedImages = await uploadImages(attachedImages);
          const imagePaths = uploadedImages.map(img => `이미지를 분석해주세요: ${img.path}`).join('\n');
          const messageWithImages = trimmedValue 
            ? `${trimmedValue}\n\n${imagePaths}`
            : imagePaths;
          onSendMessage(messageWithImages);
        } catch (error) {
          console.error('Failed to upload images:', error);
          // 업로드 실패해도 메시지는 전송
          onSendMessage(trimmedValue);
        }
      } else {
        onSendMessage(trimmedValue);
      }
      setInputValue('');
      setAttachedImages([]);
    }
  };

  /**
   * 이미지 업로드 함수
   */
  const uploadImages = async (images: AttachedImage[]): Promise<AttachedImage[]> => {
    const uploadPromises = images.map(async (image) => {
      const formData = new FormData();
      formData.append('image', image.file);
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }
      
      const headers: HeadersInit = {};
      if (socketId) {
        headers['x-socket-id'] = socketId;
      }
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      const data = await response.json();
      return { ...image, path: data.path };
    });
    
    return Promise.all(uploadPromises);
  };

  /**
   * 이미지 파일 선택 처리
   */
  const handleImageSelect = (files: FileList | null) => {
    if (!files) return;
    
    const newImages: AttachedImage[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const id = `${Date.now()}-${i}`;
        const url = URL.createObjectURL(file);
        newImages.push({ id, file, url });
      }
    }
    
    setAttachedImages(prev => [...prev, ...newImages]);
  };

  /**
   * 이미지 제거
   */
  const handleRemoveImage = (id: string) => {
    setAttachedImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      // URL 해제
      const removed = prev.find(img => img.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.url);
      }
      return filtered;
    });
  };

  /**
   * 드래그 이벤트 처리
   */
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // 자식 요소로 이동할 때는 무시
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    handleImageSelect(files);
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

  // 컴포넌트 언마운트 시 URL 정리
  useEffect(() => {
    return () => {
      attachedImages.forEach(img => {
        URL.revokeObjectURL(img.url);
      });
    };
  }, []);

  return (
    <div 
      className={`border-t bg-gray-50 ${isDragging ? 'bg-blue-50' : ''} transition-colors relative`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 이미지 썸네일 영역 */}
      {attachedImages.length > 0 && (
        <div className="p-3 pb-0">
          <div className="flex flex-wrap gap-2">
            {attachedImages.map(image => (
              <div 
                key={image.id} 
                className="relative group"
              >
                <img 
                  src={image.url} 
                  alt={image.file.name}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                />
                <button
                  onClick={() => handleRemoveImage(image.id)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs text-center px-1 break-all">
                    {image.file.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 입력 영역 */}
      <div className="p-3">
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
          
          {/* 이미지 업로드 버튼 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className={`
              px-3 py-2 rounded-lg transition-colors
              ${disabled 
                ? 'bg-gray-200 cursor-not-allowed text-gray-400' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }
            `}
            title="이미지 첨부"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </button>
          
          <button
            onClick={handleSendClick}
            disabled={(!inputValue.trim() && attachedImages.length === 0) || disabled}
            className={`
              px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap
              ${(!inputValue.trim() && attachedImages.length === 0) || disabled 
                ? 'bg-gray-400 cursor-not-allowed text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            {buttonText}
          </button>
        </div>
      </div>

      {/* 드래그 오버레이 */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-90 flex items-center justify-center pointer-events-none z-10">
          <div className="text-blue-600 text-lg font-medium">
            이미지를 여기에 놓으세요
          </div>
        </div>
      )}

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleImageSelect(e.target.files)}
        className="hidden"
      />
    </div>
  );
}; 
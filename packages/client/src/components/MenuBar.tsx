import { useState } from 'react';
import { LayoutTemplate, ClaudeSession } from '@claude-gui/shared';

interface MenuBarProps {
  sessions: ClaudeSession[];
  availableTemplates: LayoutTemplate[];
  onCreateSession: () => void;
  onApplyTemplate: (templateId: string) => void;
  onToggleSidebar?: () => void;
}

export function MenuBar({ 
  sessions, 
  availableTemplates, 
  onCreateSession, 
  onApplyTemplate,
  onToggleSidebar 
}: MenuBarProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  return (
    <div className="h-14 bg-gray-800 text-white flex items-center justify-between px-4 shadow-lg border-b border-gray-700">
      {/* 좌측: 사이드바 토글 및 로고 */}
      <div className="flex items-center space-x-3 flex-1">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-700 rounded-md transition-colors"
            title="사이드바 토글"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-sm font-bold">
          C
        </div>
        <h1 className="text-lg font-semibold">Claude Code GUI</h1>
      </div>

      {/* 중앙: 버튼들 */}
      <div className="flex items-center justify-center space-x-3 flex-1">
        {/* 새 세션 버튼 */}
        <button
          onClick={onCreateSession}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          + 새 세션
        </button>

        {/* 레이아웃 템플릿 드롭다운 */}
        {availableTemplates.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              📐 레이아웃 ({availableTemplates.length})
            </button>
            
            {showTemplates && (
              <div className="absolute top-full mt-1 left-0 bg-white text-black rounded-md shadow-lg z-50 min-w-48">
                {availableTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      onApplyTemplate(template.id);
                      setShowTemplates(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-gray-600">{template.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 우측 상태 정보 */}
      <div className="flex items-center justify-end space-x-4 flex-1">
        <div className="text-sm">
          <span className="text-gray-300">세션:</span>
          <span className="ml-1 font-medium">{sessions.length}</span>
        </div>
        
        {sessions.length > 0 && (
          <div className="text-sm">
            <span className="text-gray-300">활성:</span>
            <span className="ml-1 font-medium">
              {sessions.find(i => i.isActive)?.name || 'None'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
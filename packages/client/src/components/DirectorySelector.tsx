import React, { useState } from 'react';
import { isElectron, selectDirectory } from '../utils/electron';

interface DirectorySelectorProps {
  onSelect: (directory: string, name?: string) => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function DirectorySelector({ onSelect, onCancel, isOpen }: DirectorySelectorProps) {
  const [selectedPath, setSelectedPath] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [recentPaths] = useState([
    '/Users/seonggukpark/Projects',
    '/Users/seonggukpark/Desktop',
    '/Users/seonggukpark/Documents',
    '/Users/seonggukpark/claude-code-gui',
  ]);

  const handlePathSelect = (path: string) => {
    setSelectedPath(path);
    setSessionName(path.split('/').pop() || '');
  };

  const handleConfirm = () => {
    if (selectedPath) {
      onSelect(selectedPath, sessionName || undefined);
      setSelectedPath('');
      setSessionName('');
    }
  };

  const handleCancel = () => {
    setSelectedPath('');
    setSessionName('');
    onCancel();
  };

  const handleSelectWithFinder = async () => {
    const path = await selectDirectory();
    if (path) {
      handlePathSelect(path);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
        <h2 className="text-xl font-bold mb-4">새 Claude 세션 생성</h2>
        
        
        {/* 세션 이름 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            세션 이름
          </label>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="자동 생성됨"
          />
        </div>

        {/* 경로 입력 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            작업 디렉토리
          </label>
          <input
            type="text"
            value={selectedPath}
            onChange={(e) => setSelectedPath(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="/path/to/your/project"
          />
        </div>

        {/* 경로 선택 방법 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            작업 폴더 선택
          </label>
          
          {/* Electron 환경에서만 Finder 버튼 표시 */}
          {isElectron() && (
            <button
              onClick={handleSelectWithFinder}
              className="w-full mb-3 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-300 flex items-center justify-center gap-2 transition-colors"
            >
              <span className="text-lg">📁</span>
              <span>Finder에서 폴더 선택</span>
            </button>
          )}
          
          <div className="text-sm font-medium text-gray-700 mb-2">
            최근 경로:
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {recentPaths.map((path, index) => (
              <button
                key={index}
                onClick={() => handlePathSelect(path)}
                className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded border text-gray-700"
              >
                {path}
              </button>
            ))}
          </div>
        </div>

        {/* 빠른 시작 버튼들 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            빠른 시작
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handlePathSelect('/Users/seonggukpark')}
              className="px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200"
            >
              🏠 홈
            </button>
            <button
              onClick={() => handlePathSelect('/Users/seonggukpark/Desktop')}
              className="px-3 py-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-200"
            >
              🖥️ 데스크톱
            </button>
            <button
              onClick={() => handlePathSelect('/Users/seonggukpark/Documents')}
              className="px-3 py-2 text-sm bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded border border-yellow-200"
            >
              📄 문서
            </button>
            <button
              onClick={() => handlePathSelect('/Users/seonggukpark/claude-code-gui')}
              className="px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 rounded border border-purple-200"
            >
              💻 현재 프로젝트
            </button>
          </div>
        </div>

        {/* 버튼들 */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedPath}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md"
          >
            생성
          </button>
        </div>
      </div>
    </div>
  );
}
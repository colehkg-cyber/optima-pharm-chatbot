'use client';

import React from 'react';

interface Source {
  doc_name: string;
  page_number: number;
  section_title: string;
  snippet: string;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  safety_notice?: string;
  isLoading?: boolean;
}

export default function ChatMessage({ role, content, sources, safety_notice, isLoading }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm ${
        isUser ? 'bg-green-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
      }`}>
        {/* 텍스트 내용 */}
        <div className="whitespace-pre-wrap leading-relaxed">
          {isLoading ? (
            <div className="flex space-x-2 py-2">
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          ) : (
            content
          )}
        </div>

        {/* 출처 카드 (AI 답변인 경우에만 표시) */}
        {!isUser && sources && sources.length > 0 && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold text-gray-400 mb-3 flex items-center">
              <span className="mr-2">📄</span> 참고한 약사님 지식
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {sources.map((source, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 text-xs border border-gray-200">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-green-700 truncate mr-2">{source.doc_name}</span>
                    <span className="text-gray-500 whitespace-nowrap">p.{source.page_number}</span>
                  </div>
                  <div className="text-gray-400 text-[10px] mb-2">{source.section_title}</div>
                  <div className="text-gray-600 italic line-clamp-2">"...{source.snippet}"</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 안전 문구 */}
        {!isUser && safety_notice && !isLoading && (
          <div className="mt-4 text-[10px] text-gray-400 italic bg-gray-50 p-2 rounded border-l-2 border-orange-300">
            {safety_notice}
          </div>
        )}
      </div>
    </div>
  );
}

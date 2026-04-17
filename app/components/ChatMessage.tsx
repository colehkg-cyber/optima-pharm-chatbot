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
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%]`}>
        {!isUser && (
          <div className="flex items-center mb-1 ml-1">
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm mr-2 overflow-hidden border border-gray-200">
               <span className="text-lg">💊</span>
            </div>
            <span className="text-xs text-gray-600 font-bold">정해성 약사</span>
          </div>
        )}
        
        <div className="flex items-end gap-1">
          {isUser && <span className="text-[10px] text-gray-500 mb-1">오전 10:00</span>}
          
          <div className={`rounded-xl p-3 shadow-sm text-sm ${
            isUser 
              ? 'bg-[#fee500] text-black rounded-tr-none' 
              : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
          }`}>
            {isLoading ? (
              <div className="flex space-x-1 py-1">
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
            )}
          </div>

          {!isUser && <span className="text-[10px] text-gray-500 mb-1">오전 10:01</span>}
        </div>

        {/* 출처 카드 (AI 답변인 경우에만 표시) */}
        {!isUser && sources && sources.length > 0 && (
          <div className="mt-2 ml-10 w-full">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-[10px] font-bold text-gray-500">📄 참고 자료</span>
            </div>
            <div className="flex flex-col gap-2">
              {sources.map((source, idx) => (
                <div key={idx} className="bg-white/60 backdrop-blur-sm rounded-lg p-2 text-[11px] border border-gray-200/50 shadow-sm max-w-[280px]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-green-800 truncate">{source.doc_name}</span>
                    <span className="text-gray-500 font-medium ml-2">p.{source.page_number}</span>
                  </div>
                  <div className="text-gray-600 line-clamp-2 leading-snug">"...{source.snippet}"</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 안전 문구 */}
        {!isUser && safety_notice && !isLoading && (
          <div className="mt-2 ml-10 text-[9px] text-gray-500 leading-tight bg-black/5 p-2 rounded-lg border border-black/5">
            {safety_notice}
          </div>
        )}
      </div>
    </div>
  );
}

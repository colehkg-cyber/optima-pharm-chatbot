'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);

  return (
    <div className={`flex w-full mb-5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[90%] md:max-w-[80%]`}>
        {/* 프로필 및 이름 (상대방일 때만) */}
        {!isUser && (
          <div className="flex items-center mb-1 ml-1">
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm mr-2 border border-gray-100 overflow-hidden text-lg">
               💊
            </div>
            <span className="text-[12px] text-gray-600 font-bold">정해성 약사</span>
          </div>
        )}
        
        <div className={`flex items-end gap-1.5 ${isUser ? 'flex-row' : 'flex-row-reverse'}`}>
          {/* 말풍선 */}
          <div className={`rounded-2xl px-3 py-2.5 text-[14px] shadow-sm leading-relaxed ${
            isUser 
              ? 'bg-[#fee500] text-[#3c3c3e] rounded-tr-none' 
              : 'bg-white text-[#1a1a1a] rounded-tl-none border border-gray-100'
          }`}>
            {isLoading ? (
              <div className="flex space-x-1.5 py-1 px-2">
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-blue-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {/* 출처 버튼 (Perplexity 스타일 토글) */}
        {!isUser && sources && sources.length > 0 && (
          <div className="mt-2 ml-1">
            <button 
              onClick={() => setIsSourcesOpen(!isSourcesOpen)}
              className="flex items-center gap-1.5 px-2 py-1 bg-white/50 border border-gray-200 rounded-full text-[10px] text-gray-500 hover:bg-white transition-colors shadow-sm"
            >
              <span className="opacity-70">📄</span>
              <span className="font-bold">근거 자료 {sources.length}개</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="10" height="10" 
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-200 ${isSourcesOpen ? 'rotate-180' : ''}`}
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            {isSourcesOpen && (
              <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                {sources.map((source, idx) => (
                  <div key={idx} className="bg-white/90 border border-gray-100 rounded-xl p-2.5 shadow-sm max-w-[280px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-green-800 truncate flex-1">{source.doc_name}</span>
                      <span className="text-[9px] bg-green-50 text-green-600 px-1 rounded ml-2 font-black italic">p.{source.page_number}</span>
                    </div>
                    <p className="text-gray-500 text-[10px] leading-snug line-clamp-2 italic">
                      "...{source.snippet}..."
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 안전 문구 */}
        {!isUser && safety_notice && !isLoading && (
          <div className="mt-3 ml-1 text-[9px] text-gray-400 leading-tight max-w-[250px]">
            {safety_notice}
          </div>
        )}
      </div>
    </div>
  );
}

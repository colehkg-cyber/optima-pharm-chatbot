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
          <div className={`relative rounded-2xl px-3 py-2 text-[14px] shadow-sm leading-relaxed ${
            isUser 
              ? 'bg-[#fee500] text-[#3c3c3e] rounded-tr-none' 
              : 'bg-white text-[#1a1a1a] rounded-tl-none border border-gray-100'
          }`}>
            {/* 말풍선 꼬리 */}
            <div className={`absolute top-0 w-2 h-3 ${isUser ? '-right-1.5 bg-[#fee500]' : '-left-1.5 bg-white'}`}
                 style={{ 
                   clipPath: isUser ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)',
                   display: isLoading ? 'none' : 'block'
                 }}>
            </div>

            {isLoading ? (
              <div className="flex space-x-1.5 py-1.5 px-2">
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none prose-p:my-0 prose-headings:my-1 prose-strong:text-green-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </div>
          {!isLoading && <span className="text-[10px] text-gray-500 mb-0.5 whitespace-nowrap opacity-60">오후 2:30</span>}
        </div>

        {/* 출처 버튼 (Perplexity 스타일 토글) */}
        {!isUser && sources && sources.length > 0 && (
          <div className="mt-2 ml-1">
            <button 
              onClick={() => setIsSourcesOpen(!isSourcesOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-white/40 border border-gray-200/50 rounded-full text-[10px] text-gray-600 hover:bg-white transition-all shadow-sm"
            >
              <span className="opacity-70">📑</span>
              <span className="font-bold">약사님 지식 근거 {sources.length}개</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="10" height="10" 
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-300 ${isSourcesOpen ? 'rotate-180' : ''}`}
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            {isSourcesOpen && (
              <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                {sources.map((source, idx) => (
                  <div key={idx} className="bg-white/95 border border-gray-200/50 rounded-xl p-2.5 shadow-sm max-w-[280px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-extrabold text-green-900 truncate flex-1">{source.doc_name}</span>
                      <span className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded ml-2 font-black italic">p.{source.page_number}</span>
                    </div>
                    <p className="text-gray-600 text-[10px] leading-relaxed line-clamp-2 italic">
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
          <div className="mt-3 ml-1 text-[9px] text-gray-400 leading-tight max-w-[250px] italic">
            {safety_notice}
          </div>
        )}
      </div>
    </div>
  );
}

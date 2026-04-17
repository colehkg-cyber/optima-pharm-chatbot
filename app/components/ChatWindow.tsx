'use client';

import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  safety_notice?: string;
  id: string;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '안녕하세요! 강남 루카831 옵티마 정약국의 정해성 약사입니다. 😊\n\n약사님이 공부하신 전문 자료를 기반으로 건강기능식품과 복약에 대해 상담해 드립니다. 무엇이든 물어보세요!',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: userQuery };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errorData.error || '상담 중 오류가 발생했습니다.');
      }

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        safety_notice: data.safety_notice
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ 에러: ${error.message}\n\n서버 로그를 확인해 주세요.`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#abc1d1] shadow-2xl relative">
      {/* 카카오톡 스타일 헤더 */}
      <div className="bg-[#abc1d1] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button className="text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 className="font-bold text-gray-800 tracking-tight">정해성 약사</h1>
        </div>
        <div className="flex gap-4">
          <button className="text-gray-700"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></button>
          <button className="text-gray-700"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg></button>
        </div>
      </div>

      {/* 날짜 표시 */}
      <div className="flex justify-center my-4">
        <div className="bg-black/10 rounded-full px-3 py-1 text-[10px] text-white">
          2026년 4월 18일 토요일
        </div>
      </div>

      {/* 대화창 영역 */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 pb-24 space-y-2 custom-scrollbar"
      >
        {messages.map((msg) => (
          <ChatMessage 
            key={msg.id}
            role={msg.role}
            content={msg.content}
            sources={msg.sources}
            safety_notice={msg.safety_notice}
          />
        ))}
        {isLoading && (
          <ChatMessage 
            role="assistant"
            content=""
            isLoading={true}
          />
        )}
      </div>

      {/* 입력창 영역 */}
      <div className="p-3 bg-white fixed bottom-0 w-full max-w-md">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button type="button" className="text-gray-400 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </button>
          <div className="flex-1 bg-gray-100 rounded-2xl flex items-center px-3 py-2 border border-gray-200">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="메시지를 입력하세요"
              className="w-full bg-transparent text-sm focus:outline-none text-gray-800"
            />
            <button type="button" className="text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
            </button>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-lg font-bold transition-all ${
              !input.trim() || isLoading 
                ? 'text-gray-300' 
                : 'text-[#3c3c3e]'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={input.trim() ? "fill-[#fee500] stroke-none" : ""}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

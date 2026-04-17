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
      content: '안녕하세요! 강남 루카831 옵티마 정약국의 정해성 약사입니다. 😊\n\n약사님이 공부하신 전문 자료를 기반으로 건강기능식품과 복약에 대해 상담해 드립니다. 궁금하신 점을 말씀해 주세요!',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 스크롤 자동 내림
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

      if (!response.ok) throw new Error('상담 중 오류가 발생했습니다.');

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
        content: `죄송합니다. ${error.message}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[85vh] w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      {/* 헤더 */}
      <div className="bg-green-700 text-white p-4 flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-2xl mr-2">💊</span>
          <div>
            <h1 className="font-bold text-lg">옵티마 정약국 AI 상담실</h1>
            <p className="text-[10px] opacity-80 text-green-100">약사님의 전문 지식을 기반으로 답변합니다</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-green-100">Online</span>
        </div>
      </div>

      {/* 대화창 영역 */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50"
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
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="예: 당뇨약이랑 홍삼 같이 먹어도 되나요?"
            className="w-full p-4 pr-16 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`absolute right-2 p-2 px-4 rounded-lg font-bold transition-all ${
              !input.trim() || isLoading 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
            }`}
          >
            {isLoading ? '...' : '전송'}
          </button>
        </form>
        <p className="text-[10px] text-gray-400 text-center mt-3">
          정약국 AI는 약사님의 28권 강의자료를 바탕으로 답변하며, 최종 상담은 대면 상담을 권장합니다.
        </p>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  safety_notice?: string;
  id: string;
  isLoading?: boolean;
}

type ChatMode = 'general' | 'recommend';

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '안녕하세요! 강남 루카831 옵티마 정약국의 정해성 약사입니다. 😊\n\n약사님이 공부하신 전문 자료를 기반으로 1:1 상담을 도와드립니다. 무엇이든 편하게 물어보세요!',
    }
  ]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<ChatMode>('general');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 스크롤 자동 내림
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 텍스트 영역 높이 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userQuery = input.trim();
    if (!userQuery) return;

    // 1. 사용자 메시지 추가 및 입력창 초기화
    const userMessageId = Date.now().toString();
    const assistantMessageId = (Date.now() + 1).toString();
    
    const userMessage: Message = { id: userMessageId, role: 'user', content: userQuery };
    const loadingMessage: Message = { id: assistantMessageId, role: 'assistant', content: '', isLoading: true };
    
    // 현재까지의 대화 기록 (API 전송용)
    const historySnapshot = messages
      .filter(m => !m.isLoading)
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput('');

    // 2. 비동기로 API 호출 (기다리지 않음)
    processMessage(userQuery, historySnapshot, assistantMessageId);
  };

  const processMessage = async (query: string, history: any[], targetId: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          history,
          mode
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '서버 오류가 발생했습니다.' }));
        throw new Error(errorData.error);
      }

      const data = await response.json();
      
      // 3. 해당 대기 메시지 업데이트
      setMessages(prev => prev.map(msg => 
        msg.id === targetId 
          ? { 
              ...msg, 
              content: data.answer, 
              sources: data.sources, 
              safety_notice: data.safety_notice, 
              isLoading: false 
            } 
          : msg
      ));
    } catch (error: any) {
      setMessages(prev => prev.map(msg => 
        msg.id === targetId 
          ? { 
              ...msg, 
              content: `⚠️ 에러: ${error.message}`, 
              isLoading: false 
            } 
          : msg
      ));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter는 전송, Shift + Enter는 줄바꿈
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#abc1d1] shadow-2xl relative">
      {/* 헤더 */}
      <div className="bg-[#abc1d1] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button className="text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="font-bold text-gray-800 tracking-tight text-[15px]">정해성 약사</h1>
            <span className="text-[9px] text-gray-500 font-medium bg-white/40 px-1.5 rounded uppercase tracking-wider">
              {mode === 'recommend' ? '영양제 추천 모드' : '일반 상담 모드'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMode(mode === 'general' ? 'recommend' : 'general')}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all border ${
              mode === 'recommend' 
                ? 'bg-green-600 text-white border-green-700' 
                : 'bg-white/60 text-gray-600 border-gray-300'
            }`}
          >
            {mode === 'recommend' ? '💊 추천중' : '💬 상담중'}
          </button>
          <button className="text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* 대화창 영역 */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 pt-4 pb-24 space-y-2 custom-scrollbar"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-black/10 rounded-full px-3 py-1 text-[10px] text-white">
            2026년 4월 18일 토요일
          </div>
        </div>
        
        {messages.map((msg) => (
          <ChatMessage 
            key={msg.id}
            role={msg.role}
            content={msg.content}
            sources={msg.sources}
            safety_notice={msg.safety_notice}
            isLoading={msg.isLoading}
          />
        ))}
      </div>

      {/* 입력창 영역 */}
      <div className="p-3 bg-white fixed bottom-0 w-full max-w-md border-t border-gray-100">
        <div className="flex items-end gap-2">
          <button type="button" className="text-gray-400 p-1 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </button>
          <div className="flex-1 bg-gray-100 rounded-xl flex flex-col px-3 py-1.5 border border-gray-100 min-h-[40px]">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요 (Shift+Enter 줄바꿈)"
              className="w-full bg-transparent text-[14px] focus:outline-none text-gray-800 py-1 resize-none max-h-[120px]"
            />
          </div>
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim()}
            className={`p-1.5 mb-1 transition-all ${
              !input.trim() 
                ? 'text-gray-300' 
                : 'text-[#3c3c3e]'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={input.trim() ? "fill-[#fee500] stroke-none" : ""}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.05);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

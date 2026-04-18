'use client';

import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  related_questions?: string[];
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
      content: '옵티마 정약국 정해성 약사입니다. 😊\n\n어떤 게 불편해서 오셨나요? 어떤 건강 관련 고민이나 불편함이 있으신가요?',
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

  const handleSubmit = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const userQuery = customQuery || input.trim();
    if (!userQuery) return;

    // 1. 사용자 메시지 추가 및 입력창 초기화
    const userMessageId = Date.now().toString();
    const assistantMessageId = (Date.now() + 1).toString();
    
    const userMessage: Message = { id: userMessageId, role: 'user', content: userQuery };
    const loadingMessage: Message = { id: assistantMessageId, role: 'assistant', content: '', isLoading: true };
    
    const historySnapshot = messages
      .filter(m => !m.isLoading)
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    if (!customQuery) setInput('');

    // 2. 비동기로 API 호출
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
      
      setMessages(prev => prev.map(msg => 
        msg.id === targetId 
          ? { 
              ...msg, 
              content: data.answer, 
              sources: data.sources, 
              related_questions: data.related_questions,
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
    // 사용자가 'shiftab' (Shift+Tab)을 언급했으므로 그것도 줄바꿈으로 처리
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      const target = e.currentTarget as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      setInput(value.substring(0, start) + "\n" + value.substring(end));
      // 커서 위치 조절은 리액트 상태 업데이트 후 다음 틱에서 필요할 수 있음
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#abc1d1] shadow-2xl relative font-sans">
      {/* 헤더 */}
      <div className="bg-[#abc1d1] px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button className="text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="font-bold text-gray-900 tracking-tight text-[16px]">정해성 약사</h1>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-gray-600 font-medium">상담 가능</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setMode(mode === 'general' ? 'recommend' : 'general')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black transition-all border-2 ${
              mode === 'recommend' 
                ? 'bg-green-600 text-white border-green-700 shadow-inner' 
                : 'bg-white/80 text-gray-700 border-gray-300'
            }`}
          >
            {mode === 'recommend' ? '💊 추천 모드' : '💬 상담 모드'}
          </button>
          <button className="text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* 대화창 영역 */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pt-2 pb-24 space-y-2 custom-scrollbar"
      >
        <div className="flex justify-center mb-6 mt-2">
          <div className="bg-black/10 rounded-full px-4 py-1.5 text-[10.5px] text-white font-medium">
            2026년 4월 18일 토요일
          </div>
        </div>
        
        {messages.map((msg) => (
          <ChatMessage 
            key={msg.id}
            role={msg.role}
            content={msg.content}
            sources={msg.sources}
            related_questions={msg.related_questions}
            safety_notice={msg.safety_notice}
            isLoading={msg.isLoading}
            onQuestionClick={(q) => handleSubmit(undefined, q)}
          />
        ))}
      </div>

      {/* 입력창 영역 */}
      <div className="p-3 bg-white fixed bottom-0 w-full max-w-md border-t border-gray-100 z-10">
        <div className="flex items-end gap-2">
          <button type="button" className="text-gray-400 p-1.5 mb-0.5 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
          </button>
          <div className="flex-1 bg-gray-100 rounded-2xl flex flex-col px-3 py-2 border border-gray-100 min-h-[42px] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#fee500]/50 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요"
              className="w-full bg-transparent text-[16px] focus:outline-none text-gray-800 py-0.5 resize-none max-h-[120px] leading-tight"
            />
          </div>
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim()}
            className={`p-2 mb-0.5 transition-all rounded-xl ${
              !input.trim() 
                ? 'text-gray-300' 
                : 'bg-[#fee500] text-[#3c3c3e] shadow-sm active:scale-95'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={input.trim() ? "stroke-[#3c3c3e]" : "stroke-gray-300"}><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></svg>
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
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-in {
          animation: slideIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

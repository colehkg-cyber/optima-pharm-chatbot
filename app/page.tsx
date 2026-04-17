import ChatWindow from './components/ChatWindow';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-6 px-4 md:py-12">
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <div className="inline-block p-3 bg-white rounded-full shadow-md mb-4">
          <span className="text-4xl">💊</span>
        </div>
        <h2 className="text-3xl font-black text-gray-800 mb-2">정해성 약사의 AI 상담실</h2>
        <p className="text-gray-500 max-w-lg mx-auto">
          옵티마 정약국의 20년 노하우와 5,500페이지 분량의 전문 지식을 학습한 AI 약사가 여러분의 건강 궁금증을 해결해 드립니다.
        </p>
      </div>

      <ChatWindow />

      <footer className="mt-12 text-center text-gray-400 text-sm">
        <p>© 2026 옵티마 정약국 x colehkg-cyber. All rights reserved.</p>
        <div className="mt-2 flex justify-center space-x-4">
          <span className="hover:text-green-600 transition-colors">이용약관</span>
          <span className="hover:text-green-600 transition-colors">개인정보처리방침</span>
        </div>
      </footer>
    </main>
  );
}

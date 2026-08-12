import {
  FormEvent,
  memo,
  RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { StarRating, UserAvatar } from '../../common';
import { chatService } from '../../../services/api/chat.service';
import { Course } from '../../../types/course.types';
import { formatPrice } from '../../../utils/format';
import { renderMessageContent } from './chatbotMarkdown';
import { useChatbotDrag } from './useChatbotDrag';
import { routeTo } from '../../../routes/paths';
import './ChatbotWidget.css';

type ChatMessage = {
  id: number;
  role: 'assistant' | 'user';
  content: string;
  courses?: Course[];
};

const INITIAL_MESSAGE: ChatMessage = {
  id: 1,
  role: 'assistant',
  content: 'Xin chào! Mình có thể hỗ trợ bạn tìm hiểu và lựa chọn khóa học trên LearnHub.',
};

const CHATBOT_NAME = 'Trợ lý learnhub';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
  endRef: RefObject<HTMLDivElement | null>;
}

const ChatMessageList = memo(({ messages, isTyping, endRef }: ChatMessageListProps) => (
  <div className="chatbot-messages" role="log" aria-live="polite">
    {messages.map((message) => (
      <div key={message.id} className={`chatbot-message chatbot-message--${message.role}`}>
        <div className="chatbot-message-body">
          {message.content && <p>{renderMessageContent(message.content)}</p>}
          {message.role === 'assistant' && message.courses && message.courses.length > 0 && (
            <div className="chatbot-course-grid" aria-label="Khóa học được đề xuất">
              {message.courses.map((course) => (
                <Link
                  key={course.id}
                  to={routeTo.courseDetail(course.slug)}
                  className="chatbot-course-card"
                  aria-label={`Xem khóa học ${course.title}`}
                >
                  <div className="chatbot-course-thumbnail">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt="" loading="lazy" />
                    ) : (
                      <span aria-hidden="true"><i className="bi bi-journal-code" /></span>
                    )}
                  </div>
                  <div className="chatbot-course-info">
                    <strong>{course.title}</strong>
                    {course.reviewCount > 0 && (
                      <StarRating
                        value={course.averageRating}
                        size="sm"
                        showValue
                        count={course.reviewCount}
                      />
                    )}
                    <span className="chatbot-course-price">{formatPrice(course.price)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    ))}

    {isTyping && (
      <div className="chatbot-message chatbot-message--assistant chatbot-typing" aria-label="Đang trả lời">
        <p><span></span><span></span><span></span></p>
      </div>
    )}
    <div ref={endRef} />
  </div>
));

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const nextId = useRef(2);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    widgetRef,
    panelRef,
    isDragging,
    panelPlacement,
    widgetStyle,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerEnd: handlePointerEnd,
    consumeDragged,
  } = useChatbotDrag(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: isTyping ? 'auto' : 'smooth' });
  }, [isOpen, messages, isTyping]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || isTyping) return;

    const history = messages.slice(-8).map(({ role, content: messageContent }) => ({
      role,
      content: messageContent,
    }));

    setMessages((current) => [
      ...current,
      { id: nextId.current++, role: 'user', content },
    ]);
    setInput('');
    setIsTyping(true);

    const assistantId = nextId.current++;

    try {
      const response = await chatService.sendMessage(content, history);
      setMessages((current) => [
        ...current,
        {
          id: assistantId,
          role: 'assistant',
          content: response.reply,
          courses: response.courses,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: assistantId,
          role: 'assistant',
          content: 'Mình chưa thể kết nối đến máy chủ AI lúc này. Bạn thử lại sau nhé.',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleToggleClick = () => {
    if (consumeDragged()) return;
    setIsOpen((current) => !current);
  };

  return (
    <div
      ref={widgetRef}
      className={`chatbot-widget${isOpen ? ' is-open' : ''} is-panel-${panelPlacement}`}
      style={widgetStyle}
    >
      <section
        ref={panelRef}
        className={`chatbot-panel${isOpen ? ' is-visible' : ''}`}
        aria-label={CHATBOT_NAME}
        aria-hidden={!isOpen}
      >
          <header className="chatbot-header">
            <div className="chatbot-header-icon" aria-hidden="true">
              <UserAvatar avatar={null} fullName={CHATBOT_NAME} size="sm" />
            </div>
            <div className="chatbot-header-copy">
              <h2>{CHATBOT_NAME}</h2>
              <span><i className="bi bi-circle-fill"></i> Đang hoạt động</span>
            </div>
          </header>

          <ChatMessageList
            messages={messages}
            isTyping={isTyping}
            endRef={messagesEndRef}
          />

          <form className="chatbot-input-area" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Nhập tin nhắn..."
              aria-label={`Tin nhắn gửi cho ${CHATBOT_NAME}`}
              disabled={isTyping}
            />
            <button
              type="submit"
              className="chatbot-send"
              disabled={!input.trim() || isTyping}
              aria-label="Gửi tin nhắn"
              title="Gửi tin nhắn"
            >
              <i className="bi bi-send-fill"></i>
            </button>
          </form>
      </section>

      <button
        type="button"
        className={`chatbot-toggle${isDragging ? ' is-dragging' : ''}`}
        onClick={handleToggleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        aria-label={isOpen ? 'Đóng chatbot' : 'Mở chatbot'}
        aria-expanded={isOpen}
        title={isOpen ? 'Đóng chatbot' : 'Mở chatbot'}
      >
        <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-chat-dots-fill'}`}></i>
      </button>
    </div>
  );
};

export default ChatbotWidget;
